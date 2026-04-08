import { sql } from "../db";
import type { InvestorCampaignApproval } from "../../types/investor-growth";

type CreateApprovalInput = {
  campaign_id: string;
  user_id: string;
  step_number?: number;
  channel?: string | null;
  approver_role?: string | null;
  rule_name?: string | null;
  sla_due_at?: string | null;
};

type UpdateApprovalInput = {
  status: "pending" | "approved" | "rejected";
  decision_notes?: string;
  invalidated_at?: string | null;
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
    sequence_index:
      row.sequence_index === null || row.sequence_index === undefined
        ? undefined
        : Number(row.sequence_index),
    is_active_step: row.is_active_step === true,
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
      status, step_number, channel, approver_role, rule_name, sla_due_at, submitted_at,
      created_at
    ) VALUES (
      ${approvalId}, ${input.campaign_id}, ${input.user_id},
      'pending', ${input.step_number ?? 1}, ${input.channel ?? null}, ${input.approver_role ?? null}, ${input.rule_name ?? null}, ${input.sla_due_at ?? null}::timestamp, now(),
      now()
    )
  `;

  return approvalId;
}

export async function createApprovalChain(
  items: CreateApprovalInput[],
): Promise<string[]> {
  const createdIds: string[] = [];

  for (const item of items) {
    createdIds.push(await createApproval(item));
  }

  return createdIds;
}

export async function getApprovalByCampaignId(
  campaignId: string,
): Promise<InvestorCampaignApproval | null> {
  const result = await sql<Record<string, unknown>[]>`
    SELECT *,
      ROW_NUMBER() OVER (
        ORDER BY step_number ASC, created_at ASC
      ) AS sequence_index,
      CASE
        WHEN decided_at IS NULL AND invalidated_at IS NULL
          AND id = (
            SELECT inner_approval.id
            FROM investor_campaign_approvals inner_approval
            WHERE inner_approval.campaign_id = ${campaignId}
              AND inner_approval.decided_at IS NULL
              AND inner_approval.invalidated_at IS NULL
            ORDER BY inner_approval.step_number ASC, inner_approval.created_at ASC
            LIMIT 1
          )
        THEN TRUE
        ELSE FALSE
      END AS is_active_step
    FROM investor_campaign_approvals
    WHERE campaign_id = ${campaignId}
      AND invalidated_at IS NULL
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
        decided_at = NULL,
        invalidated_at = ${input.invalidated_at ?? null}::timestamp
      WHERE id = ${id}
    `;
    return;
  }

  await sql`
    UPDATE investor_campaign_approvals
    SET
      status = ${input.status},
      decision_notes = ${input.decision_notes ?? null},
      decided_at = now(),
      invalidated_at = ${input.invalidated_at ?? null}::timestamp
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
    SELECT *,
      ROW_NUMBER() OVER (
        ORDER BY step_number ASC, created_at ASC
      ) AS sequence_index,
      CASE
        WHEN decided_at IS NULL AND invalidated_at IS NULL
          AND id = (
            SELECT inner_approval.id
            FROM investor_campaign_approvals inner_approval
            WHERE inner_approval.campaign_id = ${campaignId}
              AND inner_approval.decided_at IS NULL
              AND inner_approval.invalidated_at IS NULL
            ORDER BY inner_approval.step_number ASC, inner_approval.created_at ASC
            LIMIT 1
          )
        THEN TRUE
        ELSE FALSE
      END AS is_active_step
    FROM investor_campaign_approvals
    WHERE campaign_id = ${campaignId}
    ORDER BY step_number ASC, created_at ASC
  `;

  return results.map(mapApproval);
}

export async function getActiveApprovalByCampaignId(
  campaignId: string,
): Promise<InvestorCampaignApproval | null> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT *,
      1 AS sequence_index,
      TRUE AS is_active_step
    FROM investor_campaign_approvals
    WHERE campaign_id = ${campaignId}
      AND decided_at IS NULL
      AND invalidated_at IS NULL
    ORDER BY step_number ASC, created_at ASC
    LIMIT 1
  `;

  return results[0] ? mapApproval(results[0]) : null;
}

export async function invalidatePendingApprovalsByCampaignId(
  campaignId: string,
  timestamp = new Date().toISOString(),
): Promise<void> {
  await sql`
    UPDATE investor_campaign_approvals
    SET invalidated_at = ${timestamp}::timestamp
    WHERE campaign_id = ${campaignId}
      AND decided_at IS NULL
      AND invalidated_at IS NULL
  `;
}

export async function deleteApprovalsByCampaignId(
  campaignId: string,
): Promise<void> {
  await sql`
    DELETE FROM investor_campaign_approvals
    WHERE campaign_id = ${campaignId}
  `;
}

export async function getPendingApprovalSummaryByUser(userId: string) {
  const results = await sql<Record<string, unknown>[]>`
    SELECT
      campaign_id,
      MIN(step_number) FILTER (WHERE decided_at IS NULL AND invalidated_at IS NULL) AS current_step,
      COUNT(*) FILTER (WHERE invalidated_at IS NULL) AS total_steps,
      MIN(sla_due_at) FILTER (WHERE decided_at IS NULL AND invalidated_at IS NULL) AS next_sla_due_at
    FROM investor_campaign_approvals
    WHERE user_id = ${userId}
    GROUP BY campaign_id
  `;

  return results.map((row) => {
    const currentStep =
      row.current_step === null || row.current_step === undefined
        ? null
        : Number(row.current_step);
    return {
      campaign_id: String(row.campaign_id),
      current_step: currentStep,
      total_steps:
        row.total_steps === null || row.total_steps === undefined
          ? 0
          : Number(row.total_steps),
      next_sla_due_at: asNullableString(row.next_sla_due_at),
      status: currentStep !== null ? "pending" : "approved",
    };
  });
}

export async function getApprovalExportRowsByUser(userId: string) {
  const results = await sql<Record<string, unknown>[]>`
    SELECT
      approvals.*,
      campaigns.ticker,
      campaigns.company_name,
      campaigns.campaign_objective,
      campaigns.status AS campaign_status
    FROM investor_campaign_approvals approvals
    INNER JOIN investor_growth_campaigns campaigns
      ON campaigns.id = approvals.campaign_id
    WHERE approvals.user_id = ${userId}
    ORDER BY approvals.created_at DESC
  `;

  return results.map((row) => ({
    ...mapApproval(row),
    ticker: asNullableString(row.ticker),
    company_name: asNullableString(row.company_name),
    campaign_objective: asNullableString(row.campaign_objective),
    campaign_status: asNullableString(row.campaign_status),
  }));
}
