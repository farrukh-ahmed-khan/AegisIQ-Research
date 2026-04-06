import { sql } from "../db";
import type { InvestorGrowthCampaign } from "../../types/investor-growth";

type CreateCampaignInput = {
  user_id: string;
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
  strategy: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
  segment_id?: string | null;
};

type UpdateCampaignInput = {
  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  social_post?: string;
  notes?: string;
  segment_id?: string | null;
};

type MarkCampaignEmailResultInput = {
  delivery_status: "sending" | "sent" | "failed";
  status?: InvestorGrowthCampaign["status"];
  provider_message_id?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
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
    status: (asNullableString(row.status) ??
      "draft") as InvestorGrowthCampaign["status"],
    email_delivery_status: (asNullableString(row.email_delivery_status) ??
      "not_sent") as InvestorGrowthCampaign["email_delivery_status"],
    email_sent_at: asNullableString(row.email_sent_at),
    email_provider_message_id: asNullableString(row.email_provider_message_id),
    email_last_error: asNullableString(row.email_last_error),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<InvestorGrowthCampaign> {
  const inputPayload = {
    ticker: input.ticker,
    company_name: input.company_name,
    campaign_objective: input.campaign_objective,
    audience_focus: input.audience_focus,
    tone: input.tone,
    notes: input.notes,
  };

  const strategyPayload = {
    strategy: input.strategy,
  };

  const contentPayload = {
    strategy: input.strategy,
    email_draft: input.email_draft,
    sms_draft: input.sms_draft,
    social_post: input.social_post,
  };

  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_growth_campaigns (
      id,
      user_id,
      ticker,
      company_name,
      campaign_objective,
      audience_focus,
      tone,
      notes,
      input_payload_json,
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
      ${input.ticker},
      ${input.company_name},
      ${input.campaign_objective},
      ${input.audience_focus},
      ${input.tone},
      ${input.notes},
      ${JSON.stringify(inputPayload)}::jsonb,
      ${JSON.stringify(strategyPayload)}::jsonb,
      ${JSON.stringify(contentPayload)}::jsonb,
      NULL,
      ${input.email_draft},
      ${input.sms_draft},
      ${input.social_post},
      ${input.segment_id ?? null}::uuid,
      'draft',
      'not_sent',
      now(),
      now()
    )
    RETURNING *
  `;

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

export async function getCampaignsByUserPaginated(
  userId: string,
  limit: number,
  offset: number,
): Promise<InvestorGrowthCampaign[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_campaigns
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return rows.map(mapCampaign);
}

export async function countCampaignsByUser(userId: string): Promise<number> {
  const rows = await sql<Array<{ total_count: number | string }>>`
    SELECT COUNT(*)::int AS total_count
    FROM investor_growth_campaigns
    WHERE user_id = ${userId}::uuid
  `;

  const value = rows[0]?.total_count;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

  if (!rows[0]) {
    return null;
  }

  return mapCampaign(rows[0]);
}

export async function updateCampaign(
  campaignId: string,
  input: UpdateCampaignInput,
): Promise<InvestorGrowthCampaign | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_growth_campaigns
    SET
      email_subject = COALESCE(${input.email_subject ?? null}, email_subject),
      email_body = COALESCE(${input.email_body ?? null}, email_body),
      sms_body = COALESCE(${input.sms_body ?? null}, sms_body),
      social_post = COALESCE(${input.social_post ?? null}, social_post),
      notes = COALESCE(${input.notes ?? null}, notes),
      segment_id = COALESCE(${input.segment_id ?? null}::uuid, segment_id),
      updated_at = now()
    WHERE id = ${campaignId}::uuid
    RETURNING *
  `;

  if (!rows[0]) {
    return null;
  }

  return mapCampaign(rows[0]);
}

export async function updateCampaignEmailDelivery(
  campaignId: string,
  emailDeliveryStatus: "sending" | "sent" | "failed",
): Promise<InvestorGrowthCampaign | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_growth_campaigns
    SET
      email_delivery_status = ${emailDeliveryStatus},
      email_sent_at = CASE
        WHEN ${emailDeliveryStatus} = 'sent' THEN now()
        ELSE email_sent_at
      END,
      updated_at = now()
    WHERE id = ${campaignId}::uuid
    RETURNING *
  `;

  if (!rows[0]) {
    return null;
  }

  return mapCampaign(rows[0]);
}

export async function markCampaignEmailResult(
  campaignId: string,
  input: MarkCampaignEmailResultInput,
): Promise<InvestorGrowthCampaign | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_growth_campaigns
    SET
      status = COALESCE(${input.status ?? null}, status),
      email_delivery_status = ${input.delivery_status},
      email_sent_at = CASE
        WHEN ${input.delivery_status} = 'sent'
          THEN COALESCE(${input.sent_at ?? null}::timestamp, now())
        ELSE email_sent_at
      END,
      email_provider_message_id = CASE
        WHEN ${input.delivery_status} = 'sent'
          THEN ${input.provider_message_id ?? null}
        ELSE email_provider_message_id
      END,
      email_last_error = CASE
        WHEN ${input.delivery_status} = 'failed'
          THEN ${input.error_message ?? null}
        WHEN ${input.delivery_status} = 'sent'
          THEN NULL
        ELSE email_last_error
      END,
      updated_at = now()
    WHERE id = ${campaignId}::uuid
    RETURNING *
  `;

  if (!rows[0]) {
    return null;
  }

  return mapCampaign(rows[0]);
}
