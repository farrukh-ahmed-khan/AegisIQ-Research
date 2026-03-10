import { sql } from "@/lib/db";

export type WorkspaceScreenerFilters = {
  symbol?: string;
  search?: string;
  sector?: string;
  industry?: string;
  exchange?: string;
  country?: string;
  currency?: string;
  securityType?: string;
};

export type WorkspaceScreenerQueryInput = {
  workspaceId?: string;
  filters?: WorkspaceScreenerFilters;
  limit?: number;
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

export const runWorkspaceScreener = runWorkspaceScreenerQuery;
