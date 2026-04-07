import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import { getAuditLogByCampaignId } from "@/lib/repositories/investorGrowthAuditRepository";
import { getApprovalsByCampaignId } from "@/lib/repositories/investorCampaignApprovalRepository";
import {
  buildApprovalStepLabel,
  labelApprovalAction,
} from "@/lib/investor-growth/approvalWorkflow";
import { toStableUuid } from "@/lib/stable-user-id";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const APPROVAL_ACTIONS = new Set([
  "campaign_submitted",
  "campaign_approved",
  "campaign_rejected",
  "approval_step_approved",
]);

export async function GET(_: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const stableUserId = toStableUuid(userId);
    const { id } = await context.params;
    const campaign = await getCampaignById(id);

    if (!campaign || campaign.user_id !== stableUserId) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 },
      );
    }

    const [auditHistory, approvalSteps] = await Promise.all([
      getAuditLogByCampaignId(id),
      getApprovalsByCampaignId(id),
    ]);

    const history = auditHistory
      .filter((entry) => APPROVAL_ACTIONS.has(entry.action))
      .map((entry) => ({
        id: entry.id,
        action: entry.action,
        label: labelApprovalAction(entry.action),
        note:
          typeof entry.metadata_json?.decision_notes === "string"
            ? entry.metadata_json.decision_notes
            : null,
        acted_by:
          typeof entry.metadata_json?.approver_id === "string"
            ? entry.metadata_json.approver_id
            : typeof entry.metadata_json?.rejector_id === "string"
              ? entry.metadata_json.rejector_id
              : entry.user_id,
        created_at: entry.created_at,
      }))
      .concat(
        approvalSteps.map((approval) => ({
          id: `step-${approval.id}`,
          action: approval.invalidated_at ? "approval_step_invalidated" : `approval_step_${approval.status}`,
          label: buildApprovalStepLabel(approval),
          note: approval.decision_notes ?? null,
          acted_by: approval.user_id,
          created_at:
            approval.decided_at ?? approval.invalidated_at ?? approval.submitted_at ?? approval.created_at,
        })),
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

    return NextResponse.json({ history });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load approval history.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
