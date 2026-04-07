import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import { createDeliveryEvent } from "@/lib/repositories/investorDeliveryRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAdvancedDetails,
  listChannelExecutionsByCampaign,
  refreshCampaignAnalytics,
  updateCampaignAdvancedFields,
  upsertChannelExecution,
} from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type Body = {
  campaign_id?: string;
  platform?: string;
  draft_content?: string;
  template_name?: string;
  scheduled_for?: string;
  publish_now?: boolean;
};

export async function GET(request: NextRequest) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const campaignId = request.nextUrl.searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json({ drafts: [] });
    }

    const drafts = await listChannelExecutionsByCampaign(campaignId);

    return NextResponse.json({
      drafts: drafts.filter((item) => item.channel === "social"),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load social drafts.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
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

    const platform = body.platform?.trim() || "linkedin";
    const draftContent = body.draft_content?.trim() ?? campaign.social_post?.trim() ?? "";

    if (!draftContent) {
      return NextResponse.json({ error: "draft_content is required." }, { status: 400 });
    }

    const scheduledFor = body.scheduled_for?.trim() || null;
    const publishNow = body.publish_now === true;

    const execution = await upsertChannelExecution({
      campaign_id: campaignId,
      user_id: stableUserId,
      channel: "social",
      platform,
      template_name: body.template_name?.trim() || `${platform}_default`,
      draft_content: draftContent,
      scheduled_for: scheduledFor,
      approval_rule_name:
        typeof advanced?.approval_rules_json?.social === "object"
          ? "social_default"
          : "social_default",
      approval_status: campaign.status === "approved" ? "approved" : "draft",
      delivery_status: publishNow ? "sent" : scheduledFor ? "scheduled" : "draft",
      metadata_json: {
        platform,
        publish_now: publishNow,
      },
    });

    await updateCampaignAdvancedFields(campaignId, {
      social_posts_json: {
        ...(advanced?.social_posts_json ?? {}),
        [platform]: {
          draft: draftContent,
          template_name: body.template_name?.trim() || `${platform}_default`,
          scheduled_for: scheduledFor,
        },
      },
      posting_calendar_json: {
        ...(advanced?.posting_calendar_json ?? {}),
        [platform]: scheduledFor,
      },
    });

    if (publishNow) {
      await createDeliveryEvent({
        campaign_id: campaignId,
        user_id: stableUserId,
        channel: "social",
        recipient_payload_json: {
          audience: "public",
          platform,
        },
        content_payload_json: {
          body: draftContent,
        },
        delivery_status: "sent",
        provider_response_json: {
          provider: platform,
          opens: 0,
          clicks: 0,
          replies: 0,
        },
      });
    }

    await createAuditLog({
      user_id: stableUserId,
      campaign_id: campaignId,
      action: publishNow ? "campaign_social_published" : "campaign_social_saved",
      metadata_json: {
        campaign_id: campaignId,
        platform,
        scheduled_for: scheduledFor,
      },
    });

    await refreshCampaignAnalytics(campaignId, stableUserId);

    return NextResponse.json({ success: true, execution });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save social draft.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
