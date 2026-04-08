import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignsByUser } from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAnalytics,
  getCampaignAdvancedDetails,
  listChannelExecutionsByCampaign,
  refreshCampaignAnalytics,
} from "@/lib/investor-growth/advancedRepository";
import { buildAiStrategySummary } from "@/lib/investor-growth/strategyEngine";
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

    const strategySummaries = await Promise.all(
      campaigns.map(async (campaign) => {
        const [advanced, analytics, channelExecutions] = await Promise.all([
          getCampaignAdvancedDetails(campaign.id),
          getCampaignAnalytics(campaign.id) ??
            refreshCampaignAnalytics(campaign.id, stableUserId),
          listChannelExecutionsByCampaign(campaign.id),
        ]);

        const strategy = buildAiStrategySummary({
          campaign,
          analytics,
          advanced,
          channelExecutions,
        });

        return {
          campaign_id: campaign.id,
          company_name: campaign.company_name ?? "",
          ticker: campaign.ticker ?? "",
          status: campaign.status,
          compliance_state: advanced?.compliance_state ?? "clear",
          strategy,
        };
      }),
    );

    const totalRiskFlags = strategySummaries.reduce((count, item) => {
      const flags = item.strategy.campaign_risk_flags;
      return count + (Array.isArray(flags) ? flags.length : 0);
    }, 0);

    return NextResponse.json({
      summary: {
        campaigns: strategySummaries.length,
        total_risk_flags: totalRiskFlags,
        campaigns_on_hold: strategySummaries.filter(
          (item) => item.compliance_state === "hold",
        ).length,
      },
      strategies: strategySummaries,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load AI strategy summaries.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
