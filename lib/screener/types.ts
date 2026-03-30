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

export type MarketCapBucket =
  | "nano"
  | "micro"
  | "small"
  | "mid"
  | "large"
  | "mega";

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
  // Phase 12 — fundamentals columns
  marketCap?: number | null;
  peRatio?: number | null;
  evToEbitda?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  revenueGrowthYoy?: number | null;
  earningsGrowthYoy?: number | null;
  fcfGrowthYoy?: number | null;
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
  // Phase 12 — advanced filters
  marketCapBuckets: MarketCapBucket[];
  peRatioMin: string;
  peRatioMax: string;
  evToEbitdaMin: string;
  evToEbitdaMax: string;
  priceToBookMin: string;
  priceToBookMax: string;
  priceToSalesMin: string;
  priceToSalesMax: string;
  revenueGrowthMin: string;
  earningsGrowthMin: string;
  fcfGrowthMin: string;
}
