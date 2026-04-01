import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  countCampaignsByUser,
  getCampaignsByUserPaginated,
} from "@/lib/repositories/investorCampaignRepository";
import { toStableUuid } from "@/lib/stable-user-id";

const PER_PAGE = 10;

type CampaignHistoryItem = {
  id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const url = new URL(request.url);
    const pageValue = Number(url.searchParams.get("page") ?? "1");
    const page =
      Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
    const offset = (page - 1) * PER_PAGE;

    const [campaigns, total] = await Promise.all([
      getCampaignsByUserPaginated(stableUserId, PER_PAGE, offset),
      countCampaignsByUser(stableUserId),
    ]);

    const items: CampaignHistoryItem[] = campaigns.map((campaign) => ({
      id: campaign.id,
      ticker: campaign.ticker ?? "",
      company_name: campaign.company_name ?? "",
      campaign_objective: campaign.campaign_objective ?? "",
      created_at: campaign.created_at,
    }));

    return NextResponse.json({
      campaigns: items,
      pagination: {
        page,
        per_page: PER_PAGE,
        total,
        total_pages: Math.max(1, Math.ceil(total / PER_PAGE)),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch campaigns.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
