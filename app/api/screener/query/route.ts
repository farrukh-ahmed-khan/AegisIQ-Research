import { NextRequest, NextResponse } from "next/server";

import {
  getSecurityMasterCoverageCount,
  getSecurityMasterSupportedFilters,
} from "@/lib/security-master-repository";
import {
  normalizeSecurityMasterFilters,
  runSecurityMasterScreenerQuery,
} from "@/lib/security-master-screener-query";
import { runWorkspaceScreenerQuery } from "@/lib/workspace-screener-query";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

type ScreenerRequestBody = {
  workspaceId?: string;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScreenerRequestBody;

    if (!body.workspaceId || typeof body.workspaceId !== "string") {
      return NextResponse.json(
        { error: "workspaceId is required." },
        { status: 400 }
      );
    }

    const workspaceId = body.workspaceId;

    const rawPage = typeof body.page === "number" && body.page >= 1 ? Math.trunc(body.page) : 1;
    const rawPageSize =
      typeof body.pageSize === "number" && body.pageSize >= 1
        ? Math.min(Math.trunc(body.pageSize), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    const filters = normalizeSecurityMasterFilters({
      ...(body.filters ?? {}),
      limit: rawPageSize,
    });
    filters.offset = (rawPage - 1) * rawPageSize;

    const coverageCount = await getSecurityMasterCoverageCount(workspaceId);

    if (coverageCount > 0) {
      const [result, supportedFilters] = await Promise.all([
        runSecurityMasterScreenerQuery({
          workspaceId,
          filters,
        }),
        getSecurityMasterSupportedFilters(workspaceId),
      ]);

      return NextResponse.json({
        ...result,
        coverageMode: "security_master",
        coverageCount,
        supportedFilters,
        page: rawPage,
        pageSize: rawPageSize,
      });
    }

    const legacyResult = await runWorkspaceScreenerQuery({
      workspaceId,
      filters: body.filters ?? {},
    });

    return NextResponse.json({
      ...legacyResult,
      coverageMode: "watchlist_fallback",
      coverageCount: 0,
      supportedFilters: {
        sector: [],
        industry: [],
        exchange: [],
        country: [],
        currency: [],
        securityType: [],
      },
    });
  } catch (error) {
    console.error("POST /api/screener/query failed", error);

    return NextResponse.json(
      { error: "Unable to execute screener query." },
      { status: 500 }
    );
  }
}
