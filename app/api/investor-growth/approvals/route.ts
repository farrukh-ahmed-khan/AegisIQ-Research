import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCampaignsByUser } from "@/lib/repositories/investorGrowthCampaignRepository";
import {
  getActiveApprovalByCampaignId,
  getApprovalsByCampaignId,
  getPendingApprovalSummaryByUser,
} from "@/lib/repositories/investorCampaignApprovalRepository";
import { toStableUuid } from "@/lib/stable-user-id";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const campaigns = await getCampaignsByUser(toStableUuid(userId));

    const summaryByCampaign = await getPendingApprovalSummaryByUser(toStableUuid(userId));
    const summaryMap = new Map(
      summaryByCampaign.map((item) => [item.campaign_id, item]),
    );

    const campaignsWithApproval = await Promise.all(
      campaigns.map(async (campaign) => {
        const [approval, approvalChain] = await Promise.all([
          getActiveApprovalByCampaignId(campaign.id),
          getApprovalsByCampaignId(campaign.id),
        ]);
        const chainSummary = summaryMap.get(campaign.id);

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
                step_number: approval.step_number ?? null,
                channel: approval.channel ?? null,
                approver_role: approval.approver_role ?? null,
                rule_name: approval.rule_name ?? null,
                sla_due_at: approval.sla_due_at ?? null,
                submitted_at: approval.submitted_at ?? null,
                decided_at: approval.decided_at ?? null,
                decision_notes: approval.decision_notes ?? null,
              }
            : null,
          approval_chain: approvalChain,
          approval_progress: {
            current_step: chainSummary?.current_step ?? null,
            total_steps: chainSummary?.total_steps ?? approvalChain.length,
            next_sla_due_at: chainSummary?.next_sla_due_at ?? null,
          },
        };
      }),
    );

    return NextResponse.json({
      summary: {
        pending: campaignsWithApproval.filter(
          (campaign) => campaign.status === "pending_approval",
        ).length,
        overdue: campaignsWithApproval.filter((campaign) => {
          const dueAt = campaign.approval_progress.next_sla_due_at;
          return (
            campaign.status === "pending_approval" &&
            typeof dueAt === "string" &&
            new Date(dueAt).getTime() < Date.now()
          );
        }).length,
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
      export_urls: {
        json: "/api/investor-growth/approvals/export",
        csv: "/api/investor-growth/approvals/export?format=csv",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load approvals.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
