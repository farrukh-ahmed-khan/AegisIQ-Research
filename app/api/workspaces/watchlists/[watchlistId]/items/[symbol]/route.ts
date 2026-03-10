import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { removeWatchlistItem } from "@/lib/workspace-screener-repository";

interface RouteContext {
  params: {
    watchlistId: string;
    symbol: string;
  };
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session.userId ?? null;
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const userId = await requireUserId();

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const watchlistId = context.params.watchlistId;
    const symbol = context.params.symbol;

    if (!watchlistId) {
      return jsonError("Watchlist id is required", 400);
    }

    if (!symbol) {
      return jsonError("Symbol is required", 400);
    }

    const removed = await removeWatchlistItem(userId, watchlistId, symbol);

    if (!removed) {
      return jsonError("Watchlist item not found", 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove watchlist item", error);
    return jsonError("Failed to remove watchlist item", 500);
  }
}
