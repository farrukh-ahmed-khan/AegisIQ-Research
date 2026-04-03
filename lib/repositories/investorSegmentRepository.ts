import { sql } from "../db";
import type {
  InvestorSegment,
  InvestorSegmentMember,
} from "../../types/investor-growth";

type CreateSegmentInput = {
  user_id: string;
  workspace_id?: string | null;
  name: string;
  description?: string;
  rules_json?: Record<string, unknown>;
};

type UpdateSegmentInput = {
  name?: string;
  description?: string;
  rules_json?: Record<string, unknown>;
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
    name: String(row.name),
    description: asNullableString(row.description),
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

export async function createSegment(
  input: CreateSegmentInput,
): Promise<string> {
  const segmentId = crypto.randomUUID();

  await sql`
    INSERT INTO investor_segments (
      id, user_id, workspace_id,
      name, description, rules_json,
      created_at, updated_at
    ) VALUES (
      ${segmentId}, ${input.user_id}, ${input.workspace_id ?? null},
      ${input.name}, ${input.description ?? null}, ${JSON.stringify(input.rules_json ?? {})},
      now(), now()
    )
  `;

  return segmentId;
}

export async function getSegmentById(
  id: string,
): Promise<InvestorSegment | null> {
  const result = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_segments WHERE id = ${id}
  `;

  return result.length > 0 ? mapSegment(result[0]) : null;
}

export async function getSegmentsByUser(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<InvestorSegment[]> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_segments
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return results.map(mapSegment);
}

export async function countSegmentsByUser(userId: string): Promise<number> {
  const result = await sql<Array<{ count: number }>>`
    SELECT COUNT(*) as count FROM investor_segments WHERE user_id = ${userId}
  `;

  return result[0]?.count ?? 0;
}

export async function updateSegment(
  id: string,
  input: UpdateSegmentInput,
): Promise<void> {
  await sql`
    UPDATE investor_segments
    SET
      name = COALESCE(${input.name ?? null}, name),
      description = COALESCE(${input.description ?? null}, description),
      rules_json = COALESCE(${input.rules_json ? JSON.stringify(input.rules_json) : null}::jsonb, rules_json),
      updated_at = now()
    WHERE id = ${id}
  `;
}

export async function deleteSegment(id: string): Promise<void> {
  // Delete segment members first
  await sql`DELETE FROM investor_segment_members WHERE segment_id = ${id}`;

  // Then delete the segment
  await sql`DELETE FROM investor_segments WHERE id = ${id}`;
}

// Segment Members

export async function addContactToSegment(
  segmentId: string,
  contactId: string,
): Promise<string> {
  const memberId = crypto.randomUUID();

  await sql`
    INSERT INTO investor_segment_members (id, segment_id, contact_id)
    VALUES (${memberId}, ${segmentId}, ${contactId})
  `;

  return memberId;
}

export async function removeContactFromSegment(
  segmentId: string,
  contactId: string,
): Promise<void> {
  await sql`
    DELETE FROM investor_segment_members
    WHERE segment_id = ${segmentId} AND contact_id = ${contactId}
  `;
}

export async function getSegmentMembers(
  segmentId: string,
): Promise<InvestorSegmentMember[]> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_segment_members
    WHERE segment_id = ${segmentId}
  `;

  return results.map(mapSegmentMember);
}

export async function getSegmentMemberContacts(
  segmentId: string,
): Promise<Array<Record<string, unknown>>> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT c.* FROM investor_contacts c
    INNER JOIN investor_segment_members m ON c.id = m.contact_id
    WHERE m.segment_id = ${segmentId}
    ORDER BY c.created_at DESC
  `;

  return results;
}

export async function countSegmentMembers(segmentId: string): Promise<number> {
  const result = await sql<Array<{ count: number }>>`
    SELECT COUNT(*) as count FROM investor_segment_members WHERE segment_id = ${segmentId}
  `;

  return result[0]?.count ?? 0;
}
