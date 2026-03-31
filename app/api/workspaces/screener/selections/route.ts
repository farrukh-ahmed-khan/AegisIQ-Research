import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  createScreenerSelectionRun,
  listScreenerSelectionRuns,
  type ScreenerSelectionItemRecord,
} from "@/lib/workspace-screener-repository";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface SaveSelectionRequestBody {
  workspaceId?: unknown;
  name?: unknown;
  coverageMode?: unknown;
  filters?: unknown;
  totalMatches?: unknown;
  resultCount?: unknown;
  linkedWatchlistId?: unknown;
  metadata?: unknown;
  items?: unknown;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function asStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

function normalizeSelectionItem(
  input: unknown,
): ScreenerSelectionItemRecord | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;

  if (typeof raw.symbol !== "string") {
    return null;
  }

  return {
    symbol: raw.symbol,
    companyName: asStringOrNull(raw.companyName),
    exchange: asStringOrNull(raw.exchange),
    sector: asStringOrNull(raw.sector),
    industry: asStringOrNull(raw.industry),
    region: asStringOrNull(raw.region),
    country: asStringOrNull(raw.country),
    currency: asStringOrNull(raw.currency),
    securityType: asStringOrNull(raw.securityType),
    marketCap: asNumberOrNull(raw.marketCap),
    peRatio: asNumberOrNull(raw.peRatio),
    evToEbitda: asNumberOrNull(raw.evToEbitda),
    priceToBook: asNumberOrNull(raw.priceToBook),
    priceToSales: asNumberOrNull(raw.priceToSales),
    revenueGrowthYoy: asNumberOrNull(raw.revenueGrowthYoy),
    earningsGrowthYoy: asNumberOrNull(raw.earningsGrowthYoy),
    fcfGrowthYoy: asNumberOrNull(raw.fcfGrowthYoy),
    metadata: isJsonValue(raw.metadata) ? raw.metadata : null,
  };
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session.userId ?? null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUserId();

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 25;

    const runs = await listScreenerSelectionRuns(
      userId,
      Number.isFinite(limit) ? limit : 25,
    );

    return NextResponse.json({ runs });
  } catch (error) {
    console.error("Failed to list screener selections", error);
    return jsonError("Failed to load screener selections", 500);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUserId();

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const body = (await request.json()) as SaveSelectionRequestBody;

    if (
      body.coverageMode !== "security_master" &&
      body.coverageMode !== "watchlist_fallback"
    ) {
      return jsonError("Invalid coverage mode", 400);
    }

    if (!isJsonValue(body.filters)) {
      return jsonError("Invalid filters payload", 400);
    }

    if (!Array.isArray(body.items)) {
      return jsonError("Invalid selection items", 400);
    }

    const items = body.items
      .map((item) => normalizeSelectionItem(item))
      .filter((item): item is ScreenerSelectionItemRecord => item !== null);

    if (items.length === 0) {
      return jsonError("At least one selected symbol is required", 400);
    }

    const run = await createScreenerSelectionRun(userId, {
      workspaceId: asStringOrUndefined(body.workspaceId),
      name: asStringOrUndefined(body.name) ?? null,
      coverageMode: body.coverageMode,
      filters: body.filters,
      totalMatches:
        typeof body.totalMatches === "number" ? body.totalMatches : 0,
      resultCount:
        typeof body.resultCount === "number" ? body.resultCount : items.length,
      linkedWatchlistId: asStringOrUndefined(body.linkedWatchlistId) ?? null,
      metadata: isJsonValue(body.metadata) ? body.metadata : {},
      items,
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error("Failed to save screener selection", error);

    if (
      error instanceof Error &&
      error.message === "selection_items_required"
    ) {
      return jsonError("At least one selected symbol is required", 400);
    }

    return jsonError("Failed to save screener selection", 500);
  }
}
