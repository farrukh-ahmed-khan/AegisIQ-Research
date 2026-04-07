import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCampaignById,
  markCampaignEmailResult,
  updateCampaign,
  updateCampaignEmailDelivery,
} from "@/lib/repositories/investorGrowthCampaignRepository";
import { createDeliveryEvent } from "@/lib/repositories/investorDeliveryRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { sendInvestorGrowthEmail } from "@/lib/investor-growth/emailService";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAdvancedDetails,
  refreshCampaignAnalytics,
  upsertChannelExecution,
} from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SendEmailBody = {
  recipient_name?: string;
  recipient_email?: string;
  subject?: string;
  body?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureInvestorGrowthAdvancedSchema();
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const stableUserId = toStableUuid(userId);
  const { id } = await context.params;
  const campaign = await getCampaignById(id);
  const advanced = await getCampaignAdvancedDetails(id);

  if (!campaign || campaign.user_id !== stableUserId) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  if (campaign.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved campaigns can be sent." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as SendEmailBody;
  const recipientName = body.recipient_name?.trim() ?? "";
  const recipientEmail = body.recipient_email?.trim() ?? "";

  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    return NextResponse.json(
      { error: "Valid recipient_email is required." },
      { status: 400 },
    );
  }

  const subject = body.subject?.trim() ?? campaign.email_subject?.trim() ?? "";
  const htmlBody = body.body?.trim() ?? campaign.email_body?.trim() ?? "";

  if (!subject || !htmlBody) {
    return NextResponse.json(
      {
        error:
          "Campaign email_subject and email_body are required before sending.",
      },
      { status: 400 },
    );
  }

  if (
    advanced?.post_approval_edit_invalidated ||
    advanced?.compliance_state === "hold" ||
    advanced?.compliance_state === "review_required"
  ) {
    return NextResponse.json(
      { error: "Campaign content requires renewed review before send." },
      { status: 400 },
    );
  }

  await updateCampaign(campaign.id, {
    email_subject: subject,
    email_body: htmlBody,
  });

  await updateCampaignEmailDelivery(campaign.id, "sending");

  try {
    const result = await sendInvestorGrowthEmail({
      to: recipientEmail,
      subject,
      html: htmlBody,
    });

    await upsertChannelExecution({
      campaign_id: campaign.id,
      user_id: stableUserId,
      channel: "email",
      platform: "resend",
      template_name: "investor_email",
      draft_content: htmlBody,
      approval_rule_name: "email_default",
      approval_status: "approved",
      delivery_status: "sent",
      provider_message_id: result.messageId,
      metrics_json: { opens: 0, clicks: 0, replies: 0 },
      metadata_json: { subject, recipientEmail },
    });

    await createDeliveryEvent({
      campaign_id: campaign.id,
      user_id: stableUserId,
      channel: "email",
      recipient_payload_json: {
        email: recipientEmail,
        name: recipientName || null,
      },
      content_payload_json: {
        subject,
        body: htmlBody,
      },
      delivery_status: "sent",
      provider_message_id: result.messageId ?? undefined,
      provider_response_json: {
        provider: result.provider,
        response: result.rawResponse,
      },
    });

    const updatedCampaign = await markCampaignEmailResult(campaign.id, {
      delivery_status: "sent",
      status: "sent",
      provider_message_id: result.messageId,
    });

    await createAuditLog({
      user_id: stableUserId,
      campaign_id: campaign.id,
      action: "campaign_email_sent",
      metadata_json: {
        campaign_id: campaign.id,
        recipient_name: recipientName || null,
        recipient_email: recipientEmail,
        segment_id: campaign.segment_id,
        provider: result.provider,
        provider_message_id: result.messageId,
      },
    });

    await refreshCampaignAnalytics(campaign.id, stableUserId);

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      provider_message_id: result.messageId,
      email_delivery_status: updatedCampaign?.email_delivery_status ?? "sent",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email.";

    await createDeliveryEvent({
      campaign_id: campaign.id,
      user_id: stableUserId,
      channel: "email",
      recipient_payload_json: {
        email: recipientEmail,
        name: recipientName || null,
      },
      content_payload_json: {
        subject,
        body: htmlBody,
      },
      delivery_status: "failed",
      provider_response_json: {
        provider: "resend",
        error: errorMessage,
      },
      error_message: errorMessage,
    });

    await upsertChannelExecution({
      campaign_id: campaign.id,
      user_id: stableUserId,
      channel: "email",
      platform: "resend",
      template_name: "investor_email",
      draft_content: htmlBody,
      approval_rule_name: "email_default",
      approval_status: "approved",
      delivery_status: "failed",
      metrics_json: { opens: 0, clicks: 0, replies: 0 },
      metadata_json: { subject, recipientEmail, error: errorMessage },
    });

    const updatedCampaign = await markCampaignEmailResult(campaign.id, {
      delivery_status: "failed",
      error_message: errorMessage,
    });

    await createAuditLog({
      user_id: stableUserId,
      campaign_id: campaign.id,
      action: "campaign_email_failed",
      metadata_json: {
        campaign_id: campaign.id,
        recipient_name: recipientName || null,
        recipient_email: recipientEmail,
        segment_id: campaign.segment_id,
        provider: "resend",
        error: errorMessage,
      },
    });

    await refreshCampaignAnalytics(campaign.id, stableUserId);

    return NextResponse.json(
      {
        error: errorMessage,
        campaign: updatedCampaign,
      },
      { status: 500 },
    );
  }
}
