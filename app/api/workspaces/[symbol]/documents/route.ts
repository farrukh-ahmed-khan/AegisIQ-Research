import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createWorkspaceDocument,
  getWorkspaceDocuments,
} from "@/lib/WorkspaceRepository";
import type { WorkspaceDocumentKind } from "@/types/workspace";

interface RouteContext {
  params: Promise<{
    symbol: string;
  }>;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9.\-]{1,12}$/.test(symbol);
}

function normalizeKind(value: string | undefined): WorkspaceDocumentKind {
  const allowed: WorkspaceDocumentKind[] = [
    "report",
    "filing",
    "model",
    "transcript",
    "deck",
    "memo",
    "other",
  ];

  if (value && allowed.includes(value as WorkspaceDocumentKind)) {
    return value as WorkspaceDocumentKind;
  }

  return "other";
}

export const dynamic = "force-dynamic";

export async function GET(_: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { symbol: rawSymbol } = await context.params;
  const symbol = normalizeSymbol(rawSymbol);

  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  }

  const documents = await getWorkspaceDocuments(userId, symbol);

  return NextResponse.json({ documents });
}

export async function POST(request: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { symbol: rawSymbol } = await context.params;
  const symbol = normalizeSymbol(rawSymbol);

  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
  }

  const body = (await request.json()) as {
    title?: string;
    kind?: string;
    sourceUrl?: string | null;
    sourceProvider?: string | null;
    mimeType?: string | null;
    storagePath?: string | null;
    fileSizeBytes?: number | null;
    metadata?: Record<string, unknown>;
  };

  const document = await createWorkspaceDocument(userId, symbol, {
    title: body.title ?? "",
    kind: normalizeKind(body.kind),
    sourceUrl: body.sourceUrl ?? null,
    sourceProvider: body.sourceProvider ?? null,
    mimeType: body.mimeType ?? null,
    storagePath: body.storagePath ?? null,
    fileSizeBytes:
      typeof body.fileSizeBytes === "number" ? body.fileSizeBytes : null,
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ document }, { status: 201 });
}
