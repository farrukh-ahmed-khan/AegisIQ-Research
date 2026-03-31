import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  deleteWatchlist,
  updateWatchlist,
} from "@/lib/workspace-screener-repository";

interface UpdateWatchlistRequestBody {
  name?: unknown;
  description?: unknown;
  isDefault?: unknown;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session.userId ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ watchlistId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await requireUserId();

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const { watchlistId } = await params;

    if (!watchlistId) {
      return jsonError("Watchlist id is required", 400);
    }

    const body = (await request.json()) as UpdateWatchlistRequestBody;

    if (
      body.name === undefined &&
      body.description === undefined &&
      body.isDefault === undefined
    ) {
      return jsonError("No update fields were provided", 400);
    }

    if (body.name !== undefined && typeof body.name !== "string") {
      return jsonError("Invalid watchlist name", 400);
    }

    if (
      body.description !== undefined &&
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      return jsonError("Invalid watchlist description", 400);
    }

    if (body.isDefault !== undefined && typeof body.isDefault !== "boolean") {
      return jsonError("Invalid watchlist default flag", 400);
    }

    const watchlist = await updateWatchlist(userId, watchlistId, {
      name: body.name as string | undefined,
      description: body.description as string | null | undefined,
      isDefault: body.isDefault as boolean | undefined,
    });

    if (!watchlist) {
      return jsonError("Watchlist not found", 404);
    }

    return NextResponse.json({ watchlist });
  } catch (error) {
    console.error("Failed to update watchlist", error);

    if (error instanceof Error) {
      if (error.message === "name_required") {
        return jsonError("Watchlist name is required", 400);
      }

      if (error.message === "name_too_long") {
        return jsonError("Watchlist name is too long", 400);
      }
    }

    return jsonError("Failed to update watchlist", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ watchlistId: string }> },
): Promise<NextResponse> {
  try {
    const userId = await requireUserId();

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const { watchlistId } = await params;

    if (!watchlistId) {
      return jsonError("Watchlist id is required", 400);
    }

    const deleted = await deleteWatchlist(userId, watchlistId);

    if (!deleted) {
      return jsonError("Watchlist not found", 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete watchlist", error);
    return jsonError("Failed to delete watchlist", 500);
  }
}
