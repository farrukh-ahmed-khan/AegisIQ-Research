import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCampaignById,
  updateCampaign as updateCampaignRepo,
} from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  createApprovalChain,
  invalidatePendingApprovalsByCampaignId,
} from "@/lib/repositories/investorCampaignApprovalRepository";
import { createAuditLog } from "@/lib/repositories/investorGrowthAuditRepository";
import {
  ensureInvestorGrowthAdvancedSchema,
  getCampaignAdvancedDetails,
  updateCampaignAdvancedFields,
} from "@/lib/investor-growth/advancedRepository";
import { buildApprovalChain } from "@/lib/investor-growth/approvalWorkflow";
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

    const advanced = await getCampaignAdvancedDetails(id);

    if (advanced?.compliance_state === "hold") {
      return NextResponse.json(
        { error: "Campaign is on compliance hold and cannot be submitted." },
        { status: 400 },
      );
    }

    // Touch campaign so updated_at reflects the submission action.
    await updateCampaignRepo(id, {});

    const approvalRules =
      advanced?.approval_rules_json && Object.keys(advanced.approval_rules_json).length > 0
        ? advanced.approval_rules_json
        : {
            email: { required_role: "marketing_lead", steps: 1, sla_hours: 24 },
            sms: { required_role: "compliance", steps: 2, sla_hours: 12 },
            social: { required_role: "communications", steps: 1, sla_hours: 24 },
          };

    const approvalChain = buildApprovalChain(
      approvalRules,
      advanced?.channel_mix_json ?? campaign.channel_mix_json ?? {},
    );

    await invalidatePendingApprovalsByCampaignId(id);
    await createApprovalChain(
      approvalChain.map((step) => ({
        campaign_id: id,
        user_id: stableUserId,
        step_number: step.step_number,
        channel: step.channel,
        approver_role: step.approver_role,
        rule_name: step.rule_name,
        sla_due_at: step.sla_due_at,
      })),
    );

    // Update campaign status to pending_approval
    const { sql } = await import("@/lib/db");
    await sql`
      UPDATE investor_growth_campaigns
      SET
        status = 'pending_approval',
        post_approval_edit_invalidated = FALSE,
        compliance_state = 'in_review',
        updated_at = now()
      WHERE id = ${id}
    `;

    await updateCampaignAdvancedFields(id, {
      approval_rules_json: approvalRules,
    });

    // Audit log
    await createAuditLog({
      user_id: stableUserId,
      campaign_id: id,
      action: "campaign_submitted",
      metadata_json: {
        campaign_id: id,
        previous_status: campaign.status,
        approval_chain: approvalChain,
      },
    });

    return NextResponse.json({
      success: true,
      status: "pending_approval",
      approval_chain: approvalChain,
    });
  } catch (error) {
    console.error("POST /campaigns/[id]/submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit campaign" },
      { status: 500 },
    );
  }
}
