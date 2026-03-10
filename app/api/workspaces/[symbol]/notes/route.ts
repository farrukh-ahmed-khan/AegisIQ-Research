import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createWorkspaceNote,
  getWorkspaceNotes,
} from "../../../../../lib/workspace-repository";

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

  const notes = await getWorkspaceNotes(userId, symbol);

  return NextResponse.json({ notes });
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
    bodyMd?: string;
    isPinned?: boolean;
  };

  const note = await createWorkspaceNote(userId, symbol, {
    title: body.title ?? "",
    bodyMd: body.bodyMd ?? "",
    isPinned: Boolean(body.isPinned),
  });

  return NextResponse.json({ note }, { status: 201 });
}
