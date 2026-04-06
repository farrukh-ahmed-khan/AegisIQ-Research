import { sql } from "../db";
import type { InvestorGrowthDeliveryEvent } from "../../types/investor-growth";

type CreateDeliveryEventInput = {
  campaign_id: string;
  user_id: string;
  channel: string;
  recipient_payload_json?: unknown;
  content_payload_json?: unknown;
  delivery_status?: string;
  provider_message_id?: string;
  provider_response_json?: unknown;
  error_message?: string;
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

function mapDeliveryEvent(
  row: Record<string, unknown>,
): InvestorGrowthDeliveryEvent {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    user_id: String(row.user_id),
    channel: String(row.channel ?? ""),
    recipient_payload_json: asRecord(row.recipient_payload_json),
    content_payload_json: asRecord(row.content_payload_json),
    delivery_status: String(row.delivery_status ?? "not_sent"),
    provider_message_id: asNullableString(row.provider_message_id) ?? undefined,
    provider_response_json: asRecord(row.provider_response_json),
    error_message: asNullableString(row.error_message) ?? undefined,
    created_at: String(row.created_at),
  };
}

export async function createDeliveryEvent(
  input: CreateDeliveryEventInput,
): Promise<InvestorGrowthDeliveryEvent> {
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_growth_delivery_events (
      id,
      campaign_id,
      user_id,
      channel,
      recipient_payload_json,
      content_payload_json,
      delivery_status,
      provider_message_id,
      provider_response_json,
      error_message,
      triggered_at,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${input.campaign_id}::uuid,
      ${input.user_id}::uuid,
      ${input.channel},
      ${JSON.stringify(input.recipient_payload_json ?? {})}::jsonb,
      ${JSON.stringify(input.content_payload_json ?? {})}::jsonb,
      ${input.delivery_status ?? "not_sent"},
      ${input.provider_message_id ?? null},
      ${JSON.stringify(input.provider_response_json ?? {})}::jsonb,
      ${input.error_message ?? null},
      now(),
      now()
    )
    RETURNING *
  `;

  return mapDeliveryEvent(rows[0]);
}

export async function getDeliveryEventsByCampaign(
  campaignId: string,
): Promise<InvestorGrowthDeliveryEvent[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_delivery_events
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY created_at DESC
  `;

  return rows.map(mapDeliveryEvent);
}

export async function updateDeliveryStatus(
  eventId: string,
  status: string,
  errorMessage?: string | null,
): Promise<InvestorGrowthDeliveryEvent | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_growth_delivery_events
    SET
      delivery_status = ${status},
      error_message = ${errorMessage ?? null}
    WHERE id = ${eventId}::uuid
    RETURNING *
  `;

  if (!rows[0]) return null;
  return mapDeliveryEvent(rows[0]);
}
