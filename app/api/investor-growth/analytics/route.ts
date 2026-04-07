import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignsByUser } from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAnalytics,
  getPortfolioAnalytics,
  refreshCampaignAnalytics,
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

    const campaignAnalytics = await Promise.all(
      campaigns.map(async (campaign) => ({
        campaign_id: campaign.id,
        company_name: campaign.company_name ?? "",
        ticker: campaign.ticker ?? "",
        analytics:
          (await getCampaignAnalytics(campaign.id)) ??
          (await refreshCampaignAnalytics(campaign.id, stableUserId)),
      })),
    );

    const portfolio = await getPortfolioAnalytics(stableUserId);

    return NextResponse.json({
      portfolio,
      campaign_analytics: campaignAnalytics,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load analytics.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
