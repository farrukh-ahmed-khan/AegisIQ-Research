export type ScreenerCoverageMode = "security_master" | "watchlist_fallback";

export type ScreenerFilterKey =
  | "sector"
  | "industry"
  | "exchange"
  | "primaryExchange"
  | "region"
  | "isActive"
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
  primaryExchange?: string | null;
  region?: string | null;
  isActive?: boolean;
  normalizedCompanyName?: string | null;
  isin?: string | null;
  figi?: string | null;
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
  primaryExchange: string;
  region: string;
  isActive: string;
  country: string;
  currency: string;
  securityType: string;
  page: number;
  pageSize: number;
}
