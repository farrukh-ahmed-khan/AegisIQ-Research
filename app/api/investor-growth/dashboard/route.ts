import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignsByUser } from "@/lib/repositories/investorGrowthCampaignRepository";
import { toStableUuid } from "@/lib/stable-user-id";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const campaigns = await getCampaignsByUser(toStableUuid(userId));

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
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load investor growth dashboard.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
