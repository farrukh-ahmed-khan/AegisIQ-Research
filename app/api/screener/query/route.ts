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

type ScreenerRequestBody = {
  workspaceId?: string;
  filters?: Record<string, unknown>;
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
    const filters = normalizeSecurityMasterFilters(body.filters ?? {});
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
