/**
 * seed-fundamentals.ts
 *
 * Populates the financials, ratios, and valuation_metrics tables with
 * realistic sample data for a set of high-coverage symbols.
 *
 * Run:
 *   npx tsx scripts/seed-fundamentals.ts
 *
 * Requires DATABASE_URL in environment (via .env).
 */

import "dotenv/config";
import {
  bulkUpsertFundamentals,
} from "../lib/fundamentals-repository";
import type {
  UpsertFinancialInput,
  UpsertRatioInput,
  UpsertValuationMetricInput,
} from "../types/fundamentals";

// ─── Sample data ─────────────────────────────────────────────────────────────

const financials: UpsertFinancialInput[] = [
  // ── AAPL  ────────────────────────────────────────────────────────────────
  {
    symbol: "AAPL", periodType: "annual", periodEndDate: "2024-09-30",
    fiscalYear: 2024, currency: "USD",
    revenue: 391035_000_000, grossProfit: 180683_000_000,
    operatingIncome: 123216_000_000, ebitda: 134661_000_000,
    netIncome: 93736_000_000, epsBasic: 6.11, epsDiluted: 6.08,
    totalAssets: 364980_000_000, totalLiabilities: 308030_000_000,
    totalEquity: 56950_000_000, cashAndEquivalents: 29943_000_000,
    totalDebt: 101304_000_000, sharesOutstanding: 15343_000_000,
    operatingCashFlow: 118254_000_000, capitalExpenditures: -9447_000_000,
    freeCashFlow: 108807_000_000, source: "seed",
  },
  {
    symbol: "AAPL", periodType: "annual", periodEndDate: "2023-09-30",
    fiscalYear: 2023, currency: "USD",
    revenue: 383285_000_000, grossProfit: 169148_000_000,
    operatingIncome: 114301_000_000, ebitda: 123503_000_000,
    netIncome: 96995_000_000, epsBasic: 6.16, epsDiluted: 6.13,
    totalAssets: 352583_000_000, totalLiabilities: 290437_000_000,
    totalEquity: 62146_000_000, cashAndEquivalents: 29965_000_000,
    totalDebt: 109280_000_000, sharesOutstanding: 15744_000_000,
    operatingCashFlow: 110543_000_000, capitalExpenditures: -10959_000_000,
    freeCashFlow: 99584_000_000, source: "seed",
  },
  {
    symbol: "AAPL", periodType: "annual", periodEndDate: "2022-09-30",
    fiscalYear: 2022, currency: "USD",
    revenue: 394328_000_000, grossProfit: 170782_000_000,
    operatingIncome: 119437_000_000, ebitda: 130541_000_000,
    netIncome: 99803_000_000, epsBasic: 6.15, epsDiluted: 6.11,
    totalAssets: 352755_000_000, totalLiabilities: 302083_000_000,
    totalEquity: 50672_000_000, cashAndEquivalents: 23646_000_000,
    totalDebt: 120069_000_000, sharesOutstanding: 16215_000_000,
    operatingCashFlow: 122151_000_000, capitalExpenditures: -10708_000_000,
    freeCashFlow: 111443_000_000, source: "seed",
  },

  // ── MSFT ─────────────────────────────────────────────────────────────────
  {
    symbol: "MSFT", periodType: "annual", periodEndDate: "2024-06-30",
    fiscalYear: 2024, currency: "USD",
    revenue: 245122_000_000, grossProfit: 183270_000_000,
    operatingIncome: 109433_000_000, ebitda: 134042_000_000,
    netIncome: 88136_000_000, epsBasic: 11.86, epsDiluted: 11.80,
    totalAssets: 512163_000_000, totalLiabilities: 243687_000_000,
    totalEquity: 268476_000_000, cashAndEquivalents: 18315_000_000,
    totalDebt: 89023_000_000, sharesOutstanding: 7433_000_000,
    operatingCashFlow: 118548_000_000, capitalExpenditures: -44482_000_000,
    freeCashFlow: 74066_000_000, source: "seed",
  },
  {
    symbol: "MSFT", periodType: "annual", periodEndDate: "2023-06-30",
    fiscalYear: 2023, currency: "USD",
    revenue: 211915_000_000, grossProfit: 146052_000_000,
    operatingIncome: 88523_000_000, ebitda: 106985_000_000,
    netIncome: 72361_000_000, epsBasic: 9.72, epsDiluted: 9.65,
    totalAssets: 411976_000_000, totalLiabilities: 205753_000_000,
    totalEquity: 206223_000_000, cashAndEquivalents: 34704_000_000,
    totalDebt: 79559_000_000, sharesOutstanding: 7446_000_000,
    operatingCashFlow: 87582_000_000, capitalExpenditures: -28107_000_000,
    freeCashFlow: 59475_000_000, source: "seed",
  },

  // ── NVDA ─────────────────────────────────────────────────────────────────
  {
    symbol: "NVDA", periodType: "annual", periodEndDate: "2025-01-31",
    fiscalYear: 2025, currency: "USD",
    revenue: 130497_000_000, grossProfit: 97898_000_000,
    operatingIncome: 81302_000_000, ebitda: 84056_000_000,
    netIncome: 72880_000_000, epsBasic: 2.99, epsDiluted: 2.94,
    totalAssets: 111601_000_000, totalLiabilities: 30138_000_000,
    totalEquity: 81463_000_000, cashAndEquivalents: 8589_000_000,
    totalDebt: 8461_000_000, sharesOutstanding: 24399_000_000,
    operatingCashFlow: 64090_000_000, capitalExpenditures: -3046_000_000,
    freeCashFlow: 61044_000_000, source: "seed",
  },
  {
    symbol: "NVDA", periodType: "annual", periodEndDate: "2024-01-31",
    fiscalYear: 2024, currency: "USD",
    revenue: 60922_000_000, grossProfit: 44301_000_000,
    operatingIncome: 32972_000_000, ebitda: 34136_000_000,
    netIncome: 29760_000_000, epsBasic: 1.21, epsDiluted: 1.19,
    totalAssets: 65728_000_000, totalLiabilities: 22570_000_000,
    totalEquity: 43158_000_000, cashAndEquivalents: 7280_000_000,
    totalDebt: 8458_000_000, sharesOutstanding: 24580_000_000,
    operatingCashFlow: 28083_000_000, capitalExpenditures: -1069_000_000,
    freeCashFlow: 27014_000_000, source: "seed",
  },

  // ── GOOGL ─────────────────────────────────────────────────────────────────
  {
    symbol: "GOOGL", periodType: "annual", periodEndDate: "2024-12-31",
    fiscalYear: 2024, currency: "USD",
    revenue: 350018_000_000, grossProfit: 222541_000_000,
    operatingIncome: 112388_000_000, ebitda: 134752_000_000,
    netIncome: 100118_000_000, epsBasic: 7.97, epsDiluted: 7.90,
    totalAssets: 450256_000_000, totalLiabilities: 127876_000_000,
    totalEquity: 322380_000_000, cashAndEquivalents: 30707_000_000,
    totalDebt: 28374_000_000, sharesOutstanding: 12568_000_000,
    operatingCashFlow: 125284_000_000, capitalExpenditures: -52241_000_000,
    freeCashFlow: 73043_000_000, source: "seed",
  },

  // ── AMZN ─────────────────────────────────────────────────────────────────
  {
    symbol: "AMZN", periodType: "annual", periodEndDate: "2024-12-31",
    fiscalYear: 2024, currency: "USD",
    revenue: 637959_000_000, grossProfit: 293176_000_000,
    operatingIncome: 68593_000_000, ebitda: 131447_000_000,
    netIncome: 59248_000_000, epsBasic: 5.56, epsDiluted: 5.53,
    totalAssets: 624894_000_000, totalLiabilities: 366685_000_000,
    totalEquity: 258209_000_000, cashAndEquivalents: 78997_000_000,
    totalDebt: 157834_000_000, sharesOutstanding: 10660_000_000,
    operatingCashFlow: 115881_000_000, capitalExpenditures: -77416_000_000,
    freeCashFlow: 38465_000_000, source: "seed",
  },

  // ── META ─────────────────────────────────────────────────────────────────
  {
    symbol: "META", periodType: "annual", periodEndDate: "2024-12-31",
    fiscalYear: 2024, currency: "USD",
    revenue: 164501_000_000, grossProfit: 131248_000_000,
    operatingIncome: 68986_000_000, ebitda: 78242_000_000,
    netIncome: 62360_000_000, epsBasic: 24.53, epsDiluted: 23.86,
    totalAssets: 276054_000_000, totalLiabilities: 84553_000_000,
    totalEquity: 191501_000_000, cashAndEquivalents: 43752_000_000,
    totalDebt: 28825_000_000, sharesOutstanding: 2541_000_000,
    operatingCashFlow: 91651_000_000, capitalExpenditures: -38963_000_000,
    freeCashFlow: 52688_000_000, source: "seed",
  },
];

const ratios: UpsertRatioInput[] = [
  // ── AAPL ─────────────────────────────────────────────────────────────────
  {
    symbol: "AAPL", periodType: "annual", periodEndDate: "2024-09-30",
    fiscalYear: 2024,
    grossMargin: 0.4621, operatingMargin: 0.3151, netMargin: 0.2398,
    ebitdaMargin: 0.3443, fcfMargin: 0.2783,
    roe: 1.6459, roa: 0.2567, roic: 0.6487,
    currentRatio: 0.87, quickRatio: 0.82, debtToEquity: 1.779,
    interestCoverage: 29.6,
    revenueGrowthYoy: 0.0202, earningsGrowthYoy: -0.0336, fcfGrowthYoy: 0.0924,
    source: "seed",
  },
  {
    symbol: "AAPL", periodType: "annual", periodEndDate: "2023-09-30",
    fiscalYear: 2023,
    grossMargin: 0.4413, operatingMargin: 0.2982, netMargin: 0.2531,
    ebitdaMargin: 0.3222, fcfMargin: 0.2598,
    roe: 1.5607, roa: 0.2751, roic: 0.5634,
    currentRatio: 0.99, quickRatio: 0.94, debtToEquity: 1.759,
    interestCoverage: 27.4,
    revenueGrowthYoy: -0.0273, earningsGrowthYoy: 0.0285, fcfGrowthYoy: 0.1124,
    source: "seed",
  },

  // ── MSFT ─────────────────────────────────────────────────────────────────
  {
    symbol: "MSFT", periodType: "annual", periodEndDate: "2024-06-30",
    fiscalYear: 2024,
    grossMargin: 0.7477, operatingMargin: 0.4464, netMargin: 0.3595,
    ebitdaMargin: 0.5468, fcfMargin: 0.3021,
    roe: 0.3283, roa: 0.1720, roic: 0.2716,
    currentRatio: 1.30, quickRatio: 1.28, debtToEquity: 0.332,
    interestCoverage: 46.8,
    revenueGrowthYoy: 0.1566, earningsGrowthYoy: 0.2184, fcfGrowthYoy: 0.2452,
    source: "seed",
  },

  // ── NVDA ─────────────────────────────────────────────────────────────────
  {
    symbol: "NVDA", periodType: "annual", periodEndDate: "2025-01-31",
    fiscalYear: 2025,
    grossMargin: 0.7503, operatingMargin: 0.6230, netMargin: 0.5586,
    ebitdaMargin: 0.6442, fcfMargin: 0.4679,
    roe: 0.8945, roa: 0.6531, roic: 0.8123,
    currentRatio: 4.17, quickRatio: 3.79, debtToEquity: 0.104,
    interestCoverage: 87.2,
    revenueGrowthYoy: 1.1424, earningsGrowthYoy: 1.4490, fcfGrowthYoy: 1.2597,
    source: "seed",
  },

  // ── GOOGL ─────────────────────────────────────────────────────────────────
  {
    symbol: "GOOGL", periodType: "annual", periodEndDate: "2024-12-31",
    fiscalYear: 2024,
    grossMargin: 0.6358, operatingMargin: 0.3211, netMargin: 0.2861,
    ebitdaMargin: 0.3850, fcfMargin: 0.2087,
    roe: 0.3106, roa: 0.2225, roic: 0.2847,
    currentRatio: 2.05, quickRatio: 1.92, debtToEquity: 0.088,
    interestCoverage: 52.4,
    revenueGrowthYoy: 0.1388, earningsGrowthYoy: 0.3541, fcfGrowthYoy: 0.2813,
    source: "seed",
  },

  // ── AMZN ─────────────────────────────────────────────────────────────────
  {
    symbol: "AMZN", periodType: "annual", periodEndDate: "2024-12-31",
    fiscalYear: 2024,
    grossMargin: 0.4597, operatingMargin: 0.1075, netMargin: 0.0929,
    ebitdaMargin: 0.2061, fcfMargin: 0.0603,
    roe: 0.2294, roa: 0.0948, roic: 0.1543,
    currentRatio: 1.14, quickRatio: 0.87, debtToEquity: 0.611,
    interestCoverage: 13.1,
    revenueGrowthYoy: 0.1104, earningsGrowthYoy: 0.9480, fcfGrowthYoy: 0.7832,
    source: "seed",
  },

  // ── META ─────────────────────────────────────────────────────────────────
  {
    symbol: "META", periodType: "annual", periodEndDate: "2024-12-31",
    fiscalYear: 2024,
    grossMargin: 0.7978, operatingMargin: 0.4194, netMargin: 0.3790,
    ebitdaMargin: 0.4757, fcfMargin: 0.3203,
    roe: 0.3257, roa: 0.2259, roic: 0.3144,
    currentRatio: 2.73, quickRatio: 2.63, debtToEquity: 0.151,
    interestCoverage: 58.3,
    revenueGrowthYoy: 0.2149, earningsGrowthYoy: 0.5939, fcfGrowthYoy: 0.3985,
    source: "seed",
  },
];

const valuationMetrics: UpsertValuationMetricInput[] = [
  {
    symbol: "AAPL", asOfDate: "2026-03-25",
    marketCap: 3_220_000_000_000, enterpriseValue: 3_290_000_000_000,
    peRatio: 34.35, forwardPe: 30.12, pegRatio: 2.84, earningsYield: 0.0291,
    evToEbitda: 24.43, evToRevenue: 8.41,
    priceToBook: 56.54, priceToSales: 8.23, priceToFcf: 29.59,
    epsTtm: 6.08, bookValuePerShare: 3.71, revenueTtm: 391_035_000_000,
    ebitdaTtm: 134_661_000_000, dividendYield: 0.0046, source: "seed",
  },
  {
    symbol: "MSFT", asOfDate: "2026-03-25",
    marketCap: 2_970_000_000_000, enterpriseValue: 3_040_000_000_000,
    peRatio: 33.70, forwardPe: 29.45, pegRatio: 2.12, earningsYield: 0.0297,
    evToEbitda: 22.68, evToRevenue: 12.40,
    priceToBook: 11.07, priceToSales: 12.12, priceToFcf: 40.10,
    epsTtm: 11.80, bookValuePerShare: 36.13, revenueTtm: 245_122_000_000,
    ebitdaTtm: 134_042_000_000, dividendYield: 0.0073, source: "seed",
  },
  {
    symbol: "NVDA", asOfDate: "2026-03-25",
    marketCap: 2_680_000_000_000, enterpriseValue: 2_690_000_000_000,
    peRatio: 36.77, forwardPe: 28.42, pegRatio: 1.09, earningsYield: 0.0272,
    evToEbitda: 31.99, evToRevenue: 20.61,
    priceToBook: 32.91, priceToSales: 20.55, priceToFcf: 43.91,
    epsTtm: 2.94, bookValuePerShare: 3.33, revenueTtm: 130_497_000_000,
    ebitdaTtm: 84_056_000_000, dividendYield: 0.0003, source: "seed",
  },
  {
    symbol: "GOOGL", asOfDate: "2026-03-25",
    marketCap: 1_900_000_000_000, enterpriseValue: 1_890_000_000_000,
    peRatio: 18.97, forwardPe: 16.32, pegRatio: 1.05, earningsYield: 0.0527,
    evToEbitda: 14.02, evToRevenue: 5.40,
    priceToBook: 5.89, priceToSales: 5.43, priceToFcf: 26.01,
    epsTtm: 7.90, bookValuePerShare: 25.65, revenueTtm: 350_018_000_000,
    ebitdaTtm: 134_752_000_000, dividendYield: 0.0000, source: "seed",
  },
  {
    symbol: "AMZN", asOfDate: "2026-03-25",
    marketCap: 2_020_000_000_000, enterpriseValue: 2_100_000_000_000,
    peRatio: 34.09, forwardPe: 27.84, pegRatio: 1.34, earningsYield: 0.0293,
    evToEbitda: 15.98, evToRevenue: 3.29,
    priceToBook: 7.82, priceToSales: 3.17, priceToFcf: 52.52,
    epsTtm: 5.53, bookValuePerShare: 24.22, revenueTtm: 637_959_000_000,
    ebitdaTtm: 131_447_000_000, dividendYield: 0.0000, source: "seed",
  },
  {
    symbol: "META", asOfDate: "2026-03-25",
    marketCap: 1_380_000_000_000, enterpriseValue: 1_360_000_000_000,
    peRatio: 22.14, forwardPe: 19.87, pegRatio: 1.43, earningsYield: 0.0452,
    evToEbitda: 17.38, evToRevenue: 8.27,
    priceToBook: 7.21, priceToSales: 8.39, priceToFcf: 26.19,
    epsTtm: 23.86, bookValuePerShare: 75.29, revenueTtm: 164_501_000_000,
    ebitdaTtm: 78_242_000_000, dividendYield: 0.0000, source: "seed",
  },
];

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding fundamentals data…");

  const result = await bulkUpsertFundamentals({
    financials,
    ratios,
    valuationMetrics,
  });

  console.log("Done:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
