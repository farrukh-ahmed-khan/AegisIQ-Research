import { sql } from "./db";
import type {
  CompanyWorkspace,
  CompanyWorkspaceTerminalViewModel,
  CreateWorkspaceDocumentInput,
  CreateWorkspaceNoteInput,
  ReportRun,
  ValuationSnapshot,
  WorkspaceActivity,
  WorkspaceDocument,
  WorkspaceNote,
} from "../types/workspace";

type JsonValue = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function assertValidSymbol(symbol: string): string {
  const normalized = normalizeSymbol(symbol);

  if (!/^[A-Z0-9.\-]{1,12}$/.test(normalized)) {
    throw new Error("Invalid symbol.");
  }

  return normalized;
}

function mapWorkspace(row: Record<string, unknown>): CompanyWorkspace {
  return {
    id: String(row.id),
    clerkUserId: String(row.clerk_user_id),
    symbol: String(row.symbol),
    companyName: asStringOrNull(row.company_name),
    exchange: asStringOrNull(row.exchange),
    primaryCurrency: String(row.primary_currency ?? "USD"),
    coverageStatus: String(row.coverage_status ?? "active"),
    lastPrice: asNumberOrNull(row.last_price),
    lastPriceAt: asStringOrNull(row.last_price_at),
    latestRating: asStringOrNull(row.latest_rating),
    latestTargetPrice: asNumberOrNull(row.latest_target_price),
    latestReportId: asStringOrNull(row.latest_report_id),
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapNote(row: Record<string, unknown>): WorkspaceNote {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    clerkUserId: String(row.clerk_user_id),
    title: String(row.title),
    bodyMd: String(row.body_md ?? ""),
    isPinned: Boolean(row.is_pinned),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDocument(row: Record<string, unknown>): WorkspaceDocument {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    clerkUserId: String(row.clerk_user_id),
    title: String(row.title),
    kind: String(row.kind) as WorkspaceDocument["kind"],
    sourceUrl: asStringOrNull(row.source_url),
    storagePath: asStringOrNull(row.storage_path),
    mimeType: asStringOrNull(row.mime_type),
    sourceProvider:
      asStringOrNull(row.source_provider) as WorkspaceDocument["sourceProvider"],
    fileSizeBytes: asNumberOrNull(row.file_size_bytes),
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapValuation(row: Record<string, unknown>): ValuationSnapshot {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    clerkUserId: String(row.clerk_user_id),
    modelName: String(row.model_name),
    fairValue: asNumberOrNull(row.fair_value),
    priceTarget: asNumberOrNull(row.price_target),
    upsideDownsidePct: asNumberOrNull(row.upside_downside_pct),
    assumptions: asRecord(row.assumptions),
    outputs: asRecord(row.outputs),
    createdAt: String(row.created_at),
  };
}

function mapReport(row: Record<string, unknown>): ReportRun {
  return {
    id: String(row.id),
    workspaceId: asStringOrNull(row.workspace_id),
    clerkUserId: String(row.clerk_user_id),
    symbol: String(row.symbol),
    reportType: String(row.report_type),
    status: String(row.status) as ReportRun["status"],
    startedAt: asStringOrNull(row.started_at),
    completedAt: asStringOrNull(row.completed_at),
    errorMessage: asStringOrNull(row.error_message),
    pdfUrl: asStringOrNull(row.pdf_url),
    inputPayload: asRecord(row.input_payload),
    outputPayload: asRecord(row.output_payload),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapActivity(row: Record<string, unknown>): WorkspaceActivity {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    clerkUserId: String(row.clerk_user_id),
    kind: String(row.kind) as WorkspaceActivity["kind"],
    label: String(row.label),
    detail: asStringOrNull(row.detail),
    actorName: asStringOrNull(row.actor_name),
    actorClerkUserId: asStringOrNull(row.actor_clerk_user_id),
    relatedEntityType: asStringOrNull(row.related_entity_type),
    relatedEntityId: asStringOrNull(row.related_entity_id),
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at),
  };
}

async function ensureWorkspace(
  clerkUserId: string,
  rawSymbol: string,
): Promise<CompanyWorkspace> {
  const symbol = assertValidSymbol(rawSymbol);

  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO company_workspaces (
      clerk_user_id,
      symbol,
      coverage_status,
      primary_currency,
      metadata
    )
    VALUES (
      ${clerkUserId},
      ${symbol},
      'active',
      'USD',
      '{}'::jsonb
    )
    ON CONFLICT (clerk_user_id, symbol)
    DO UPDATE SET
      updated_at = now()
    RETURNING *
  `;

  return mapWorkspace(rows[0]);
}

export async function getWorkspaceTerminalViewModel(
  clerkUserId: string,
  rawSymbol: string,
): Promise<CompanyWorkspaceTerminalViewModel> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);

  const [notesRows, documentsRows, valuationsRows, reportsRows, activityRows] =
    await Promise.all([
      sql<Record<string, unknown>[]>`
        SELECT *
        FROM workspace_notes
        WHERE workspace_id = ${workspace.id}
          AND clerk_user_id = ${clerkUserId}
        ORDER BY is_pinned DESC, updated_at DESC
        LIMIT 20
      `,
      sql<Record<string, unknown>[]>`
        SELECT *
        FROM workspace_documents
        WHERE workspace_id = ${workspace.id}
          AND clerk_user_id = ${clerkUserId}
        ORDER BY created_at DESC
        LIMIT 20
      `,
      sql<Record<string, unknown>[]>`
        SELECT *
        FROM valuation_snapshots
        WHERE workspace_id = ${workspace.id}
          AND clerk_user_id = ${clerkUserId}
        ORDER BY created_at DESC
        LIMIT 12
      `,
      sql<Record<string, unknown>[]>`
        SELECT *
        FROM report_runs
        WHERE clerk_user_id = ${clerkUserId}
          AND (
            workspace_id = ${workspace.id}
            OR symbol = ${workspace.symbol}
          )
        ORDER BY created_at DESC
        LIMIT 12
      `,
      sql<Record<string, unknown>[]>`
        SELECT *
        FROM workspace_activity
        WHERE workspace_id = ${workspace.id}
          AND clerk_user_id = ${clerkUserId}
        ORDER BY created_at DESC
        LIMIT 20
      `,
    ]);

  return {
    workspace: {
      symbol: workspace.symbol,
      companyName: workspace.companyName,
      exchange: workspace.exchange,
      coverageStatus: workspace.coverageStatus,
      primaryCurrency: workspace.primaryCurrency,
      lastPrice: workspace.lastPrice,
      lastPriceAt: workspace.lastPriceAt,
      latestRating: workspace.latestRating,
      latestTargetPrice: workspace.latestTargetPrice,
      updatedAt: workspace.updatedAt,
    },
    notes: notesRows.map(mapNote),
    documents: documentsRows.map(mapDocument),
    valuations: valuationsRows.map(mapValuation),
    reports: reportsRows.map(mapReport),
    activity: activityRows.map(mapActivity),
  };
}

export async function getWorkspaceNotes(
  clerkUserId: string,
  rawSymbol: string,
): Promise<WorkspaceNote[]> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM workspace_notes
    WHERE workspace_id = ${workspace.id}
      AND clerk_user_id = ${clerkUserId}
    ORDER BY is_pinned DESC, updated_at DESC
    LIMIT 50
  `;

  return rows.map(mapNote);
}

export async function getWorkspaceDocuments(
  clerkUserId: string,
  rawSymbol: string,
): Promise<WorkspaceDocument[]> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM workspace_documents
    WHERE workspace_id = ${workspace.id}
      AND clerk_user_id = ${clerkUserId}
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return rows.map(mapDocument);
}

export async function getWorkspaceDocumentById(
  clerkUserId: string,
  rawSymbol: string,
  documentId: string,
): Promise<WorkspaceDocument | null> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM workspace_documents
    WHERE id = ${documentId}
      AND workspace_id = ${workspace.id}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  return rows.length > 0 ? mapDocument(rows[0]) : null;
}

export async function getWorkspaceReports(
  clerkUserId: string,
  rawSymbol: string,
): Promise<ReportRun[]> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM report_runs
    WHERE clerk_user_id = ${clerkUserId}
      AND (
        workspace_id = ${workspace.id}
        OR symbol = ${workspace.symbol}
      )
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return rows.map(mapReport);
}

export async function createWorkspaceNote(
  clerkUserId: string,
  rawSymbol: string,
  input: CreateWorkspaceNoteInput,
): Promise<WorkspaceNote> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);
  const title = input.title.trim();
  const bodyMd = input.bodyMd.trim();

  if (!title) {
    throw new Error("Note title is required.");
  }

  const noteRows = await sql<Record<string, unknown>[]>`
    INSERT INTO workspace_notes (
      workspace_id,
      clerk_user_id,
      title,
      body_md,
      is_pinned
    )
    VALUES (
      ${workspace.id},
      ${clerkUserId},
      ${title},
      ${bodyMd},
      ${Boolean(input.isPinned)}
    )
    RETURNING *
  `;

  const note = mapNote(noteRows[0]);

  await sql`
    INSERT INTO workspace_activity (
      workspace_id,
      clerk_user_id,
      kind,
      label,
      detail,
      related_entity_type,
      related_entity_id,
      metadata
    )
    VALUES (
      ${workspace.id},
      ${clerkUserId},
      'note_created',
      ${`Note added: ${title}`},
      ${bodyMd.slice(0, 240) || null},
      'workspace_note',
      ${note.id},
      ${sql.json({ title } as never)}
    )
  `;

  return note;
}

export async function updateWorkspaceNote(
  clerkUserId: string,
  rawSymbol: string,
  noteId: string,
  input: CreateWorkspaceNoteInput,
): Promise<WorkspaceNote> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);
  const title = input.title.trim();
  const bodyMd = input.bodyMd.trim();

  if (!title) {
    throw new Error("Note title is required.");
  }

  const noteRows = await sql<Record<string, unknown>[]>`
    UPDATE workspace_notes
    SET
      title = ${title},
      body_md = ${bodyMd},
      is_pinned = ${Boolean(input.isPinned)},
      updated_at = now()
    WHERE id = ${noteId}
      AND workspace_id = ${workspace.id}
      AND clerk_user_id = ${clerkUserId}
    RETURNING *
  `;

  if (noteRows.length === 0) {
    throw new Error("Note not found.");
  }

  const note = mapNote(noteRows[0]);

  await sql`
    INSERT INTO workspace_activity (
      workspace_id,
      clerk_user_id,
      kind,
      label,
      detail,
      related_entity_type,
      related_entity_id,
      metadata
    )
    VALUES (
      ${workspace.id},
      ${clerkUserId},
      'note_updated',
      ${`Note updated: ${title}`},
      ${bodyMd.slice(0, 240) || null},
      'workspace_note',
      ${note.id},
      ${sql.json({ title } as never)}
    )
  `;

  return note;
}

export async function deleteWorkspaceNote(
  clerkUserId: string,
  rawSymbol: string,
  noteId: string,
): Promise<void> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);

  const existingRows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM workspace_notes
    WHERE id = ${noteId}
      AND workspace_id = ${workspace.id}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  if (existingRows.length === 0) {
    throw new Error("Note not found.");
  }

  const existingNote = mapNote(existingRows[0]);

  await sql`
    DELETE FROM workspace_notes
    WHERE id = ${noteId}
      AND workspace_id = ${workspace.id}
      AND clerk_user_id = ${clerkUserId}
  `;

  await sql`
    INSERT INTO workspace_activity (
      workspace_id,
      clerk_user_id,
      kind,
      label,
      detail,
      related_entity_type,
      related_entity_id,
      metadata
    )
    VALUES (
      ${workspace.id},
      ${clerkUserId},
      'note_deleted',
      ${`Note deleted: ${existingNote.title}`},
      ${existingNote.bodyMd.slice(0, 240) || null},
      'workspace_note',
      ${existingNote.id},
      ${sql.json({ title: existingNote.title } as never)}
    )
  `;
}

export async function createWorkspaceDocument(
  clerkUserId: string,
  rawSymbol: string,
  input: CreateWorkspaceDocumentInput,
): Promise<WorkspaceDocument> {
  const workspace = await ensureWorkspace(clerkUserId, rawSymbol);
  const title = input.title.trim();

  if (!title) {
    throw new Error("Document title is required.");
  }

  const safeMetadata: JsonValue = input.metadata ?? {};
  const detail = input.sourceUrl ?? input.storagePath ?? null;

  const documentRows = await sql<Record<string, unknown>[]>`
    INSERT INTO workspace_documents (
      workspace_id,
      clerk_user_id,
      title,
      kind,
      source_url,
      storage_path,
      mime_type,
      source_provider,
      file_size_bytes,
      metadata
    )
    VALUES (
      ${workspace.id},
      ${clerkUserId},
      ${title},
      ${input.kind},
      ${input.sourceUrl ?? null},
      ${input.storagePath ?? null},
      ${input.mimeType ?? null},
      ${input.sourceProvider ?? null},
      ${input.fileSizeBytes ?? null},
      ${sql.json(safeMetadata as never)}
    )
    RETURNING *
  `;

  const document = mapDocument(documentRows[0]);

  await sql`
    INSERT INTO workspace_activity (
      workspace_id,
      clerk_user_id,
      kind,
      label,
      detail,
      related_entity_type,
      related_entity_id,
      metadata
    )
    VALUES (
      ${workspace.id},
      ${clerkUserId},
      'document_added',
      ${`Document linked: ${title}`},
      ${detail},
      'workspace_document',
      ${document.id},
      ${sql.json(
        {
          kind: input.kind,
          sourceProvider: input.sourceProvider ?? null,
          sourceUrl: input.sourceUrl ?? null,
          storagePath: input.storagePath ?? null,
          fileSizeBytes: input.fileSizeBytes ?? null,
        } as never
      )}
    )
  `;

  return document;
}
