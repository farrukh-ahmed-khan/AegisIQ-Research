import { auth } from "@clerk/nextjs/server";
import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";
import { getWorkspaceDocumentById } from "../../../../../../lib/workspace-repository";
import { WORKSPACE_DOCUMENTS_STORE_NAME } from "../../../../../../lib/workspace-document-storage";

interface RouteContext {
  params: Promise<{
    symbol: string;
    documentId: string;
  }>;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9.\-]{1,12}$/.test(symbol);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const params = await context.params;
  const symbol = normalizeSymbol(params.symbol);
  const documentId = params.documentId;

  if (!isValidSymbol(symbol) || !documentId) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const document = await getWorkspaceDocumentById(userId, symbol, documentId);

  if (!document || !document.storagePath) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (document.sourceProvider !== "netlify_blobs") {
    return NextResponse.json(
      { error: "Document is not backed by blob storage." },
      { status: 400 },
    );
  }

  const store = getStore({
    name: WORKSPACE_DOCUMENTS_STORE_NAME,
    consistency: "strong",
  });

  const blobStream = await store.get(document.storagePath, {
    type: "stream",
  });

  if (!blobStream) {
    return NextResponse.json({ error: "Blob content not found." }, { status: 404 });
  }

  const originalFilename =
    typeof document.metadata.originalFilename === "string"
      ? document.metadata.originalFilename
      : `${document.title}.bin`;

  return new Response(blobStream, {
    status: 200,
    headers: {
      "Content-Type": document.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${originalFilename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
