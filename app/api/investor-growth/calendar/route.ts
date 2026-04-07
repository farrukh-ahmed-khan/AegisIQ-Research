import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
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
    const items = await listCalendarExecutionsByUser(stableUserId);

    const detailed = await Promise.all(
      items.map(async (item) => {
        const campaign = await getCampaignById(item.campaign_id);

        return {
          id: item.id,
          campaign_id: item.campaign_id,
          company_name: campaign?.company_name ?? "",
          ticker: campaign?.ticker ?? "",
          channel: item.channel,
          platform: item.platform,
          scheduled_for: item.scheduled_for,
          delivery_status: item.delivery_status,
          approval_status: item.approval_status,
          template_name: item.template_name,
        };
      }),
    );

    return NextResponse.json({
      items: detailed,
      counts: {
        scheduled: detailed.filter((item) => item.delivery_status === "scheduled")
          .length,
        pending_approval: detailed.filter(
          (item) => item.approval_status === "pending",
        ).length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load calendar.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
