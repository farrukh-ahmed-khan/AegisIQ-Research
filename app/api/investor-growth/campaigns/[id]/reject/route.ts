import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  getApprovalByCampaignId,
  updateApproval,
} from "@/lib/repositories/investorCampaignApprovalRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const body = await request.json();
    const { id } = await context.params;

    // Get campaign
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if campaign is pending approval
    if (campaign.status !== "pending_approval") {
      return NextResponse.json(
        { error: "Only campaigns pending approval can be rejected" },
        { status: 400 },
      );
    }

    // Get approval record
    const approval = await getApprovalByCampaignId(id);
    if (!approval) {
      return NextResponse.json(
        { error: "Approval record not found" },
        { status: 404 },
      );
    }

    // Update approval status
    await updateApproval(approval.id, {
      status: "rejected",
      decision_notes: body.decision_notes,
    });

    // Update campaign status
    const { sql } = await import("@/lib/db");
    await sql`
      UPDATE investor_growth_campaigns
      SET status = 'rejected', updated_at = now()
      WHERE id = ${id}
    `;

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      campaign_id: id,
      action: "campaign_rejected",
      metadata_json: {
        campaign_id: id,
        rejector_id: stableUserId,
        decision_notes: body.decision_notes,
      },
    });

    return NextResponse.json({ success: true, status: "rejected" });
  } catch (error) {
    console.error("POST /campaigns/[id]/reject error:", error);
    return NextResponse.json(
      { error: "Failed to reject campaign" },
      { status: 500 },
    );
  }
}
