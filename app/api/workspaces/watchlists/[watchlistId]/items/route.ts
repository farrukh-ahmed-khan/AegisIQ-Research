import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  addWatchlistItem,
  listWatchlistItems,
} from "@/lib/workspace-screener-repository";

interface AddWatchlistItemRequestBody {
  symbol?: unknown;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session.userId ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ watchlistId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Unauthorized", 401);

    const { watchlistId } = await params;
    if (!watchlistId) return jsonError("Watchlist id is required", 400);

    const items = await listWatchlistItems(userId, watchlistId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to list watchlist items", error);
    return jsonError("Failed to load watchlist items", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ watchlistId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Unauthorized", 401);

    const { watchlistId } = await params;
    if (!watchlistId) return jsonError("Watchlist id is required", 400);

    const body = (await request.json()) as AddWatchlistItemRequestBody;
    if (typeof body.symbol !== "string")
      return jsonError("Invalid symbol", 400);

    const item = await addWatchlistItem(userId, watchlistId, {
      symbol: body.symbol,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Failed to add watchlist item", error);

    if (error instanceof Error) {
      if (error.message === "symbol_required")
        return jsonError("Symbol is required", 400);
      if (error.message === "watchlist_not_found")
        return jsonError("Watchlist not found", 404);
    }

    return jsonError("Failed to add watchlist item", 500);
  }
}
