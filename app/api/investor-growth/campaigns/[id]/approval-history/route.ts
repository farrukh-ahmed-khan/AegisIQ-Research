import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignById } from "@/lib/repositories/investorGrowthCampaignRepository";
import { getAuditLogByCampaignId } from "@/lib/repositories/investorGrowthAuditRepository";
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
]);

function labelForAction(action: string): string {
  switch (action) {
    case "campaign_submitted":
      return "Submitted for approval";
    case "campaign_approved":
      return "Approved";
    case "campaign_rejected":
      return "Rejected";
    default:
      return action;
  }
}

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

    const history = (await getAuditLogByCampaignId(id))
      .filter((entry) => APPROVAL_ACTIONS.has(entry.action))
      .map((entry) => ({
        id: entry.id,
        action: entry.action,
        label: labelForAction(entry.action),
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
      }));

    return NextResponse.json({ history });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load approval history.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
