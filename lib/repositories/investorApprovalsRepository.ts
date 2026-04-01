import { sql } from "../db";
import type { InvestorCampaignApproval } from "../../types/investor-growth";

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function mapApproval(row: Record<string, unknown>): InvestorCampaignApproval {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    user_id: String(row.user_id),
    status: String(
      row.status ?? "pending",
    ) as InvestorCampaignApproval["status"],
    submitted_at: asNullableString(row.submitted_at) ?? undefined,
    decided_at: asNullableString(row.decided_at) ?? undefined,
    decision_notes: asNullableString(row.decision_notes) ?? undefined,
    created_at: String(row.created_at),
  };
}

export async function submitApproval(
  campaignId: string,
  userId: string,
): Promise<InvestorCampaignApproval> {
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_campaign_approvals (
      id,
      campaign_id,
      user_id,
      status,
      submitted_at,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${campaignId}::uuid,
      ${userId}::uuid,
      'pending',
      now(),
      now()
    )
    RETURNING *
  `;

  return mapApproval(rows[0]);
}

export async function approveCampaign(
  campaignId: string,
  userId: string,
  decisionNotes?: string,
): Promise<InvestorCampaignApproval | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_campaign_approvals
    SET
      status = 'approved',
      decided_at = now(),
      decision_notes = ${decisionNotes ?? null}
    WHERE campaign_id = ${campaignId}::uuid
      AND user_id = ${userId}::uuid
    RETURNING *
  `;

  if (!rows[0]) return null;
  return mapApproval(rows[0]);
}

export async function rejectCampaign(
  campaignId: string,
  userId: string,
  decisionNotes?: string,
): Promise<InvestorCampaignApproval | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_campaign_approvals
    SET
      status = 'rejected',
      decided_at = now(),
      decision_notes = ${decisionNotes ?? null}
    WHERE campaign_id = ${campaignId}::uuid
      AND user_id = ${userId}::uuid
    RETURNING *
  `;

  if (!rows[0]) return null;
  return mapApproval(rows[0]);
}

export async function getApprovalByCampaign(
  campaignId: string,
): Promise<InvestorCampaignApproval | null> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_campaign_approvals
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!rows[0]) return null;
  return mapApproval(rows[0]);
}
