import { sql } from "../db";
import type { InvestorCampaignApproval } from "../../types/investor-growth";

type CreateApprovalInput = {
  campaign_id: string;
  user_id: string;
};

type UpdateApprovalInput = {
  status: "pending" | "approved" | "rejected";
  decision_notes?: string;
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function mapApproval(row: Record<string, unknown>): InvestorCampaignApproval {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    user_id: String(row.user_id),
    status: String(row.status) as "pending" | "approved" | "rejected",
    step_number:
      row.step_number === null || row.step_number === undefined
        ? undefined
        : Number(row.step_number),
    channel: asNullableString(row.channel),
    approver_role: asNullableString(row.approver_role),
    rule_name: asNullableString(row.rule_name),
    sla_due_at: asNullableString(row.sla_due_at),
    invalidated_at: asNullableString(row.invalidated_at),
    submitted_at: asNullableString(row.submitted_at),
    decided_at: asNullableString(row.decided_at),
    decision_notes: asNullableString(row.decision_notes),
    created_at: String(row.created_at),
  };
}

export async function createApproval(
  input: CreateApprovalInput,
): Promise<string> {
  const approvalId = crypto.randomUUID();

  await sql`
    INSERT INTO investor_campaign_approvals (
      id, campaign_id, user_id,
      status, submitted_at,
      created_at
    ) VALUES (
      ${approvalId}, ${input.campaign_id}, ${input.user_id},
      'pending', now(),
      now()
    )
  `;

  return approvalId;
}

export async function getApprovalByCampaignId(
  campaignId: string,
): Promise<InvestorCampaignApproval | null> {
  const result = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_campaign_approvals
    WHERE campaign_id = ${campaignId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return result.length > 0 ? mapApproval(result[0]) : null;
}

export async function updateApproval(
  id: string,
  input: UpdateApprovalInput,
): Promise<void> {
  if (input.status === "pending") {
    await sql`
      UPDATE investor_campaign_approvals
      SET
        status = 'pending',
        decision_notes = NULL,
        submitted_at = now(),
        decided_at = NULL
      WHERE id = ${id}
    `;
    return;
  }

  await sql`
    UPDATE investor_campaign_approvals
    SET
      status = ${input.status},
      decision_notes = ${input.decision_notes ?? null},
      decided_at = now()
    WHERE id = ${id}
  `;
}

export async function getApprovalsByUser(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<InvestorCampaignApproval[]> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_campaign_approvals
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return results.map(mapApproval);
}

export async function getApprovalsByCampaignId(
  campaignId: string,
): Promise<InvestorCampaignApproval[]> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_campaign_approvals
    WHERE campaign_id = ${campaignId}
    ORDER BY created_at DESC
  `;

  return results.map(mapApproval);
}
