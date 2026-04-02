import { sql } from "../db";
import type { InvestorGrowthAuditLog } from "../../types/investor-growth";

type LogActionInput = {
  user_id: string;
  campaign_id?: string;
  action: string;
  metadata_json?: unknown;
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function mapAuditLog(row: Record<string, unknown>): InvestorGrowthAuditLog {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    campaign_id: asNullableString(row.campaign_id) ?? undefined,
    action: String(row.action ?? ""),
    metadata_json: asRecord(row.metadata_json),
    created_at: String(row.created_at),
  };
}

export async function logAction(
  input: LogActionInput,
): Promise<InvestorGrowthAuditLog> {
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_growth_audit_log (
      id,
      user_id,
      campaign_id,
      action,
      metadata_json,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${input.user_id}::uuid,
      ${input.campaign_id ?? null}::uuid,
      ${input.action},
      ${JSON.stringify(input.metadata_json ?? {})}::jsonb,
      now()
    )
    RETURNING *
  `;

  return mapAuditLog(rows[0]);
}

export async function getCampaignAuditTrail(
  campaignId: string,
): Promise<InvestorGrowthAuditLog[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_audit_log
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY created_at DESC
  `;

  return rows.map(mapAuditLog);
}
