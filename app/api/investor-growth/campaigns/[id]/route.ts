import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCampaignById,
  updateCampaign,
} from "@/lib/repositories/investorGrowthCampaignRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAdvancedDetails,
  getCampaignAnalytics,
  listChannelExecutionsByCampaign,
  refreshCampaignAnalytics,
  updateCampaignAdvancedFields,
} from "@/lib/investor-growth/advancedRepository";
import { getApprovalsByCampaignId } from "@/lib/repositories/investorCampaignApprovalRepository";
import { buildAiStrategySummary } from "@/lib/investor-growth/strategyEngine";
import { sql } from "@/lib/db";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PatchBody = {
  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  social_post?: string;
  notes?: string;
  segment_id?: string | null;
  channel_mix_json?: Record<string, unknown>;
  posting_calendar_json?: Record<string, unknown>;
  social_posts_json?: Record<string, unknown>;
  approval_rules_json?: Record<string, unknown>;
  ai_strategy_json?: Record<string, unknown>;
  compliance_state?: string;
  compliance_hold_reason?: string | null;
};

function readContentValue(
  payload: Record<string, unknown> | undefined,
  key: string,
): string {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

function mapCampaignResponse(campaign: {
  id: string;
  ticker?: string;
  company_name?: string;
  campaign_objective?: string;
  status: string;
  email_delivery_status: string;
  email_sent_at?: string | null;
  email_provider_message_id?: string | null;
  email_last_error?: string | null;
  audience_focus?: string;
  tone?: string;
  notes?: string;
  strategy_payload_json?: Record<string, unknown>;
  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  social_post?: string;
  segment_id?: string | null;
  channel_mix_json?: Record<string, unknown>;
  posting_calendar_json?: Record<string, unknown>;
  social_posts_json?: Record<string, unknown>;
  approval_rules_json?: Record<string, unknown>;
  ai_strategy_json?: Record<string, unknown>;
  compliance_state?: string;
  compliance_hold_reason?: string | null;
  content_locked_at?: string | null;
  post_approval_edit_invalidated?: boolean;
  created_at: string;
}) {
  const strategy = readContentValue(campaign.strategy_payload_json, "strategy");

  return {
    id: campaign.id,
    ticker: campaign.ticker ?? "",
    company_name: campaign.company_name ?? "",
    campaign_objective: campaign.campaign_objective ?? "",
    status: campaign.status,
    approval_status:
      campaign.status === "approved" || campaign.status === "sent"
        ? "approved"
        : campaign.status,
    email_delivery_status: campaign.email_delivery_status,
    email_sent_at: campaign.email_sent_at ?? null,
    provider_message_id: campaign.email_provider_message_id ?? null,
    last_error: campaign.email_last_error ?? null,
    audience_focus: campaign.audience_focus ?? "",
    tone: campaign.tone ?? "",
    notes: campaign.notes ?? "",
    strategy: strategy || "",
    email_subject: campaign.email_subject ?? "",
    email_draft: campaign.email_body ?? "",
    sms_draft: campaign.sms_body ?? "",
    social_post: campaign.social_post ?? "",
    segment_id: campaign.segment_id ?? null,
    channel_mix: campaign.channel_mix_json ?? {},
    posting_calendar: campaign.posting_calendar_json ?? {},
    social_posts: campaign.social_posts_json ?? {},
    approval_rules: campaign.approval_rules_json ?? {},
    ai_strategy: campaign.ai_strategy_json ?? {},
    compliance_state: campaign.compliance_state ?? "clear",
    compliance_hold_reason: campaign.compliance_hold_reason ?? null,
    content_locked_at: campaign.content_locked_at ?? null,
    post_approval_edit_invalidated:
      campaign.post_approval_edit_invalidated === true,
    created_at: campaign.created_at,
  };
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const campaign = await getCampaignById(id);

    if (!campaign || campaign.user_id !== toStableUuid(userId)) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    const [advanced, channelExecutions, approvalChain] = await Promise.all([
      getCampaignAdvancedDetails(campaign.id),
      listChannelExecutionsByCampaign(campaign.id),
      getApprovalsByCampaignId(campaign.id),
    ]);
    const analytics =
      (await getCampaignAnalytics(campaign.id)) ??
      (await refreshCampaignAnalytics(campaign.id, campaign.user_id));

    const aiStrategy =
      advanced?.ai_strategy_json && Object.keys(advanced.ai_strategy_json).length > 0
        ? advanced.ai_strategy_json
        : buildAiStrategySummary({
            campaign: {
              ...campaign,
              ...advanced,
            },
            analytics,
            advanced,
            channelExecutions,
          });

    return NextResponse.json({
      ...mapCampaignResponse({
        ...campaign,
        ...advanced,
        ai_strategy_json: aiStrategy,
      }),
      channel_executions: channelExecutions,
      approval_chain: approvalChain,
      analytics,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch campaign details.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await getCampaignById(id);

    if (!existing || existing.user_id !== toStableUuid(userId)) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as PatchBody;
    const stableUserId = toStableUuid(userId);
    const emailChanged =
      typeof body.email_body === "string" &&
      body.email_body.trim() !== (existing.email_body ?? "");
    const smsChanged =
      typeof body.sms_body === "string" &&
      body.sms_body.trim() !== (existing.sms_body ?? "");
    const socialChanged =
      typeof body.social_post === "string" &&
      body.social_post.trim() !== (existing.social_post ?? "");
    const subjectChanged =
      typeof body.email_subject === "string" &&
      body.email_subject.trim() !== (existing.email_subject ?? "");
    const contentChanged =
      emailChanged || smsChanged || socialChanged || subjectChanged;

    const updated = await updateCampaign(id, {
      email_subject: body.email_subject?.trim(),
      email_body: body.email_body?.trim(),
      sms_body: body.sms_body?.trim(),
      social_post: body.social_post?.trim(),
      notes: body.notes?.trim(),
      segment_id: body.segment_id,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    if (contentChanged && (existing.status === "approved" || existing.status === "sent")) {
      await sql`
        UPDATE investor_growth_campaigns
        SET
          status = 'draft',
          content_locked_at = NULL,
          post_approval_edit_invalidated = TRUE,
          compliance_state = 'review_required',
          updated_at = now()
        WHERE id = ${id}::uuid
      `;

      await createAuditLog({
        user_id: stableUserId,
        campaign_id: id,
        action: "campaign_post_approval_edit_invalidated",
        metadata_json: {
          campaign_id: id,
          previous_status: existing.status,
        },
      });
    }

    const refreshedAdvanced = await getCampaignAdvancedDetails(id);
    const refreshedAnalytics =
      (await getCampaignAnalytics(id)) ?? (await refreshCampaignAnalytics(id, stableUserId));
    const refreshedExecutions = await listChannelExecutionsByCampaign(id);
    const mergedCampaign = {
      ...existing,
      ...updated,
      ...refreshedAdvanced,
    };

    await updateCampaignAdvancedFields(id, {
      channel_mix_json: body.channel_mix_json,
      posting_calendar_json: body.posting_calendar_json,
      social_posts_json: body.social_posts_json,
      approval_rules_json: body.approval_rules_json,
      ai_strategy_json:
        body.ai_strategy_json ??
        buildAiStrategySummary({
          campaign: mergedCampaign,
          analytics: refreshedAnalytics,
          advanced: {
            ...refreshedAdvanced,
            channel_mix_json:
              body.channel_mix_json ?? refreshedAdvanced?.channel_mix_json ?? {},
            approval_rules_json:
              body.approval_rules_json ?? refreshedAdvanced?.approval_rules_json ?? {},
            compliance_state:
              body.compliance_state ?? refreshedAdvanced?.compliance_state ?? "clear",
          },
          channelExecutions: refreshedExecutions,
        }),
      compliance_state: body.compliance_state,
      compliance_hold_reason: body.compliance_hold_reason,
    });

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      campaign_id: id,
      action: "campaign_updated",
      metadata_json: {
        campaign_id: id,
        segment_id: body.segment_id,
      },
    });

    if ((body.segment_id ?? null) !== (existing.segment_id ?? null)) {
      await createAuditLog({
        user_id: stableUserId,
        campaign_id: id,
        action: body.segment_id ? "campaign_segment_assigned" : "campaign_segment_cleared",
        metadata_json: {
          campaign_id: id,
          previous_segment_id: existing.segment_id ?? null,
          segment_id: body.segment_id ?? null,
        },
      });
    }

    const latest = await getCampaignById(id);
    const [advanced, channelExecutions, approvalChain] = await Promise.all([
      getCampaignAdvancedDetails(id),
      listChannelExecutionsByCampaign(id),
      getApprovalsByCampaignId(id),
    ]);
    const analytics = await refreshCampaignAnalytics(id, stableUserId);

    return NextResponse.json({
      ...mapCampaignResponse({
        ...latest!,
        ...advanced,
      }),
      channel_executions: channelExecutions,
      approval_chain: approvalChain,
      analytics,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update campaign.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
