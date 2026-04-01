import { sql } from "../db";
import type {
  InvestorGrowthCampaign,
  InvestorGrowthCampaignStatus,
} from "../../types/investor-growth";

type InvestorGrowthCampaignInput = {
  user_id: string;
  workspace_id?: string | null;
  ticker?: string;
  company_name?: string;
  campaign_objective?: string;
  audience_focus?: string;
  tone?: string;
  notes?: string;
  strategy_payload_json?: unknown;
  content_payload_json?: unknown;
  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  social_post?: string;
  segment_id?: string | null;
  status?: InvestorGrowthCampaignStatus;
};

type InvestorGrowthCampaignUpdateInput = {
  ticker?: string;
  company_name?: string;
  campaign_objective?: string;
  audience_focus?: string;
  tone?: string;
  notes?: string;
  strategy_payload_json?: unknown;
  content_payload_json?: unknown;
  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  social_post?: string;
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

function mapCampaign(row: Record<string, unknown>): InvestorGrowthCampaign {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    workspace_id: asNullableString(row.workspace_id),
    ticker: asNullableString(row.ticker) ?? undefined,
    company_name: asNullableString(row.company_name) ?? undefined,
    campaign_objective: asNullableString(row.campaign_objective) ?? undefined,
    audience_focus: asNullableString(row.audience_focus) ?? undefined,
    tone: asNullableString(row.tone) ?? undefined,
    notes: asNullableString(row.notes) ?? undefined,
    strategy_payload_json: asRecord(row.strategy_payload_json),
    content_payload_json: asRecord(row.content_payload_json),
    email_subject: asNullableString(row.email_subject) ?? undefined,
    email_body: asNullableString(row.email_body) ?? undefined,
    sms_body: asNullableString(row.sms_body) ?? undefined,
    social_post: asNullableString(row.social_post) ?? undefined,
    segment_id: asNullableString(row.segment_id),
    status: String(row.status ?? "draft") as InvestorGrowthCampaignStatus,
    email_delivery_status: String(
      row.email_delivery_status ?? "not_sent",
    ) as InvestorGrowthCampaign["email_delivery_status"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createCampaign(
  input: InvestorGrowthCampaignInput,
): Promise<InvestorGrowthCampaign> {
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_growth_campaigns (
      id,
      user_id,
      workspace_id,
      ticker,
      company_name,
      campaign_objective,
      audience_focus,
      tone,
      notes,
      strategy_payload_json,
      content_payload_json,
      email_subject,
      email_body,
      sms_body,
      social_post,
      segment_id,
      status,
      email_delivery_status,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${input.user_id}::uuid,
      ${input.workspace_id ?? null}::uuid,
      ${input.ticker ?? null},
      ${input.company_name ?? null},
      ${input.campaign_objective ?? null},
      ${input.audience_focus ?? null},
      ${input.tone ?? null},
      ${input.notes ?? null},
      ${JSON.stringify(input.strategy_payload_json ?? {})}::jsonb,
      ${JSON.stringify(input.content_payload_json ?? {})}::jsonb,
      ${input.email_subject ?? null},
      ${input.email_body ?? null},
      ${input.sms_body ?? null},
      ${input.social_post ?? null},
      ${input.segment_id ?? null}::uuid,
      ${input.status ?? "draft"},
      'not_sent',
      now(),
      now()
    )
    RETURNING *
  `;

  return mapCampaign(rows[0]);
}

export async function getCampaignById(
  campaignId: string,
): Promise<InvestorGrowthCampaign | null> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_campaigns
    WHERE id = ${campaignId}::uuid
    LIMIT 1
  `;

  if (!rows[0]) return null;
  return mapCampaign(rows[0]);
}

export async function getCampaignsByUser(
  userId: string,
): Promise<InvestorGrowthCampaign[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_campaigns
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
  `;

  return rows.map(mapCampaign);
}

export async function updateCampaign(
  campaignId: string,
  input: InvestorGrowthCampaignUpdateInput,
): Promise<InvestorGrowthCampaign | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_growth_campaigns
    SET
      ticker = COALESCE(${input.ticker ?? null}, ticker),
      company_name = COALESCE(${input.company_name ?? null}, company_name),
      campaign_objective = COALESCE(${input.campaign_objective ?? null}, campaign_objective),
      audience_focus = COALESCE(${input.audience_focus ?? null}, audience_focus),
      tone = COALESCE(${input.tone ?? null}, tone),
      notes = COALESCE(${input.notes ?? null}, notes),
      strategy_payload_json = COALESCE(${input.strategy_payload_json ? JSON.stringify(input.strategy_payload_json) : null}::jsonb, strategy_payload_json),
      content_payload_json = COALESCE(${input.content_payload_json ? JSON.stringify(input.content_payload_json) : null}::jsonb, content_payload_json),
      email_subject = COALESCE(${input.email_subject ?? null}, email_subject),
      email_body = COALESCE(${input.email_body ?? null}, email_body),
      sms_body = COALESCE(${input.sms_body ?? null}, sms_body),
      social_post = COALESCE(${input.social_post ?? null}, social_post),
      updated_at = now()
    WHERE id = ${campaignId}::uuid
    RETURNING *
  `;

  if (!rows[0]) return null;
  return mapCampaign(rows[0]);
}

export async function updateCampaignStatus(
  campaignId: string,
  status: InvestorGrowthCampaignStatus,
): Promise<InvestorGrowthCampaign | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_growth_campaigns
    SET
      status = ${status},
      updated_at = now()
    WHERE id = ${campaignId}::uuid
    RETURNING *
  `;

  if (!rows[0]) return null;
  return mapCampaign(rows[0]);
}

export async function assignSegmentToCampaign(
  campaignId: string,
  segmentId: string | null,
): Promise<InvestorGrowthCampaign | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_growth_campaigns
    SET
      segment_id = ${segmentId}::uuid,
      updated_at = now()
    WHERE id = ${campaignId}::uuid
    RETURNING *
  `;

  if (!rows[0]) return null;
  return mapCampaign(rows[0]);
}
