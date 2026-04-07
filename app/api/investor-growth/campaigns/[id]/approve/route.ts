import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  getActiveApprovalByCampaignId,
  getApprovalsByCampaignId,
  updateApproval,
} from "@/lib/repositories/investorCampaignApprovalRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAdvancedDetails,
  updateCampaignAdvancedFields,
} from "@/lib/investor-growth/advancedRepository";
import { buildApprovalStepLabel } from "@/lib/investor-growth/approvalWorkflow";
import { buildAiStrategySummary } from "@/lib/investor-growth/strategyEngine";
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
    await ensureInvestorGrowthAdvancedSchema();
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
        { error: "Only campaigns pending approval can be approved" },
        { status: 400 },
      );
    }

    // Get active approval step
    const approval = await getActiveApprovalByCampaignId(id);
    if (!approval) {
      return NextResponse.json(
        { error: "No active approval step found" },
        { status: 404 },
      );
    }

    // Update approval status for the current step
    await updateApproval(approval.id, {
      status: "approved",
      decision_notes: body.decision_notes,
    });

    const approvals = await getApprovalsByCampaignId(id);
    const remaining = approvals.filter(
      (item) => item.decided_at == null && item.invalidated_at == null,
    );
    const advanced = await getCampaignAdvancedDetails(id);

    if (remaining.length > 0) {
      await createAuditLog({
        user_id: stableUserId,
        campaign_id: id,
        action: "approval_step_approved",
        metadata_json: {
          campaign_id: id,
          approver_id: stableUserId,
          decision_notes: body.decision_notes,
          approval_step: buildApprovalStepLabel(approval),
          next_step_number: remaining[0]?.step_number ?? null,
          next_approver_role: remaining[0]?.approver_role ?? null,
        },
      });

      return NextResponse.json({
        success: true,
        status: "pending_approval",
        step_approved: approval.step_number ?? 1,
        next_step: remaining[0] ?? null,
      });
    }

    // Update campaign status once every approval step is complete.
    const { sql } = await import("@/lib/db");
    await sql`
      UPDATE investor_growth_campaigns
      SET status = 'approved', updated_at = now()
      WHERE id = ${id}
    `;

    await updateCampaignAdvancedFields(id, {
      compliance_state: "approved",
      compliance_hold_reason: null,
      content_locked_at: new Date().toISOString(),
      post_approval_edit_invalidated: false,
      ai_strategy_json: buildAiStrategySummary({
        campaign,
        advanced,
      }),
    });

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      campaign_id: id,
      action: "campaign_approved",
      metadata_json: {
        campaign_id: id,
        approver_id: stableUserId,
        decision_notes: body.decision_notes,
        approval_step: buildApprovalStepLabel(approval),
      },
    });

    return NextResponse.json({ success: true, status: "approved" });
  } catch (error) {
    console.error("POST /campaigns/[id]/approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve campaign" },
      { status: 500 },
    );
  }
}
