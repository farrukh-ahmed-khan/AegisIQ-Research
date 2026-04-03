import { sql } from "../db";
import type { InvestorContact } from "../../types/investor-growth";

type CreateContactInput = {
  user_id: string;
  workspace_id?: string | null;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  investor_type?: string;
  tags_json?: Record<string, unknown>;
  notes?: string;
};

type UpdateContactInput = {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  investor_type?: string;
  tags_json?: Record<string, unknown>;
  notes?: string;
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

function mapContact(row: Record<string, unknown>): InvestorContact {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    workspace_id: asNullableString(row.workspace_id),
    name: String(row.name),
    email: asNullableString(row.email),
    phone: asNullableString(row.phone),
    organization: asNullableString(row.organization),
    role: asNullableString(row.role),
    investor_type: asNullableString(row.investor_type),
    tags_json: asRecord(row.tags_json),
    notes: asNullableString(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createContact(
  input: CreateContactInput,
): Promise<string> {
  const contactId = crypto.randomUUID();

  await sql`
    INSERT INTO investor_contacts (
      id, user_id, workspace_id,
      name, email, phone,
      organization, role, investor_type,
      tags_json, notes,
      created_at, updated_at
    ) VALUES (
      ${contactId}, ${input.user_id}, ${input.workspace_id ?? null},
      ${input.name}, ${input.email ?? null}, ${input.phone ?? null},
      ${input.organization ?? null}, ${input.role ?? null}, ${input.investor_type ?? null},
      ${JSON.stringify(input.tags_json ?? {})}, ${input.notes ?? null},
      now(), now()
    )
  `;

  return contactId;
}

export async function getContactById(
  id: string,
): Promise<InvestorContact | null> {
  const result = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_contacts WHERE id = ${id}
  `;

  return result.length > 0 ? mapContact(result[0]) : null;
}

export async function getContactsByUser(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<InvestorContact[]> {
  const results = await sql<Record<string, unknown>[]>`
    SELECT * FROM investor_contacts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return results.map(mapContact);
}

export async function countContactsByUser(userId: string): Promise<number> {
  const result = await sql<Array<{ count: number }>>`
    SELECT COUNT(*) as count FROM investor_contacts WHERE user_id = ${userId}
  `;

  return result[0]?.count ?? 0;
}

export async function updateContact(
  id: string,
  input: UpdateContactInput,
): Promise<void> {
  await sql`
    UPDATE investor_contacts
    SET
      name = COALESCE(${input.name ?? null}, name),
      email = COALESCE(${input.email ?? null}, email),
      phone = COALESCE(${input.phone ?? null}, phone),
      organization = COALESCE(${input.organization ?? null}, organization),
      role = COALESCE(${input.role ?? null}, role),
      investor_type = COALESCE(${input.investor_type ?? null}, investor_type),
      tags_json = COALESCE(${input.tags_json ? JSON.stringify(input.tags_json) : null}::jsonb, tags_json),
      notes = COALESCE(${input.notes ?? null}, notes),
      updated_at = now()
    WHERE id = ${id}
  `;
}

export async function deleteContact(id: string): Promise<void> {
  // Delete segment members first
  await sql`DELETE FROM investor_segment_members WHERE contact_id = ${id}`;

  // Then delete the contact
  await sql`DELETE FROM investor_contacts WHERE id = ${id}`;
}
