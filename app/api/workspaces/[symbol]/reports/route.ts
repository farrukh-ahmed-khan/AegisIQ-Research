import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getWorkspaceReports } from "@/lib/WorkspaceRepository";

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

  const reports = await getWorkspaceReports(userId, symbol);

  return NextResponse.json({ reports });
}
