import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignsByUser } from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getPortfolioAnalytics,
  listCalendarExecutionsByUser,
} from "@/lib/investor-growth/advancedRepository";
import { toStableUuid } from "@/lib/stable-user-id";

export async function GET() {
  try {
    await ensureInvestorGrowthAdvancedSchema();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const campaigns = await getCampaignsByUser(stableUserId);
    const [portfolio, calendarItems] = await Promise.all([
      getPortfolioAnalytics(stableUserId),
      listCalendarExecutionsByUser(stableUserId),
    ]);

    const summary = {
      total_campaigns: campaigns.length,
      drafts: campaigns.filter((campaign) => campaign.status === "draft").length,
      pending_approvals: campaigns.filter(
        (campaign) => campaign.status === "pending_approval",
      ).length,
      approved: campaigns.filter((campaign) => campaign.status === "approved")
        .length,
      sent: campaigns.filter((campaign) => campaign.status === "sent").length,
      failed_deliveries: campaigns.filter(
        (campaign) => campaign.email_delivery_status === "failed",
      ).length,
      scheduled_channel_touches: calendarItems.length,
      engagement_score: portfolio.totals.engagement_score,
      opens: portfolio.totals.opens,
      clicks: portfolio.totals.clicks,
      replies: portfolio.totals.replies,
    };

    const recent_campaigns = campaigns.slice(0, 5).map((campaign) => ({
      id: campaign.id,
      ticker: campaign.ticker ?? "",
      company_name: campaign.company_name ?? "",
      campaign_objective: campaign.campaign_objective ?? "",
      status: campaign.status,
      email_delivery_status: campaign.email_delivery_status,
      created_at: campaign.created_at,
    }));

    return NextResponse.json({
      summary,
      recent_campaigns,
      top_content_panels: portfolio.top_content_panels,
      trend_views: portfolio.trend_views,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load investor growth dashboard.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
