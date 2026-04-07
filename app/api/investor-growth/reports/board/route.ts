import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignsByUser } from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  getActiveApprovalByCampaignId,
  getPendingApprovalSummaryByUser,
} from "@/lib/repositories/investorCampaignApprovalRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAnalytics,
  getPortfolioAnalytics,
  refreshCampaignAnalytics,
} from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: Request) {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const campaigns = await getCampaignsByUser(stableUserId);

    const [portfolio, approvalSummaryRows] = await Promise.all([
      getPortfolioAnalytics(stableUserId),
      getPendingApprovalSummaryByUser(stableUserId),
    ]);

    const summaryMap = new Map(
      approvalSummaryRows.map((row) => [row.campaign_id, row]),
    );

    const campaignRows = await Promise.all(
      campaigns.map(async (campaign) => {
        const [analytics, activeApproval] = await Promise.all([
          getCampaignAnalytics(campaign.id) ??
            refreshCampaignAnalytics(campaign.id, stableUserId),
          getActiveApprovalByCampaignId(campaign.id),
        ]);

        const resolved = await (analytics instanceof Promise
          ? analytics
          : Promise.resolve(analytics));

        const metrics =
          resolved?.metrics_json && typeof resolved.metrics_json === "object"
            ? (resolved.metrics_json as Record<string, unknown>)
            : {};
        const funnel =
          resolved?.funnel_json && typeof resolved.funnel_json === "object"
            ? (resolved.funnel_json as Record<string, unknown>)
            : {};
        const topContent =
          resolved?.top_content_json &&
          typeof resolved.top_content_json === "object"
            ? (resolved.top_content_json as Record<string, unknown>)
            : {};

        const approvalProgress = summaryMap.get(campaign.id);
        const slaOverdue =
          activeApproval?.sla_due_at
            ? new Date(activeApproval.sla_due_at).getTime() < Date.now()
            : false;

        return {
          campaign_id: campaign.id,
          ticker: campaign.ticker ?? "",
          company_name: campaign.company_name ?? "",
          campaign_objective: campaign.campaign_objective ?? "",
          status: campaign.status,
          email_delivery_status: campaign.email_delivery_status,
          created_at: campaign.created_at,
          // Delivery metrics
          sent: asNumber(metrics.sent),
          failed: asNumber(metrics.failed),
          opens: asNumber(metrics.opens),
          clicks: asNumber(metrics.clicks),
          replies: asNumber(metrics.replies),
          engagement_score: asNumber(metrics.engagement_score),
          approval_to_delivery_conversion: asNumber(
            metrics.approval_to_delivery_conversion,
          ),
          // Funnel
          funnel_approvals: asNumber(funnel.approvals),
          funnel_scheduled: asNumber(funnel.scheduled),
          funnel_delivered: asNumber(funnel.delivered),
          // Content
          best_channel: String(topContent.best_channel ?? "email"),
          total_variants: asNumber(topContent.total_variants),
          // Approval
          current_approval_step: approvalProgress?.current_step ?? null,
          total_approval_steps: approvalProgress?.total_steps ?? 0,
          sla_overdue: slaOverdue,
          approver_role: activeApproval?.approver_role ?? null,
          sla_due_at: activeApproval?.sla_due_at ?? null,
        };
      }),
    );

    // Portfolio-level summary
    const totalSent = campaignRows.reduce((sum, row) => sum + row.sent, 0);
    const totalFailed = campaignRows.reduce((sum, row) => sum + row.failed, 0);
    const totalOpens = campaignRows.reduce((sum, row) => sum + row.opens, 0);
    const totalClicks = campaignRows.reduce((sum, row) => sum + row.clicks, 0);
    const totalReplies = campaignRows.reduce(
      (sum, row) => sum + row.replies,
      0,
    );
    const avgEngagement =
      campaignRows.length > 0
        ? Math.round(
            campaignRows.reduce(
              (sum, row) => sum + row.engagement_score,
              0,
            ) / campaignRows.length,
          )
        : 0;
    const overdueCount = campaignRows.filter((row) => row.sla_overdue).length;
    const pendingCount = campaignRows.filter(
      (row) => row.status === "pending_approval",
    ).length;
    const approvedCount = campaignRows.filter(
      (row) => row.status === "approved" || row.status === "sent",
    ).length;

    const boardReport = {
      generated_at: new Date().toISOString(),
      portfolio_summary: {
        total_campaigns: campaigns.length,
        draft: campaignRows.filter((row) => row.status === "draft").length,
        pending_approval: pendingCount,
        approved: approvedCount,
        sent: campaignRows.filter((row) => row.status === "sent").length,
        failed_deliveries: totalFailed,
      },
      delivery_metrics: {
        total_sent: totalSent,
        total_failed: totalFailed,
        total_opens: totalOpens,
        total_clicks: totalClicks,
        total_replies: totalReplies,
        avg_engagement_score: avgEngagement,
        portfolio_totals: portfolio?.totals ?? null,
      },
      approval_sla_summary: {
        pending: pendingCount,
        overdue_sla: overdueCount,
        approved: approvedCount,
        top_content_panels: portfolio?.top_content_panels ?? [],
        trend_views: portfolio?.trend_views ?? [],
      },
      audience_engagement_overview: {
        avg_engagement_score: avgEngagement,
        top_performing_campaigns: [...campaignRows]
          .sort((a, b) => b.engagement_score - a.engagement_score)
          .slice(0, 5)
          .map((row) => ({
            campaign_id: row.campaign_id,
            company_name: row.company_name,
            ticker: row.ticker,
            engagement_score: row.engagement_score,
            best_channel: row.best_channel,
          })),
      },
      campaign_funnel_summary: campaignRows.map((row) => ({
        campaign_id: row.campaign_id,
        company_name: row.company_name,
        ticker: row.ticker,
        status: row.status,
        funnel_approvals: row.funnel_approvals,
        funnel_scheduled: row.funnel_scheduled,
        funnel_delivered: row.funnel_delivered,
        approval_to_delivery_conversion: row.approval_to_delivery_conversion,
        sla_overdue: row.sla_overdue,
      })),
      campaign_rows: campaignRows,
      export_urls: {
        json: "/api/investor-growth/reports/board",
        csv: "/api/investor-growth/reports/board?format=csv",
      },
    };

    const url = new URL(request.url);
    const format = url.searchParams.get("format") ?? "json";

    if (format === "csv") {
      const header = [
        "campaign_id",
        "ticker",
        "company_name",
        "status",
        "sent",
        "failed",
        "opens",
        "clicks",
        "replies",
        "engagement_score",
        "approval_to_delivery_conversion",
        "funnel_approvals",
        "funnel_scheduled",
        "funnel_delivered",
        "best_channel",
        "current_approval_step",
        "total_approval_steps",
        "sla_overdue",
        "approver_role",
        "sla_due_at",
        "created_at",
      ];

      const body = campaignRows
        .map((row) =>
          [
            row.campaign_id,
            row.ticker,
            row.company_name,
            row.status,
            row.sent,
            row.failed,
            row.opens,
            row.clicks,
            row.replies,
            row.engagement_score,
            row.approval_to_delivery_conversion,
            row.funnel_approvals,
            row.funnel_scheduled,
            row.funnel_delivered,
            row.best_channel,
            row.current_approval_step,
            row.total_approval_steps,
            row.sla_overdue,
            row.approver_role,
            row.sla_due_at,
            row.created_at,
          ]
            .map(escapeCsv)
            .join(","),
        )
        .join("\n");

      return new NextResponse([header.join(","), body].filter(Boolean).join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="investor-growth-board-report.csv"',
        },
      });
    }

    return NextResponse.json(boardReport);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate board report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
