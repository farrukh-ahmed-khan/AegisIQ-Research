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

    const channelDashboard = await Promise.all(
      campaigns.map(async (campaign) => {
        const [executions, advanced, analytics] = await Promise.all([
          listChannelExecutionsByCampaign(campaign.id),
          getCampaignAdvancedDetails(campaign.id),
          getCampaignAnalytics(campaign.id) ??
            refreshCampaignAnalytics(campaign.id, stableUserId),
        ]);

        return {
          campaign_id: campaign.id,
          company_name: campaign.company_name ?? "",
          ticker: campaign.ticker ?? "",
          objective: campaign.campaign_objective ?? "",
          status: campaign.status,
          compliance_state: advanced?.compliance_state ?? "clear",
          channel_mix: advanced?.channel_mix_json ?? {},
          approval_rules: advanced?.approval_rules_json ?? {},
          executions,
          analytics,
        };
      }),
    );

    return NextResponse.json({
      summary: {
        campaigns: channelDashboard.length,
        active_channels: channelDashboard.reduce((count, item) => {
          return count + item.executions.length;
        }, 0),
        scheduled_posts: channelDashboard.reduce((count, item) => {
          return (
            count +
            item.executions.filter(
              (execution) => execution.delivery_status === "scheduled",
            ).length
          );
        }, 0),
      },
      campaigns: channelDashboard,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load channel execution dashboard.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
