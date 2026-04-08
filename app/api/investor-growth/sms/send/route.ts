import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import { createDeliveryEvent } from "@/lib/repositories/investorDeliveryRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import {
  hasInvestorGrowthSmsConfig,
  sendInvestorGrowthSms,
} from "@/lib/investor-growth/smsService";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAdvancedDetails,
  refreshCampaignAnalytics,
  upsertChannelExecution,
} from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type Body = {
  campaign_id?: string;
  recipient_name?: string;
  recipient_phone?: string;
  body?: string;
  scheduled_for?: string;
};

function isValidPhone(value: string) {
  return /^[+\d][\d\s()-]{6,20}$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const body = (await request.json().catch(() => ({}))) as Body;
    const campaignId = body.campaign_id?.trim() ?? "";

    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id is required." }, { status: 400 });
    }

    const campaign = await getCampaignById(campaignId);
    const advanced = await getCampaignAdvancedDetails(campaignId);

    if (!campaign || campaign.user_id !== stableUserId) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    if (campaign.status !== "approved") {
      return NextResponse.json(
        { error: "SMS execution requires an approved campaign." },
        { status: 400 },
      );
    }

    if (
      advanced?.post_approval_edit_invalidated ||
      advanced?.compliance_state === "hold" ||
      advanced?.compliance_state === "review_required"
    ) {
      return NextResponse.json(
        { error: "Campaign requires renewed compliance review before SMS send." },
        { status: 400 },
      );
    }

    const recipientPhone = body.recipient_phone?.trim() ?? "";
    const smsBody = body.body?.trim() ?? campaign.sms_body?.trim() ?? "";

    if (!recipientPhone || !isValidPhone(recipientPhone)) {
      return NextResponse.json(
        { error: "Valid recipient_phone is required." },
        { status: 400 },
      );
    }

    if (!smsBody) {
      return NextResponse.json(
        { error: "SMS draft content is required before send." },
        { status: 400 },
      );
    }

    const scheduledFor = body.scheduled_for?.trim() || null;
    const platform = hasInvestorGrowthSmsConfig() ? "twilio" : "manual";
    const deliveryStatus = scheduledFor ? "scheduled" : "sent";
    let providerMessageId: string | null = null;
    let providerResponse: Record<string, unknown> = {
      provider: platform,
      opens: 0,
      clicks: 0,
      replies: 0,
    };

    if (!scheduledFor && platform === "twilio") {
      const result = await sendInvestorGrowthSms({
        to: recipientPhone,
        body: smsBody,
      });

      providerMessageId = result.messageId;
      providerResponse = {
        provider: result.provider,
        response: result.rawResponse,
      };
    }

    const execution = await upsertChannelExecution({
      campaign_id: campaignId,
      user_id: stableUserId,
      channel: "sms",
      platform,
      template_name: "investor_sms",
      draft_content: smsBody,
      scheduled_for: scheduledFor,
      approval_rule_name: "sms_default",
      approval_status: "approved",
      delivery_status: deliveryStatus,
      provider_message_id: providerMessageId,
      metrics_json: { opens: 0, clicks: 0, replies: 0 },
      metadata_json: {
        recipient_phone: recipientPhone,
        recipient_name: body.recipient_name?.trim() ?? null,
        delivery_mode:
          scheduledFor || platform === "manual" ? "logged_only" : "live_send",
      },
    });

    if (!scheduledFor) {
      await createDeliveryEvent({
        campaign_id: campaignId,
        user_id: stableUserId,
        channel: "sms",
        recipient_payload_json: {
          phone: recipientPhone,
          name: body.recipient_name?.trim() ?? null,
        },
        content_payload_json: {
          body: smsBody,
        },
        delivery_status: "sent",
        provider_message_id: providerMessageId ?? undefined,
        provider_response_json: providerResponse,
      });
    }

    await createAuditLog({
      user_id: stableUserId,
      campaign_id: campaignId,
      action: scheduledFor ? "campaign_sms_scheduled" : "campaign_sms_sent",
      metadata_json: {
        campaign_id: campaignId,
        recipient_phone: recipientPhone,
        scheduled_for: scheduledFor,
        provider: platform,
      },
    });

    await refreshCampaignAnalytics(campaignId, stableUserId);

    return NextResponse.json({
      success: true,
      execution,
      provider: platform,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to execute SMS workflow.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
