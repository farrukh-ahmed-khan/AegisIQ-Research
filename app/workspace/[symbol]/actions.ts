"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  createWorkspaceDocument,
  createWorkspaceNote,
} from "@/lib/WorkspaceRepository";
import type { WorkspaceDocumentKind } from "@/types/workspace";

function getRequiredString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function assertAllowedKind(value: string): WorkspaceDocumentKind {
  const allowed: WorkspaceDocumentKind[] = [
    "report",
    "filing",
    "model",
    "transcript",
    "deck",
    "memo",
    "other",
  ];

  if (allowed.includes(value as WorkspaceDocumentKind)) {
    return value as WorkspaceDocumentKind;
  }

  return "other";
}

export async function createWorkspaceNoteAction(formData: FormData): Promise<void> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized.");
  }

  const symbol = normalizeSymbol(getRequiredString(formData.get("symbol")));
  const title = getRequiredString(formData.get("title"));
  const bodyMd = getRequiredString(formData.get("bodyMd"));
  const isPinned = getRequiredString(formData.get("isPinned")) === "on";

  await createWorkspaceNote(userId, symbol, {
    title,
    bodyMd,
    isPinned,
  });

  revalidatePath(`/workspace/${symbol}`);
  revalidatePath(`/api/workspaces/${symbol}`);
  revalidatePath(`/api/workspaces/${symbol}/notes`);
}

export async function createWorkspaceDocumentAction(
  formData: FormData,
): Promise<void> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized.");
  }

  const symbol = normalizeSymbol(getRequiredString(formData.get("symbol")));
  const title = getRequiredString(formData.get("title"));
  const kind = assertAllowedKind(getRequiredString(formData.get("kind")));
  const sourceUrl = getRequiredString(formData.get("sourceUrl")) || null;
  const sourceProvider = getRequiredString(formData.get("sourceProvider")) || null;
  const mimeType = getRequiredString(formData.get("mimeType")) || null;

  await createWorkspaceDocument(userId, symbol, {
    title,
    kind,
    sourceUrl,
    sourceProvider,
    mimeType,
    metadata: {},
  });

  revalidatePath(`/workspace/${symbol}`);
  revalidatePath(`/api/workspaces/${symbol}`);
  revalidatePath(`/api/workspaces/${symbol}/documents`);
}
