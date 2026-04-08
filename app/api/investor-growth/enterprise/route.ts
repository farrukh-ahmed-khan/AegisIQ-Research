import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignsByUser } from "@/lib/repositories/investorGrowthCampaignRepository";
import { getContactsByUser } from "@/lib/repositories/investorContactRepository";
import {
  getPendingApprovalSummaryByUser,
  getActiveApprovalByCampaignId,
} from "@/lib/repositories/investorCampaignApprovalRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAnalytics,
  getCampaignAdvancedDetails,
  getPortfolioAnalytics,
  refreshCampaignAnalytics,
} from "@/lib/investor-growth/advancedRepository";
import { buildAiStrategySummary } from "@/lib/investor-growth/strategyEngine";
import { toStableUuid } from "@/lib/stable-user-id";

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function GET() {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);

    const [campaigns, contacts, portfolio, approvalRows] = await Promise.all([
      getCampaignsByUser(stableUserId),
      getContactsByUser(stableUserId),
      getPortfolioAnalytics(stableUserId),
      getPendingApprovalSummaryByUser(stableUserId),
    ]);

    const approvalMap = new Map(approvalRows.map((row) => [row.campaign_id, row]));

    const campaignDetails = await Promise.all(
      campaigns.map(async (campaign) => {
        const [advanced, analytics, activeApproval] = await Promise.all([
          getCampaignAdvancedDetails(campaign.id),
          getCampaignAnalytics(campaign.id) ??
            refreshCampaignAnalytics(campaign.id, stableUserId),
          getActiveApprovalByCampaignId(campaign.id),
        ]);

        const resolvedAnalytics =
          analytics instanceof Promise ? await analytics : analytics;

        const metrics = asRecord(resolvedAnalytics?.metrics_json);
        const approvalProgress = approvalMap.get(campaign.id);
        const slaOverdue =
          activeApproval?.sla_due_at
            ? new Date(activeApproval.sla_due_at).getTime() < Date.now()
            : false;

        const strategy = buildAiStrategySummary({
          campaign,
          analytics: resolvedAnalytics,
          advanced,
          channelExecutions: [],
        });

        return {
          campaign_id: campaign.id,
          company_name: campaign.company_name ?? "",
          ticker: campaign.ticker ?? "",
          status: campaign.status,
          compliance_state: advanced?.compliance_state ?? "clear",
          content_locked: !!advanced?.content_locked_at,
          post_approval_edit_invalidated:
            advanced?.post_approval_edit_invalidated ?? false,
          engagement_score: asNumber(metrics.engagement_score),
          sent: asNumber(metrics.sent),
          best_channel: String(
            asRecord(resolvedAnalytics?.top_content_json).best_channel ?? "email",
          ),
          approval_step: approvalProgress?.current_step ?? null,
          total_approval_steps: approvalProgress?.total_steps ?? 0,
          sla_overdue: slaOverdue,
          strategy_summary: String(strategy.summary ?? ""),
          risk_flags: Array.isArray(strategy.campaign_risk_flags)
            ? (strategy.campaign_risk_flags as string[])
            : [],
        };
      }),
    );

    const portfolioMetrics = asRecord(portfolio?.totals);
    const totalEngagement = asNumber(portfolioMetrics.engagement_score);
    const avgEngagement =
      campaigns.length > 0
        ? Math.round(totalEngagement / campaigns.length)
        : 0;

    const topCampaigns = [...campaignDetails]
      .sort((a, b) => b.engagement_score - a.engagement_score)
      .slice(0, 5);

    const channelFreq = campaignDetails.reduce<Record<string, number>>(
      (acc, item) => {
        const ch = item.best_channel || "email";
        acc[ch] = (acc[ch] ?? 0) + 1;
        return acc;
      },
      {},
    );
    const bestPlatformChannel =
      Object.entries(channelFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "email";

    const totalRiskFlags = campaignDetails.reduce(
      (sum, item) => sum + item.risk_flags.length,
      0,
    );
    const overdueCount = campaignDetails.filter((item) => item.sla_overdue).length;
    const onHoldCount = campaignDetails.filter(
      (item) => item.compliance_state === "hold",
    ).length;
    const lockedCount = campaignDetails.filter((item) => item.content_locked).length;
    const invalidatedCount = campaignDetails.filter(
      (item) => item.post_approval_edit_invalidated,
    ).length;

    const contactTotal = contacts.length;
    const contactByStage = contacts.reduce<Record<string, number>>((acc, contact) => {
      const stage = contact.relationship_stage ?? "prospect";
      acc[stage] = (acc[stage] ?? 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      ir_analytics_workspace: {
        total_campaigns: campaigns.length,
        avg_engagement_score: avgEngagement,
        total_sent: asNumber(portfolioMetrics.sent),
        total_opens: asNumber(portfolioMetrics.opens),
        total_clicks: asNumber(portfolioMetrics.clicks),
        total_replies: asNumber(portfolioMetrics.replies),
        best_platform_channel: bestPlatformChannel,
        top_campaigns: topCampaigns,
      },
      governance_summary: {
        campaigns_on_hold: onHoldCount,
        content_locked: lockedCount,
        post_approval_invalidated: invalidatedCount,
        sla_overdue: overdueCount,
        total_risk_flags: totalRiskFlags,
        approval_status: {
          pending: approvalRows.filter((row) => row.status === "pending").length,
          approved: approvalRows.filter((row) => row.status === "approved").length,
        },
      },
      crm_intelligence: {
        total_contacts: contactTotal,
        contacts_by_stage: contactByStage,
        scoring_endpoint: "/api/investor-growth/contacts/scoring",
        targeting_endpoint: "/api/investor-growth/contacts/targeting",
      },
      deal_room: {
        description:
          "Attach approved campaign assets to issuer-facing deal room workflows and roadshow packages.",
        eligible_campaigns: campaignDetails
          .filter((item) => item.content_locked && item.status !== "draft")
          .map((item) => ({
            campaign_id: item.campaign_id,
            company_name: item.company_name,
            ticker: item.ticker,
            status: item.status,
          })),
        instructions: [
          "Select a content-locked campaign to attach assets.",
          "Export approved content via the board report export endpoint.",
          "Reference the campaign objective and audience focus in deal room materials.",
        ],
      },
      enterprise_controls: {
        role_aware_approvals: true,
        channel_level_publishing_controls: true,
        content_lock_after_approval: true,
        multi_step_approval_chains: true,
        compliance_hold_states: true,
        audit_export: true,
      },
      export_urls: {
        board_report_json: "/api/investor-growth/reports/board",
        board_report_csv: "/api/investor-growth/reports/board?format=csv",
        approvals_csv: "/api/investor-growth/approvals/export",
      },
      premium_modules: {
        board_reporting: { status: "active", url: "/investor-growth/reports" },
        audit_governance: { status: "active", url: "/investor-growth/approvals" },
        investor_crm: { status: "active", url: "/investor-growth/contacts" },
        ai_strategy_engine: { status: "active", url: "/investor-growth/strategy" },
        multi_channel_execution: {
          status: "active",
          url: "/investor-growth/channels",
        },
        analytics_attribution: {
          status: "active",
          url: "/investor-growth/analytics",
        },
      },
      campaigns: campaignDetails,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load enterprise workspace.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
