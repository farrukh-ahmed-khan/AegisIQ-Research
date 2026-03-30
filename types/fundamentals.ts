export type PeriodType = "annual" | "quarterly";

export interface FinancialRecord {
  id: string;
  symbol: string;
  periodType: PeriodType;
  periodEndDate: string;       // ISO date string YYYY-MM-DD
  fiscalYear: number;
  fiscalQuarter: number | null;
  currency: string;

  // Income Statement
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebitda: number | null;
  netIncome: number | null;
  epsBasic: number | null;
  epsDiluted: number | null;

  // Balance Sheet
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  cashAndEquivalents: number | null;
  totalDebt: number | null;
  sharesOutstanding: number | null;

  // Cash Flow
  operatingCashFlow: number | null;
  capitalExpenditures: number | null;
  freeCashFlow: number | null;

  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RatioRecord {
  id: string;
  symbol: string;
  periodType: PeriodType;
  periodEndDate: string;
  fiscalYear: number;
  fiscalQuarter: number | null;

  // Profitability (as decimals, e.g. 0.4341 = 43.41%)
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  ebitdaMargin: number | null;
  fcfMargin: number | null;

  // Returns
  roe: number | null;
  roa: number | null;
  roic: number | null;

  // Liquidity & Leverage
  currentRatio: number | null;
  quickRatio: number | null;
  debtToEquity: number | null;
  interestCoverage: number | null;

  // Growth (YoY, as decimals)
  revenueGrowthYoy: number | null;
  earningsGrowthYoy: number | null;
  fcfGrowthYoy: number | null;

  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ValuationMetricRecord {
  id: string;
  symbol: string;
  asOfDate: string;  // ISO date string YYYY-MM-DD

  // Market Size
  marketCap: number | null;
  enterpriseValue: number | null;

  // Earnings Multiples
  peRatio: number | null;
  forwardPe: number | null;
  pegRatio: number | null;
  earningsYield: number | null;

  // EV Multiples
  evToEbitda: number | null;
  evToRevenue: number | null;

  // Price Multiples
  priceToBook: number | null;
  priceToSales: number | null;
  priceToFcf: number | null;

  // Per-Share & Yield
  epsTtm: number | null;
  bookValuePerShare: number | null;
  revenueTtm: number | null;
  ebitdaTtm: number | null;
  dividendYield: number | null;

  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FundamentalsViewModel {
  symbol: string;
  latestFinancials: FinancialRecord | null;
  latestRatios: RatioRecord | null;
  latestValuationMetrics: ValuationMetricRecord | null;
  annualFinancials: FinancialRecord[];    // last 5 years
  quarterlyFinancials: FinancialRecord[]; // last 8 quarters
  annualRatios: RatioRecord[];
}

// ─── Input types for admin seeding ─────────────────────────────────────────

export interface UpsertFinancialInput {
  symbol: string;
  periodType: PeriodType;
  periodEndDate: string;
  fiscalYear: number;
  fiscalQuarter?: number | null;
  currency?: string;
  revenue?: number | null;
  grossProfit?: number | null;
  operatingIncome?: number | null;
  ebitda?: number | null;
  netIncome?: number | null;
  epsBasic?: number | null;
  epsDiluted?: number | null;
  totalAssets?: number | null;
  totalLiabilities?: number | null;
  totalEquity?: number | null;
  cashAndEquivalents?: number | null;
  totalDebt?: number | null;
  sharesOutstanding?: number | null;
  operatingCashFlow?: number | null;
  capitalExpenditures?: number | null;
  freeCashFlow?: number | null;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertRatioInput {
  symbol: string;
  periodType: PeriodType;
  periodEndDate: string;
  fiscalYear: number;
  fiscalQuarter?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  ebitdaMargin?: number | null;
  fcfMargin?: number | null;
  roe?: number | null;
  roa?: number | null;
  roic?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;
  debtToEquity?: number | null;
  interestCoverage?: number | null;
  revenueGrowthYoy?: number | null;
  earningsGrowthYoy?: number | null;
  fcfGrowthYoy?: number | null;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertValuationMetricInput {
  symbol: string;
  asOfDate: string;
  marketCap?: number | null;
  enterpriseValue?: number | null;
  peRatio?: number | null;
  forwardPe?: number | null;
  pegRatio?: number | null;
  earningsYield?: number | null;
  evToEbitda?: number | null;
  evToRevenue?: number | null;
  priceToBook?: number | null;
  priceToSales?: number | null;
  priceToFcf?: number | null;
  epsTtm?: number | null;
  bookValuePerShare?: number | null;
  revenueTtm?: number | null;
  ebitdaTtm?: number | null;
  dividendYield?: number | null;
  source?: string;
  metadata?: Record<string, unknown>;
}
