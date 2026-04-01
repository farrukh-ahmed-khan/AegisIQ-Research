import { sql } from "../db";
import type {
  InvestorContact,
  InvestorSegment,
  InvestorSegmentMember,
} from "../../types/investor-growth";

type CreateSegmentInput = {
  user_id: string;
  workspace_id?: string | null;
  name: string;
  description?: string;
  rules_json?: unknown;
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

function mapSegment(row: Record<string, unknown>): InvestorSegment {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    workspace_id: asNullableString(row.workspace_id),
    name: String(row.name ?? ""),
    description: asNullableString(row.description) ?? undefined,
    rules_json: asRecord(row.rules_json),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapSegmentMember(row: Record<string, unknown>): InvestorSegmentMember {
  return {
    id: String(row.id),
    segment_id: String(row.segment_id),
    contact_id: String(row.contact_id),
  };
}

function mapContact(row: Record<string, unknown>): InvestorContact {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    workspace_id: asNullableString(row.workspace_id),
    name: String(row.name ?? ""),
    email: asNullableString(row.email) ?? undefined,
    phone: asNullableString(row.phone) ?? undefined,
    organization: asNullableString(row.organization) ?? undefined,
    role: asNullableString(row.role) ?? undefined,
    investor_type: asNullableString(row.investor_type) ?? undefined,
    tags_json: asRecord(row.tags_json),
    notes: asNullableString(row.notes) ?? undefined,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createSegment(
  input: CreateSegmentInput,
): Promise<InvestorSegment> {
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_segments (
      id,
      user_id,
      workspace_id,
      name,
      description,
      rules_json,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${input.user_id}::uuid,
      ${input.workspace_id ?? null}::uuid,
      ${input.name},
      ${input.description ?? null},
      ${JSON.stringify(input.rules_json ?? {})}::jsonb,
      now(),
      now()
    )
    RETURNING *
  `;

  return mapSegment(rows[0]);
}

export async function getSegmentsByUser(
  userId: string,
): Promise<InvestorSegment[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_segments
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
  `;

  return rows.map(mapSegment);
}

export async function addContactToSegment(
  segmentId: string,
  contactId: string,
): Promise<InvestorSegmentMember | null> {
  const rows = await sql<Record<string, unknown>[]>`
    WITH inserted AS (
      INSERT INTO investor_segment_members (id, segment_id, contact_id)
      SELECT gen_random_uuid(), ${segmentId}::uuid, ${contactId}::uuid
      WHERE NOT EXISTS (
        SELECT 1
        FROM investor_segment_members
        WHERE segment_id = ${segmentId}::uuid
          AND contact_id = ${contactId}::uuid
      )
      RETURNING *
    )
    SELECT * FROM inserted
    UNION ALL
    SELECT *
    FROM investor_segment_members
    WHERE segment_id = ${segmentId}::uuid
      AND contact_id = ${contactId}::uuid
    LIMIT 1
  `;

  if (!rows[0]) return null;
  return mapSegmentMember(rows[0]);
}

export async function removeContactFromSegment(
  segmentId: string,
  contactId: string,
): Promise<boolean> {
  const rows = await sql<Record<string, unknown>[]>`
    DELETE FROM investor_segment_members
    WHERE segment_id = ${segmentId}::uuid
      AND contact_id = ${contactId}::uuid
    RETURNING id
  `;

  return Boolean(rows[0]);
}

export async function getSegmentMembers(
  segmentId: string,
): Promise<InvestorContact[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT c.*
    FROM investor_contacts c
    INNER JOIN investor_segment_members m
      ON m.contact_id = c.id
    WHERE m.segment_id = ${segmentId}::uuid
    ORDER BY c.name ASC
  `;

  return rows.map(mapContact);
}
