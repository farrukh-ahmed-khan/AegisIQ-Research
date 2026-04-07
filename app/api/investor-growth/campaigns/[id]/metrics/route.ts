import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  listChannelExecutionsByCampaign,
  refreshCampaignAnalytics,
  upsertChannelExecution,
} from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type MetricsBody = {
  channel?: string;
  platform?: string | null;
  opens?: number;
  clicks?: number;
  replies?: number;
};

function normalizeMetric(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.round(parsed);
}

function defaultPlatformForChannel(channel: string): string | null {
  switch (channel) {
    case "email":
      return "resend";
    case "sms":
      return "manual";
    case "social":
      return "linkedin";
    default:
      return null;
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
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

    const body = (await request.json().catch(() => ({}))) as MetricsBody;
    const channel = body.channel?.trim().toLowerCase() ?? "";

    if (!["email", "sms", "social"].includes(channel)) {
      return NextResponse.json(
        { error: "channel must be one of email, sms, or social." },
        { status: 400 },
      );
    }

    const existingExecutions = await listChannelExecutionsByCampaign(id);
    const matchedExecution = existingExecutions.find((execution) => {
      if (execution.channel !== channel) {
        return false;
      }

      if (body.platform && execution.platform) {
        return execution.platform === body.platform;
      }

      return true;
    });

    const opens = normalizeMetric(body.opens);
    const clicks = normalizeMetric(body.clicks);
    const replies = normalizeMetric(body.replies);

    const execution = await upsertChannelExecution({
      campaign_id: id,
      user_id: stableUserId,
      channel,
      platform:
        body.platform?.trim() ||
        matchedExecution?.platform ||
        defaultPlatformForChannel(channel),
      template_name: matchedExecution?.template_name ?? `${channel}_tracking`,
      draft_content: matchedExecution?.draft_content ?? null,
      scheduled_for: matchedExecution?.scheduled_for ?? null,
      approval_rule_name: matchedExecution?.approval_rule_name ?? `${channel}_default`,
      approval_status: matchedExecution?.approval_status ?? "approved",
      delivery_status: matchedExecution?.delivery_status ?? "sent",
      provider_message_id: matchedExecution?.provider_message_id ?? null,
      metrics_json: {
        opens,
        clicks,
        replies,
      },
      metadata_json: {
        ...(matchedExecution?.metadata_json ?? {}),
        metrics_updated_at: new Date().toISOString(),
      },
    });

    const analytics = await refreshCampaignAnalytics(id, stableUserId);

    await createAuditLog({
      user_id: stableUserId,
      campaign_id: id,
      action: "campaign_metrics_recorded",
      metadata_json: {
        campaign_id: id,
        channel,
        platform: execution.platform,
        opens,
        clicks,
        replies,
      },
    });

    return NextResponse.json({
      success: true,
      execution,
      analytics,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record campaign metrics.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
