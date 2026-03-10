import type {
  WorkspaceDocumentKind,
  WorkspaceDocumentSourceProvider,
} from "../types/workspace";

export const WORKSPACE_DOCUMENTS_STORE_NAME = "workspace-documents";
export const MAX_WORKSPACE_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_WORKSPACE_DOCUMENT_MIME_TYPES = new Set<string>([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extractExtension(filename: string): string {
  const trimmed = filename.trim();
  const lastDotIndex = trimmed.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === trimmed.length - 1) {
    return "";
  }

  const extension = trimmed.slice(lastDotIndex + 1).toLowerCase();
  return /^[a-z0-9]{1,12}$/.test(extension) ? extension : "";
}

export function normalizeWorkspaceDocumentSourceProvider(
  value: string | null | undefined,
): WorkspaceDocumentSourceProvider | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "external_url" ||
    normalized === "netlify_blobs" ||
    normalized === "manual" ||
    normalized === "unknown"
  ) {
    return normalized;
  }

  if (
    normalized === "url" ||
    normalized === "external" ||
    normalized === "link"
  ) {
    return "external_url";
  }

  if (
    normalized === "blob" ||
    normalized === "blobs" ||
    normalized === "netlify"
  ) {
    return "netlify_blobs";
  }

  return "unknown";
}

export function inferWorkspaceDocumentSourceProvider(input: {
  sourceUrl?: string | null;
  storagePath?: string | null;
  sourceProvider?: string | null;
}): WorkspaceDocumentSourceProvider | null {
  const explicit = normalizeWorkspaceDocumentSourceProvider(input.sourceProvider);

  if (explicit) {
    return explicit;
  }

  if (input.storagePath) {
    return "netlify_blobs";
  }

  if (input.sourceUrl) {
    return "external_url";
  }

  return null;
}

export function buildWorkspaceDocumentStoragePath(input: {
  clerkUserId: string;
  symbol: string;
  kind: WorkspaceDocumentKind;
  filename: string;
  timestamp?: Date;
}): string {
  const now = input.timestamp ?? new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  const sec = String(now.getUTCSeconds()).padStart(2, "0");

  const safeUser = sanitizePathSegment(input.clerkUserId);
  const safeSymbol = sanitizePathSegment(input.symbol.toUpperCase());
  const safeKind = sanitizePathSegment(input.kind);
  const safeFilenameBase = sanitizePathSegment(
    input.filename.replace(/\.[^.]+$/, ""),
  );
  const extension = extractExtension(input.filename);

  const basename = extension
    ? `${safeFilenameBase || "document"}-${hh}${min}${sec}.${extension}`
    : `${safeFilenameBase || "document"}-${hh}${min}${sec}`;

  return [
    safeUser,
    safeSymbol,
    safeKind,
    `${yyyy}${mm}${dd}`,
    basename,
  ].join("/");
}

export function buildWorkspaceDocumentMetadata(input: {
  originalFilename?: string | null;
  uploadedBy?: string | null;
  storageProvider?: WorkspaceDocumentSourceProvider | null;
  sourceUrl?: string | null;
  storagePath?: string | null;
  existingMetadata?: Record<string, unknown> | null;
}): Record<string, unknown> {
  return {
    ...(input.existingMetadata ?? {}),
    originalFilename: input.originalFilename ?? null,
    uploadedBy: input.uploadedBy ?? null,
    storageProvider: input.storageProvider ?? null,
    sourceUrl: input.sourceUrl ?? null,
    storagePath: input.storagePath ?? null,
  };
}

export function assertSupportedWorkspaceDocumentFile(file: File): void {
  if (!(file instanceof File)) {
    throw new Error("A document file is required.");
  }

  if (!file.name.trim()) {
    throw new Error("Uploaded file must have a filename.");
  }

  if (!ALLOWED_WORKSPACE_DOCUMENT_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Upload PDF, TXT, CSV, or DOCX.");
  }

  if (file.size <= 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (file.size > MAX_WORKSPACE_DOCUMENT_BYTES) {
    throw new Error("Uploaded file exceeds the 10 MB limit.");
  }
}

export function inferDocumentTitleFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, "").trim();

  return withoutExtension || "Workspace document";
}
