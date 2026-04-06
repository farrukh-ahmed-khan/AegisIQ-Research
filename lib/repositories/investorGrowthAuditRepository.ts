import { sql } from "../db";
import type { InvestorGrowthAuditLog } from "../../types/investor-growth";

type CreateAuditLogInput = {
  user_id: string;
  campaign_id?: string | null;
  action: string;
  metadata_json?: Record<string, unknown>;
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
    campaign_id: asNullableString(row.campaign_id),
    action: String(row.action),
    metadata_json: asRecord(row.metadata_json),
    created_at: String(row.created_at),
  };
}

export async function createAuditLog(
  input: CreateAuditLogInput,
): Promise<string> {
  const logId = crypto.randomUUID();

  await sql`
    INSERT INTO investor_growth_audit_log (
      id, user_id, campaign_id,
      action, metadata_json,
      created_at
    ) VALUES (
      ${logId}, ${input.user_id}, ${input.campaign_id ?? null},
      ${input.action}, ${JSON.stringify(input.metadata_json ?? {})},
      now()
    )
  `;

  return logId;
}

export async function getAuditLogByCampaignId(
  campaignId: string,
): Promise<InvestorGrowthAuditLog[]> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_growth_audit_log
    WHERE campaign_id = ${campaignId}
    ORDER BY created_at DESC
  `;

  return results.map(mapAuditLog);
}

export async function getAuditLogByUser(
  userId: string,
  limit = 100,
  offset = 0,
): Promise<InvestorGrowthAuditLog[]> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_growth_audit_log
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return results.map(mapAuditLog);
}

export async function countAuditLogByUser(userId: string): Promise<number> {
  const result = await sql<Array<{ count: number }>>`
    SELECT COUNT(*) as count FROM investor_growth_audit_log WHERE user_id = ${userId}
  `;

  return result[0]?.count ?? 0;
}
