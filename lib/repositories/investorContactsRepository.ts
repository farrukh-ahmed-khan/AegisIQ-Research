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
  tags_json?: unknown;
  notes?: string;
};

type UpdateContactInput = {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  investor_type?: string;
  tags_json?: unknown;
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

export async function createContact(
  input: CreateContactInput,
): Promise<InvestorContact> {
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_contacts (
      id,
      user_id,
      workspace_id,
      name,
      email,
      phone,
      organization,
      role,
      investor_type,
      tags_json,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${input.user_id}::uuid,
      ${input.workspace_id ?? null}::uuid,
      ${input.name},
      ${input.email ?? null},
      ${input.phone ?? null},
      ${input.organization ?? null},
      ${input.role ?? null},
      ${input.investor_type ?? null},
      ${JSON.stringify(input.tags_json ?? {})}::jsonb,
      ${input.notes ?? null},
      now(),
      now()
    )
    RETURNING *
  `;

  return mapContact(rows[0]);
}

export async function getContactsByUser(
  userId: string,
): Promise<InvestorContact[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_contacts
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
  `;

  return rows.map(mapContact);
}

export async function updateContact(
  contactId: string,
  input: UpdateContactInput,
): Promise<InvestorContact | null> {
  const rows = await sql<Record<string, unknown>[]>`
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
    WHERE id = ${contactId}::uuid
    RETURNING *
  `;

  if (!rows[0]) return null;
  return mapContact(rows[0]);
}

export async function deleteContact(contactId: string): Promise<boolean> {
  const rows = await sql<Record<string, unknown>[]>`
    DELETE FROM investor_contacts
    WHERE id = ${contactId}::uuid
    RETURNING id
  `;

  return Boolean(rows[0]);
}
