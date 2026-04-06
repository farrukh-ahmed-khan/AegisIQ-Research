import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignsByUser } from "@/lib/repositories/investorGrowthCampaignRepository";
import { getApprovalByCampaignId } from "@/lib/repositories/investorCampaignApprovalRepository";
import { toStableUuid } from "@/lib/stable-user-id";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const campaigns = await getCampaignsByUser(toStableUuid(userId));

    const campaignsWithApproval = await Promise.all(
      campaigns.map(async (campaign) => {
        const approval = await getApprovalByCampaignId(campaign.id);

        return {
          id: campaign.id,
          ticker: campaign.ticker ?? "",
          company_name: campaign.company_name ?? "",
          campaign_objective: campaign.campaign_objective ?? "",
          status: campaign.status,
          segment_id: campaign.segment_id ?? null,
          created_at: campaign.created_at,
          approval: approval
            ? {
                id: approval.id,
                status: approval.status,
                submitted_at: approval.submitted_at ?? null,
                decided_at: approval.decided_at ?? null,
                decision_notes: approval.decision_notes ?? null,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      summary: {
        pending: campaignsWithApproval.filter(
          (campaign) => campaign.status === "pending_approval",
        ).length,
        ready_to_submit: campaignsWithApproval.filter(
          (campaign) =>
            campaign.status === "draft" || campaign.status === "rejected",
        ).length,
        approved: campaignsWithApproval.filter(
          (campaign) => campaign.status === "approved",
        ).length,
      },
      campaigns: campaignsWithApproval,
      pending_campaigns: campaignsWithApproval.filter(
        (campaign) => campaign.status === "pending_approval",
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load approvals.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

