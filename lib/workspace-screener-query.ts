import { sql } from "@/lib/db";

export type WorkspaceScreenerQueryInput = {
  workspaceId: string;
};

export type WorkspaceScreenerResultRow = {
  id: string;
  symbol: string;
  companyName?: string | null;
  name?: string | null;
};

export type WorkspaceScreenerQueryResult = {
  coverageMode: "watchlist_fallback";
  coverageCount: number;
  supportedFilters: {
    sector: string[];
    industry: string[];
    exchange: string[];
    country: string[];
    currency: string[];
    securityType: string[];
  };
  results: WorkspaceScreenerResultRow[];
  total: number;
};

export async function runWorkspaceScreenerQuery(
  _input: WorkspaceScreenerQueryInput,
): Promise<WorkspaceScreenerQueryResult> {

  // keep connection warm but do nothing yet
  await sql`select 1`;

  return {
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
    results: [],
    total: 0,
  };
}
