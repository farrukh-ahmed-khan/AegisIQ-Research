import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Resend } from "resend";
import {
  getCampaignById,
  updateCampaignEmailDelivery,
} from "@/lib/repositories/investorGrowthCampaignRepository";
import { createDeliveryEvent } from "@/lib/repositories/investorDeliveryRepository";
import { getSegmentMemberContacts } from "@/lib/repositories/investorSegmentRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SendEmailBody = {
  recipient_email?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const stableUserId = toStableUuid(userId);
  const { id } = await context.params;
  const campaign = await getCampaignById(id);

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
  const recipientEmail = body.recipient_email?.trim() ?? "";

  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    return NextResponse.json(
      { error: "Valid recipient_email is required." },
      { status: 400 },
    );
  }

  const subject = campaign.email_subject?.trim() ?? "";
  const htmlBody = campaign.email_body?.trim() ?? "";

  if (!subject || !htmlBody) {
    return NextResponse.json(
      {
        error:
          "Campaign email_subject and email_body are required before sending.",
      },
      { status: 400 },
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is missing." },
      { status: 500 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "AegisIQ <onboarding@resend.dev>";

  await updateCampaignEmailDelivery(campaign.id, "sending");

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      subject,
      html: htmlBody,
    });

    if (result.error) {
      throw new Error(result.error.message || "Failed to send email.");
    }

    await createDeliveryEvent({
      campaign_id: campaign.id,
      user_id: stableUserId,
      channel: "email",
      recipient_payload_json: { to: recipientEmail },
      content_payload_json: {
        subject,
        body: htmlBody,
      },
      delivery_status: "sent",
      provider_message_id: result.data?.id ?? undefined,
      provider_response_json: result,
    });

    const updatedCampaign = await updateCampaignEmailDelivery(
      campaign.id,
      "sent",
    );

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      campaign_id: campaign.id,
      action: "campaign_email_sent",
      metadata_json: {
        campaign_id: campaign.id,
        recipient_email: recipientEmail,
        segment_id: campaign.segment_id,
        provider_message_id: result.data?.id,
      },
    });

    return NextResponse.json({
      success: true,
      provider_message_id: result.data?.id ?? null,
      email_delivery_status: updatedCampaign?.email_delivery_status ?? "sent",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email.";

    await createDeliveryEvent({
      campaign_id: campaign.id,
      user_id: stableUserId,
      channel: "email",
      recipient_payload_json: { to: recipientEmail },
      content_payload_json: {
        subject,
        body: htmlBody,
      },
      delivery_status: "failed",
      provider_response_json: { error: message },
      error_message: message,
    });

    await updateCampaignEmailDelivery(campaign.id, "failed");

    // Audit log (failure)
    await createAuditLog({
      user_id: stableUserId,
      campaign_id: campaign.id,
      action: "campaign_email_failed",
      metadata_json: {
        campaign_id: campaign.id,
        recipient_email: recipientEmail,
        segment_id: campaign.segment_id,
        error: message,
      },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
