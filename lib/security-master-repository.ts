import { sql } from "@/lib/db";

export type SecurityMasterFilterKey =
  | "sector"
  | "industry"
  | "exchange"
  | "country"
  | "currency"
  | "securityType";

export type SecurityMasterSupportedFilters = Record<
  SecurityMasterFilterKey,
  string[]
>;

export type SecurityMasterRecord = {
  id: string;
  symbol: string;
  companyName?: string | null;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
  exchange?: string | null;
  country?: string | null;
  currency?: string | null;
  securityType?: string | null;
};

export async function getSecurityMasterCoverageCount(
  _workspaceId: string,
): Promise<number> {
  const result = await sql`select 0 as count`;
  return Number(result[0]?.count ?? 0);
}

export async function getSecurityMasterSupportedFilters(
  _workspaceId?: string,
): Promise<SecurityMasterSupportedFilters> {
  return {
    sector: [],
    industry: [],
    exchange: [],
    country: [],
    currency: [],
    securityType: [],
  };
}

export async function querySecurityMaster(
  _workspaceId?: string,
): Promise<SecurityMasterRecord[]> {
  return [];
}
