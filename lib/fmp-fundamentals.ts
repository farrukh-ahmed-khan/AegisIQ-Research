/**
 * fmp-fundamentals.ts
 *
 * Fetches fundamentals from Financial Modeling Prep API (Ultimate plan)
 * and stores them into the DB via the fundamentals repository.
 * Called automatically when getFundamentalsViewModel() finds no data.
 *
 * Ultimate plan unlocks:
 *  - Annual + quarterly financials (income, balance sheet, cash flow)
 *  - Financial ratios (annual + quarterly)
 *  - Key metrics TTM
 *  - Analyst estimates (forward PE, price targets)
 *  - Global exchange coverage
 */

import {
  upsertFinancial,
  upsertRatio,
  upsertValuationMetric,
} from "./fundamentals-repository";
import type {
  UpsertFinancialInput,
  UpsertRatioInput,
  UpsertValuationMetricInput,
} from "../types/fundamentals";

const BASE = "https://financialmodelingprep.com/stable";

function apiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY is not set.");
  return key;
}

async function fmpGet<T>(path: string): Promise<T | null> {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${BASE}${path}${sep}apikey=${apiKey()}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`[fmp] ${res.status} ${path}`);
      return null;
    }
    const raw = await res.json();
    // New stable API may wrap results in { data: [...] }
    const data = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : null;
    if (!data || data.length === 0) return null;
    return data as T;
  } catch (err) {
    console.error(`[fmp] fetch error ${path}:`, err);
    return null;
  }
}

function n(v: unknown): number | null {
  if (v === null || v === undefined || v === "" || v === "None") return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function periodFromFmp(period: string): "annual" | "quarterly" {
  return period === "annual" ? "annual" : "quarterly";
}

function quarterFromPeriod(period: string): number | null {
  const map: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
  return map[period] ?? null;
}

// ─── FMP response shapes ───────────────────────────────────────────────────

interface FmpIncomeRow {
  date: string;
  period: string;
  calendarYear: string;
  revenue: unknown;
  grossProfit: unknown;
  operatingIncome: unknown;
  ebitda: unknown;
  netIncome: unknown;
  eps: unknown;
  epsdiluted: unknown;
  reportedCurrency: string;
}

interface FmpBalanceRow {
  date: string;
  period: string;
  totalAssets: unknown;
  totalLiabilities: unknown;
  totalStockholdersEquity: unknown;
  cashAndCashEquivalents: unknown;
  totalDebt: unknown;
  sharesOutstanding: unknown;
  commonStock: unknown;
}

interface FmpCashRow {
  date: string;
  period: string;
  operatingCashFlow: unknown;
  capitalExpenditure: unknown;
  freeCashFlow: unknown;
}

interface FmpRatioRow {
  date: string;
  period: string;
  calendarYear: string;
  grossProfitMargin: unknown;
  operatingProfitMargin: unknown;
  netProfitMargin: unknown;
  ebitdaMargin?: unknown;
  returnOnEquity: unknown;
  returnOnAssets: unknown;
  returnOnCapitalEmployed: unknown;
  currentRatio: unknown;
  quickRatio: unknown;
  debtEquityRatio: unknown;
  interestCoverage: unknown;
  revenueGrowth: unknown;
  netIncomeGrowth: unknown;
  freeCashFlowGrowth: unknown;
  freeCashFlowToSalesRatio?: unknown;
}

interface FmpKeyMetricRow {
  date: string;
  marketCap: unknown;
  enterpriseValue: unknown;
  peRatio: unknown;
  pegRatio: unknown;
  earningsYield: unknown;
  enterpriseValueOverEBITDA: unknown;
  evToSales: unknown;
  priceToBookRatio: unknown;
  priceToSalesRatio: unknown;
  pfcfRatio: unknown;
  dividendYield: unknown;
  bookValuePerShare: unknown;
  revenuePerShare: unknown;
}

interface FmpKeyMetricsTtmRow {
  peRatioTTM: unknown;
  pegRatioTTM: unknown;
  earningsYieldTTM: unknown;
  enterpriseValueOverEBITDATTM: unknown;
  evToSalesTTM: unknown;
  priceToBookRatioTTM: unknown;
  priceToSalesRatioTTM: unknown;
  pfcfRatioTTM: unknown;
  dividendYieldTTM: unknown;
  bookValuePerShareTTM: unknown;
  marketCapTTM?: unknown;
  enterpriseValueTTM?: unknown;
}

interface FmpAnalystEstimate {
  date: string;
  estimatedEpsAvg: unknown;
  estimatedRevenueAvg: unknown;
}

interface FmpQuoteRow {
  symbol: string;
  eps: unknown;
  pe: unknown;
  marketCap: unknown;
  price: unknown;
  priceAvg200: unknown;
}

// ─── Process one period (annual or quarterly) ──────────────────────────────

function buildFinancialInput(
  symbol: string,
  inc: FmpIncomeRow,
  bal: FmpBalanceRow | undefined,
  cash: FmpCashRow | undefined,
): UpsertFinancialInput {
  const periodType = periodFromFmp(inc.period);
  const fiscalYear = parseInt(inc.calendarYear ?? inc.date.slice(0, 4), 10);

  return {
    symbol,
    periodType,
    periodEndDate: inc.date,
    fiscalYear,
    fiscalQuarter: quarterFromPeriod(inc.period),
    currency: inc.reportedCurrency ?? "USD",
    revenue: n(inc.revenue),
    grossProfit: n(inc.grossProfit),
    operatingIncome: n(inc.operatingIncome),
    ebitda: n(inc.ebitda),
    netIncome: n(inc.netIncome),
    epsBasic: n(inc.eps),
    epsDiluted: n(inc.epsdiluted),
    totalAssets: bal ? n(bal.totalAssets) : null,
    totalLiabilities: bal ? n(bal.totalLiabilities) : null,
    totalEquity: bal ? n(bal.totalStockholdersEquity) : null,
    cashAndEquivalents: bal ? n(bal.cashAndCashEquivalents) : null,
    totalDebt: bal ? n(bal.totalDebt) : null,
    sharesOutstanding: bal ? n(bal.sharesOutstanding ?? bal.commonStock) : null,
    operatingCashFlow: cash ? n(cash.operatingCashFlow) : null,
    capitalExpenditures: cash ? n(cash.capitalExpenditure) : null,
    freeCashFlow: cash ? n(cash.freeCashFlow) : null,
    source: "fmp",
  };
}

function buildRatioInput(
  symbol: string,
  rat: FmpRatioRow,
  incPeriod: string,
  incCalendarYear: string,
): UpsertRatioInput {
  const periodType = periodFromFmp(rat.period ?? incPeriod);
  const fiscalYear = parseInt(rat.calendarYear ?? incCalendarYear ?? rat.date.slice(0, 4), 10);

  return {
    symbol,
    periodType,
    periodEndDate: rat.date,
    fiscalYear,
    fiscalQuarter: quarterFromPeriod(rat.period ?? incPeriod),
    grossMargin: n(rat.grossProfitMargin),
    operatingMargin: n(rat.operatingProfitMargin),
    netMargin: n(rat.netProfitMargin),
    ebitdaMargin: n(rat.ebitdaMargin),
    fcfMargin: n(rat.freeCashFlowToSalesRatio),
    roe: n(rat.returnOnEquity),
    roa: n(rat.returnOnAssets),
    roic: n(rat.returnOnCapitalEmployed),
    currentRatio: n(rat.currentRatio),
    quickRatio: n(rat.quickRatio),
    debtToEquity: n(rat.debtEquityRatio),
    interestCoverage: n(rat.interestCoverage),
    revenueGrowthYoy: n(rat.revenueGrowth),
    earningsGrowthYoy: n(rat.netIncomeGrowth),
    fcfGrowthYoy: n(rat.freeCashFlowGrowth),
    source: "fmp",
  };
}

// ─── Main export ───────────────────────────────────────────────────────────

export async function fetchAndStoreFundamentals(
  symbol: string,
  options: { annualOnly?: boolean } = {},
): Promise<boolean> {
  if (!process.env.FMP_API_KEY) return false;

  try {
    // Core annual calls — always fetched
    const annualCalls = Promise.all([
      fmpGet<FmpIncomeRow[]>(`/income-statement?symbol=${symbol}&period=annual&limit=8`),
      fmpGet<FmpBalanceRow[]>(`/balance-sheet-statement?symbol=${symbol}&period=annual&limit=8`),
      fmpGet<FmpCashRow[]>(`/cash-flow-statement?symbol=${symbol}&period=annual&limit=8`),
      fmpGet<FmpRatioRow[]>(`/ratios?symbol=${symbol}&period=annual&limit=8`),
      fmpGet<FmpKeyMetricRow[]>(`/key-metrics?symbol=${symbol}&period=annual&limit=1`),
      fmpGet<FmpKeyMetricsTtmRow[]>(`/key-metrics-ttm?symbol=${symbol}`),
      fmpGet<FmpAnalystEstimate[]>(`/analyst-estimates?symbol=${symbol}&limit=4`),
      fmpGet<FmpQuoteRow[]>(`/quote?symbol=${symbol}`),
    ]);

    // Quarterly calls — skipped in annualOnly / fast mode
    const quarterlyCalls = options.annualOnly
      ? Promise.resolve([null, null, null, null] as const)
      : Promise.all([
          fmpGet<FmpIncomeRow[]>(`/income-statement?symbol=${symbol}&period=quarter&limit=12`),
          fmpGet<FmpBalanceRow[]>(`/balance-sheet-statement?symbol=${symbol}&period=quarter&limit=12`),
          fmpGet<FmpCashRow[]>(`/cash-flow-statement?symbol=${symbol}&period=quarter&limit=12`),
          fmpGet<FmpRatioRow[]>(`/ratios?symbol=${symbol}&period=quarter&limit=12`),
        ]);

    const [annualResults, quarterlyResults] = await Promise.all([annualCalls, quarterlyCalls]);

    const [
      incomeAnnual, balanceAnnual, cashAnnual, ratiosAnnual,
      keyMetrics, keyMetricsTtm, analystEstimates, quote,
    ] = annualResults;

    const [incomeQuarterly, balanceQuarterly, cashQuarterly, ratiosQuarterly] = quarterlyResults;

    // Need at least annual income to proceed
    if (!incomeAnnual || incomeAnnual.length === 0) return false;

    // Build lookup maps
    const byDate = <T extends { date: string }>(arr: T[] | null) =>
      new Map((arr ?? []).map((r) => [r.date, r]));

    const balAnnualMap = byDate(balanceAnnual);
    const cashAnnualMap = byDate(cashAnnual);
    const ratAnnualMap = byDate(ratiosAnnual);
    const balQMap = byDate(balanceQuarterly);
    const cashQMap = byDate(cashQuarterly);
    const ratQMap = byDate(ratiosQuarterly);

    const ops: Promise<unknown>[] = [];

    // Annual financials + ratios
    for (const inc of incomeAnnual) {
      ops.push(
        upsertFinancial(
          buildFinancialInput(symbol, inc, balAnnualMap.get(inc.date), cashAnnualMap.get(inc.date)),
        ).catch(() => null),
      );
      const rat = ratAnnualMap.get(inc.date);
      if (rat) {
        ops.push(
          upsertRatio(buildRatioInput(symbol, rat, inc.period, inc.calendarYear)).catch(() => null),
        );
      }
    }

    // Quarterly financials + ratios
    for (const inc of incomeQuarterly ?? []) {
      ops.push(
        upsertFinancial(
          buildFinancialInput(symbol, inc, balQMap.get(inc.date), cashQMap.get(inc.date)),
        ).catch(() => null),
      );
      const rat = ratQMap.get(inc.date);
      if (rat) {
        ops.push(
          upsertRatio(buildRatioInput(symbol, rat, inc.period, inc.calendarYear)).catch(() => null),
        );
      }
    }

    // Valuation metrics — prefer TTM, fall back to latest annual key-metrics
    const ttm = keyMetricsTtm && keyMetricsTtmRow(keyMetricsTtm[0] ?? null);
    const km = keyMetrics?.[0] ?? null;
    const q = quote?.[0] ?? null;
    const latestInc = incomeAnnual[0];

    // Forward PE from analyst estimates (next fiscal year EPS vs current price)
    let forwardPe: number | null = null;
    if (analystEstimates && analystEstimates.length > 0 && q) {
      const fwdEps = n(analystEstimates[0].estimatedEpsAvg);
      const price = n(q.price);
      if (fwdEps && price && fwdEps > 0) {
        forwardPe = price / fwdEps;
      }
    }

    const valuationInput: UpsertValuationMetricInput = {
      symbol,
      asOfDate: new Date().toISOString().slice(0, 10),
      marketCap: n(q?.marketCap ?? km?.marketCap),
      enterpriseValue: n(km?.enterpriseValue),
      peRatio: n(q?.pe ?? km?.peRatio),
      forwardPe,
      pegRatio: ttm?.pegRatio ?? n(km?.pegRatio),
      earningsYield: ttm?.earningsYield ?? n(km?.earningsYield),
      evToEbitda: ttm?.evToEbitda ?? n(km?.enterpriseValueOverEBITDA),
      evToRevenue: ttm?.evToRevenue ?? n(km?.evToSales),
      priceToBook: ttm?.priceToBook ?? n(km?.priceToBookRatio),
      priceToSales: ttm?.priceToSales ?? n(km?.priceToSalesRatio),
      priceToFcf: ttm?.priceToFcf ?? n(km?.pfcfRatio),
      epsTtm: n(q?.eps),
      bookValuePerShare: ttm?.bookValuePerShare ?? n(km?.bookValuePerShare),
      revenueTtm: n(latestInc?.revenue),
      ebitdaTtm: n(latestInc?.ebitda),
      dividendYield: ttm?.dividendYield ?? n(km?.dividendYield),
      source: "fmp",
    };

    ops.push(upsertValuationMetric(valuationInput).catch(() => null));

    await Promise.all(ops);
    return true;
  } catch (err) {
    console.error(`[fmp-fundamentals] fetchAndStoreFundamentals(${symbol}) failed:`, err);
    return false;
  }
}

// Helper — pull TTM numbers into a flat object
function keyMetricsTtmRow(row: FmpKeyMetricsTtmRow | null) {
  if (!row) return null;
  return {
    pegRatio: n(row.pegRatioTTM),
    earningsYield: n(row.earningsYieldTTM),
    evToEbitda: n(row.enterpriseValueOverEBITDATTM),
    evToRevenue: n(row.evToSalesTTM),
    priceToBook: n(row.priceToBookRatioTTM),
    priceToSales: n(row.priceToSalesRatioTTM),
    priceToFcf: n(row.pfcfRatioTTM),
    dividendYield: n(row.dividendYieldTTM),
    bookValuePerShare: n(row.bookValuePerShareTTM),
  };
}
