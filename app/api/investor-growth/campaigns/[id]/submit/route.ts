import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCampaignById,
  updateCampaign as updateCampaignRepo,
} from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  getApprovalByCampaignId,
  createApproval,
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
    const { id } = await context.params;

    // Get campaign
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Check ownership
    if (campaign.user_id !== stableUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check current status
    if (campaign.status !== "draft" && campaign.status !== "rejected") {
      return NextResponse.json(
        {
          error:
            "Only draft or rejected campaigns can be submitted for approval",
        },
        { status: 400 },
      );
    }

    // Touch campaign so updated_at reflects the submission action.
    await updateCampaignRepo(id, {});

    // Create or update approval record
    const approval = await getApprovalByCampaignId(id);

    if (!approval) {
      await createApproval({
        campaign_id: id,
        user_id: stableUserId,
      });
    } else {
      await updateApproval(approval.id, {
        status: "pending",
      });
    }

    // Update campaign status to pending_approval
    const { sql } = await import("@/lib/db");
    await sql`
      UPDATE investor_growth_campaigns
      SET status = 'pending_approval', updated_at = now()
      WHERE id = ${id}
    `;

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      campaign_id: id,
      action: "campaign_submitted",
      metadata_json: {
        campaign_id: id,
        previous_status: campaign.status,
      },
    });

    return NextResponse.json({ success: true, status: "pending_approval" });
  } catch (error) {
    console.error("POST /campaigns/[id]/submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit campaign" },
      { status: 500 },
    );
  }
}
