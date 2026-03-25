export type ScreenerCoverageMode = "security_master" | "watchlist_fallback";

export type ScreenerFilterKey =
  | "sector"
  | "industry"
  | "exchange"
  | "country"
  | "currency"
  | "securityType";

export type SupportedFiltersMap = Record<ScreenerFilterKey, string[]>;

export interface ScreenerResultRow {
  id?: string;
  symbol: string;
  companyName?: string | null;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
  exchange?: string | null;
  country?: string | null;
  currency?: string | null;
  securityType?: string | null;
}

export interface ScreenerApiResponse {
  coverageMode: ScreenerCoverageMode;
  coverageCount: number;
  supportedFilters: SupportedFiltersMap;
  results: ScreenerResultRow[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ScreenerQueryState {
  search: string;
  sector: string;
  industry: string;
  exchange: string;
  country: string;
  currency: string;
  securityType: string;
  page: number;
  pageSize: number;
}
