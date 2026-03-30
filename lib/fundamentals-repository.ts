import { sql } from "./db";
import type {
  FinancialRecord,
  FundamentalsViewModel,
  PeriodType,
  RatioRecord,
  UpsertFinancialInput,
  UpsertRatioInput,
  UpsertValuationMetricInput,
  ValuationMetricRecord,
} from "../types/fundamentals";

// ─────────────────────────────────────────────────────────────────────────────
// Schema bootstrap (idempotent – runs once per process)
// ─────────────────────────────────────────────────────────────────────────────

let schemaReadyPromise: Promise<void> | null = null;

async function ensureFundamentalsSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

      await sql`
        CREATE TABLE IF NOT EXISTS financials (
          id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol           text        NOT NULL,
          period_type      text        NOT NULL DEFAULT 'annual',
          period_end_date  date        NOT NULL,
          fiscal_year      integer     NOT NULL,
          fiscal_quarter   integer,
          currency         text        NOT NULL DEFAULT 'USD',
          revenue                numeric(22,4),
          gross_profit           numeric(22,4),
          operating_income       numeric(22,4),
          ebitda                 numeric(22,4),
          net_income             numeric(22,4),
          eps_basic              numeric(14,6),
          eps_diluted            numeric(14,6),
          total_assets           numeric(22,4),
          total_liabilities      numeric(22,4),
          total_equity           numeric(22,4),
          cash_and_equivalents   numeric(22,4),
          total_debt             numeric(22,4),
          shares_outstanding     numeric(22,4),
          operating_cash_flow    numeric(22,4),
          capital_expenditures   numeric(22,4),
          free_cash_flow         numeric(22,4),
          source                 text        NOT NULL DEFAULT 'manual',
          metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
          created_at             timestamptz NOT NULL DEFAULT now(),
          updated_at             timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT financials_unique_period UNIQUE (symbol, period_type, period_end_date)
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS ratios (
          id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol           text        NOT NULL,
          period_type      text        NOT NULL DEFAULT 'annual',
          period_end_date  date        NOT NULL,
          fiscal_year      integer     NOT NULL,
          fiscal_quarter   integer,
          gross_margin           numeric(10,6),
          operating_margin       numeric(10,6),
          net_margin             numeric(10,6),
          ebitda_margin          numeric(10,6),
          fcf_margin             numeric(10,6),
          roe                    numeric(10,6),
          roa                    numeric(10,6),
          roic                   numeric(10,6),
          current_ratio          numeric(10,4),
          quick_ratio            numeric(10,4),
          debt_to_equity         numeric(10,4),
          interest_coverage      numeric(10,4),
          revenue_growth_yoy     numeric(10,6),
          earnings_growth_yoy    numeric(10,6),
          fcf_growth_yoy         numeric(10,6),
          source                 text        NOT NULL DEFAULT 'manual',
          metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
          created_at             timestamptz NOT NULL DEFAULT now(),
          updated_at             timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT ratios_unique_period UNIQUE (symbol, period_type, period_end_date)
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS valuation_metrics (
          id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
          symbol           text        NOT NULL,
          as_of_date       date        NOT NULL,
          market_cap             numeric(22,4),
          enterprise_value       numeric(22,4),
          pe_ratio               numeric(14,4),
          forward_pe             numeric(14,4),
          peg_ratio              numeric(14,4),
          earnings_yield         numeric(10,6),
          ev_to_ebitda           numeric(14,4),
          ev_to_revenue          numeric(14,4),
          price_to_book          numeric(14,4),
          price_to_sales         numeric(14,4),
          price_to_fcf           numeric(14,4),
          eps_ttm                numeric(14,6),
          book_value_per_share   numeric(14,6),
          revenue_ttm            numeric(22,4),
          ebitda_ttm             numeric(22,4),
          dividend_yield         numeric(10,6),
          source                 text        NOT NULL DEFAULT 'manual',
          metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
          created_at             timestamptz NOT NULL DEFAULT now(),
          updated_at             timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT valuation_metrics_unique_date UNIQUE (symbol, as_of_date)
        )
      `;
    })();
  }

  return schemaReadyPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeSymbol(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,12}$/.test(s)) throw new Error("Invalid symbol.");
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mappers
// ─────────────────────────────────────────────────────────────────────────────

function mapFinancial(row: Record<string, unknown>): FinancialRecord {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    periodType: String(row.period_type) as PeriodType,
    periodEndDate: String(row.period_end_date).slice(0, 10),
    fiscalYear: Number(row.fiscal_year),
    fiscalQuarter: asNumberOrNull(row.fiscal_quarter),
    currency: String(row.currency ?? "USD"),
    revenue: asNumberOrNull(row.revenue),
    grossProfit: asNumberOrNull(row.gross_profit),
    operatingIncome: asNumberOrNull(row.operating_income),
    ebitda: asNumberOrNull(row.ebitda),
    netIncome: asNumberOrNull(row.net_income),
    epsBasic: asNumberOrNull(row.eps_basic),
    epsDiluted: asNumberOrNull(row.eps_diluted),
    totalAssets: asNumberOrNull(row.total_assets),
    totalLiabilities: asNumberOrNull(row.total_liabilities),
    totalEquity: asNumberOrNull(row.total_equity),
    cashAndEquivalents: asNumberOrNull(row.cash_and_equivalents),
    totalDebt: asNumberOrNull(row.total_debt),
    sharesOutstanding: asNumberOrNull(row.shares_outstanding),
    operatingCashFlow: asNumberOrNull(row.operating_cash_flow),
    capitalExpenditures: asNumberOrNull(row.capital_expenditures),
    freeCashFlow: asNumberOrNull(row.free_cash_flow),
    source: String(row.source ?? "manual"),
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRatio(row: Record<string, unknown>): RatioRecord {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    periodType: String(row.period_type) as PeriodType,
    periodEndDate: String(row.period_end_date).slice(0, 10),
    fiscalYear: Number(row.fiscal_year),
    fiscalQuarter: asNumberOrNull(row.fiscal_quarter),
    grossMargin: asNumberOrNull(row.gross_margin),
    operatingMargin: asNumberOrNull(row.operating_margin),
    netMargin: asNumberOrNull(row.net_margin),
    ebitdaMargin: asNumberOrNull(row.ebitda_margin),
    fcfMargin: asNumberOrNull(row.fcf_margin),
    roe: asNumberOrNull(row.roe),
    roa: asNumberOrNull(row.roa),
    roic: asNumberOrNull(row.roic),
    currentRatio: asNumberOrNull(row.current_ratio),
    quickRatio: asNumberOrNull(row.quick_ratio),
    debtToEquity: asNumberOrNull(row.debt_to_equity),
    interestCoverage: asNumberOrNull(row.interest_coverage),
    revenueGrowthYoy: asNumberOrNull(row.revenue_growth_yoy),
    earningsGrowthYoy: asNumberOrNull(row.earnings_growth_yoy),
    fcfGrowthYoy: asNumberOrNull(row.fcf_growth_yoy),
    source: String(row.source ?? "manual"),
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapValuationMetric(row: Record<string, unknown>): ValuationMetricRecord {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    asOfDate: String(row.as_of_date).slice(0, 10),
    marketCap: asNumberOrNull(row.market_cap),
    enterpriseValue: asNumberOrNull(row.enterprise_value),
    peRatio: asNumberOrNull(row.pe_ratio),
    forwardPe: asNumberOrNull(row.forward_pe),
    pegRatio: asNumberOrNull(row.peg_ratio),
    earningsYield: asNumberOrNull(row.earnings_yield),
    evToEbitda: asNumberOrNull(row.ev_to_ebitda),
    evToRevenue: asNumberOrNull(row.ev_to_revenue),
    priceToBook: asNumberOrNull(row.price_to_book),
    priceToSales: asNumberOrNull(row.price_to_sales),
    priceToFcf: asNumberOrNull(row.price_to_fcf),
    epsTtm: asNumberOrNull(row.eps_ttm),
    bookValuePerShare: asNumberOrNull(row.book_value_per_share),
    revenueTtm: asNumberOrNull(row.revenue_ttm),
    ebitdaTtm: asNumberOrNull(row.ebitda_ttm),
    dividendYield: asNumberOrNull(row.dividend_yield),
    source: String(row.source ?? "manual"),
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Read queries
// ─────────────────────────────────────────────────────────────────────────────

async function queryFundamentalsFromDb(symbol: string) {
  const [annualFinRows, quarterlyFinRows, annualRatioRows, valMetricRows] =
    await Promise.all([
      sql<Record<string, unknown>[]>`
        SELECT * FROM financials
        WHERE symbol = ${symbol} AND period_type = 'annual'
        ORDER BY period_end_date DESC
        LIMIT 5
      `,
      sql<Record<string, unknown>[]>`
        SELECT * FROM financials
        WHERE symbol = ${symbol} AND period_type = 'quarterly'
        ORDER BY period_end_date DESC
        LIMIT 8
      `,
      sql<Record<string, unknown>[]>`
        SELECT * FROM ratios
        WHERE symbol = ${symbol} AND period_type = 'annual'
        ORDER BY period_end_date DESC
        LIMIT 5
      `,
      sql<Record<string, unknown>[]>`
        SELECT * FROM valuation_metrics
        WHERE symbol = ${symbol}
        ORDER BY as_of_date DESC
        LIMIT 1
      `,
    ]);

  return { annualFinRows, quarterlyFinRows, annualRatioRows, valMetricRows };
}

export async function getFundamentalsViewModel(
  rawSymbol: string,
): Promise<FundamentalsViewModel> {
  await ensureFundamentalsSchema();
  const symbol = normalizeSymbol(rawSymbol);

  let dbData = await queryFundamentalsFromDb(symbol);

  // Auto-fetch from FMP when no data exists in the DB
  if (dbData.annualFinRows.length === 0 && process.env.FMP_API_KEY) {
    try {
      const { fetchAndStoreFundamentals } = await import("./fmp-fundamentals");
      const fetched = await fetchAndStoreFundamentals(symbol);
      if (fetched) {
        dbData = await queryFundamentalsFromDb(symbol);
      }
    } catch (err) {
      console.error(`[fundamentals] auto-fetch failed for ${symbol}:`, err);
    }
  }

  const { annualFinRows, quarterlyFinRows, annualRatioRows, valMetricRows } = dbData;

  const annualFinancials = annualFinRows.map(mapFinancial);
  const quarterlyFinancials = quarterlyFinRows.map(mapFinancial);
  const annualRatios = annualRatioRows.map(mapRatio);
  const latestValuationMetrics =
    valMetricRows.length > 0 ? mapValuationMetric(valMetricRows[0]) : null;

  // Derive latest ratios from the most recent annual period that also has ratio data
  const latestRatios = annualRatios[0] ?? null;

  // If we don't have stored ratios, fall back to computing from financials
  const computedRatios = latestRatios ?? deriveRatios(annualFinancials[0] ?? null);

  return {
    symbol,
    latestFinancials: annualFinancials[0] ?? null,
    latestRatios: computedRatios,
    latestValuationMetrics,
    annualFinancials,
    quarterlyFinancials,
    annualRatios,
  };
}

/** Derive basic ratios on the fly from a financial record when no stored ratios exist. */
function deriveRatios(fin: FinancialRecord | null): RatioRecord | null {
  if (!fin) return null;

  const pct = (a: number | null, b: number | null): number | null => {
    if (a === null || b === null || b === 0) return null;
    return a / b;
  };

  return {
    id: "derived",
    symbol: fin.symbol,
    periodType: fin.periodType,
    periodEndDate: fin.periodEndDate,
    fiscalYear: fin.fiscalYear,
    fiscalQuarter: fin.fiscalQuarter,
    grossMargin: pct(fin.grossProfit, fin.revenue),
    operatingMargin: pct(fin.operatingIncome, fin.revenue),
    netMargin: pct(fin.netIncome, fin.revenue),
    ebitdaMargin: pct(fin.ebitda, fin.revenue),
    fcfMargin: pct(fin.freeCashFlow, fin.revenue),
    roe: pct(fin.netIncome, fin.totalEquity),
    roa: pct(fin.netIncome, fin.totalAssets),
    roic: null,
    currentRatio: null,
    quickRatio: null,
    debtToEquity: pct(fin.totalDebt, fin.totalEquity),
    interestCoverage: null,
    revenueGrowthYoy: null,
    earningsGrowthYoy: null,
    fcfGrowthYoy: null,
    source: "derived",
    metadata: {},
    createdAt: fin.createdAt,
    updatedAt: fin.updatedAt,
  };
}

export async function getFinancials(
  rawSymbol: string,
  periodType?: PeriodType,
  limit = 20,
): Promise<FinancialRecord[]> {
  await ensureFundamentalsSchema();
  const symbol = normalizeSymbol(rawSymbol);

  const rows = periodType
    ? await sql<Record<string, unknown>[]>`
        SELECT * FROM financials
        WHERE symbol = ${symbol} AND period_type = ${periodType}
        ORDER BY period_end_date DESC
        LIMIT ${Math.min(limit, 40)}
      `
    : await sql<Record<string, unknown>[]>`
        SELECT * FROM financials
        WHERE symbol = ${symbol}
        ORDER BY period_end_date DESC
        LIMIT ${Math.min(limit, 40)}
      `;

  return rows.map(mapFinancial);
}

export async function getRatios(
  rawSymbol: string,
  periodType?: PeriodType,
  limit = 20,
): Promise<RatioRecord[]> {
  await ensureFundamentalsSchema();
  const symbol = normalizeSymbol(rawSymbol);

  const rows = periodType
    ? await sql<Record<string, unknown>[]>`
        SELECT * FROM ratios
        WHERE symbol = ${symbol} AND period_type = ${periodType}
        ORDER BY period_end_date DESC
        LIMIT ${Math.min(limit, 40)}
      `
    : await sql<Record<string, unknown>[]>`
        SELECT * FROM ratios
        WHERE symbol = ${symbol}
        ORDER BY period_end_date DESC
        LIMIT ${Math.min(limit, 40)}
      `;

  return rows.map(mapRatio);
}

export async function getValuationMetrics(
  rawSymbol: string,
  limit = 12,
): Promise<ValuationMetricRecord[]> {
  await ensureFundamentalsSchema();
  const symbol = normalizeSymbol(rawSymbol);

  const rows = await sql<Record<string, unknown>[]>`
    SELECT * FROM valuation_metrics
    WHERE symbol = ${symbol}
    ORDER BY as_of_date DESC
    LIMIT ${Math.min(limit, 40)}
  `;

  return rows.map(mapValuationMetric);
}

// ─────────────────────────────────────────────────────────────────────────────
// Write queries (admin / seeding)
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertFinancial(
  input: UpsertFinancialInput,
): Promise<FinancialRecord> {
  await ensureFundamentalsSchema();
  const symbol = normalizeSymbol(input.symbol);

  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO financials (
      symbol, period_type, period_end_date, fiscal_year, fiscal_quarter, currency,
      revenue, gross_profit, operating_income, ebitda, net_income, eps_basic, eps_diluted,
      total_assets, total_liabilities, total_equity, cash_and_equivalents, total_debt,
      shares_outstanding, operating_cash_flow, capital_expenditures, free_cash_flow,
      source, metadata
    )
    VALUES (
      ${symbol},
      ${input.periodType},
      ${input.periodEndDate}::date,
      ${input.fiscalYear},
      ${input.fiscalQuarter ?? null},
      ${input.currency ?? "USD"},
      ${input.revenue ?? null},
      ${input.grossProfit ?? null},
      ${input.operatingIncome ?? null},
      ${input.ebitda ?? null},
      ${input.netIncome ?? null},
      ${input.epsBasic ?? null},
      ${input.epsDiluted ?? null},
      ${input.totalAssets ?? null},
      ${input.totalLiabilities ?? null},
      ${input.totalEquity ?? null},
      ${input.cashAndEquivalents ?? null},
      ${input.totalDebt ?? null},
      ${input.sharesOutstanding ?? null},
      ${input.operatingCashFlow ?? null},
      ${input.capitalExpenditures ?? null},
      ${input.freeCashFlow ?? null},
      ${input.source ?? "manual"},
      ${sql.json((input.metadata ?? {}) as never)}
    )
    ON CONFLICT (symbol, period_type, period_end_date)
    DO UPDATE SET
      fiscal_year           = EXCLUDED.fiscal_year,
      fiscal_quarter        = EXCLUDED.fiscal_quarter,
      currency              = EXCLUDED.currency,
      revenue               = EXCLUDED.revenue,
      gross_profit          = EXCLUDED.gross_profit,
      operating_income      = EXCLUDED.operating_income,
      ebitda                = EXCLUDED.ebitda,
      net_income            = EXCLUDED.net_income,
      eps_basic             = EXCLUDED.eps_basic,
      eps_diluted           = EXCLUDED.eps_diluted,
      total_assets          = EXCLUDED.total_assets,
      total_liabilities     = EXCLUDED.total_liabilities,
      total_equity          = EXCLUDED.total_equity,
      cash_and_equivalents  = EXCLUDED.cash_and_equivalents,
      total_debt            = EXCLUDED.total_debt,
      shares_outstanding    = EXCLUDED.shares_outstanding,
      operating_cash_flow   = EXCLUDED.operating_cash_flow,
      capital_expenditures  = EXCLUDED.capital_expenditures,
      free_cash_flow        = EXCLUDED.free_cash_flow,
      source                = EXCLUDED.source,
      metadata              = EXCLUDED.metadata,
      updated_at            = now()
    RETURNING *
  `;

  return mapFinancial(rows[0]);
}

export async function upsertRatio(
  input: UpsertRatioInput,
): Promise<RatioRecord> {
  await ensureFundamentalsSchema();
  const symbol = normalizeSymbol(input.symbol);

  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO ratios (
      symbol, period_type, period_end_date, fiscal_year, fiscal_quarter,
      gross_margin, operating_margin, net_margin, ebitda_margin, fcf_margin,
      roe, roa, roic, current_ratio, quick_ratio, debt_to_equity, interest_coverage,
      revenue_growth_yoy, earnings_growth_yoy, fcf_growth_yoy,
      source, metadata
    )
    VALUES (
      ${symbol},
      ${input.periodType},
      ${input.periodEndDate}::date,
      ${input.fiscalYear},
      ${input.fiscalQuarter ?? null},
      ${input.grossMargin ?? null},
      ${input.operatingMargin ?? null},
      ${input.netMargin ?? null},
      ${input.ebitdaMargin ?? null},
      ${input.fcfMargin ?? null},
      ${input.roe ?? null},
      ${input.roa ?? null},
      ${input.roic ?? null},
      ${input.currentRatio ?? null},
      ${input.quickRatio ?? null},
      ${input.debtToEquity ?? null},
      ${input.interestCoverage ?? null},
      ${input.revenueGrowthYoy ?? null},
      ${input.earningsGrowthYoy ?? null},
      ${input.fcfGrowthYoy ?? null},
      ${input.source ?? "manual"},
      ${sql.json((input.metadata ?? {}) as never)}
    )
    ON CONFLICT (symbol, period_type, period_end_date)
    DO UPDATE SET
      gross_margin        = EXCLUDED.gross_margin,
      operating_margin    = EXCLUDED.operating_margin,
      net_margin          = EXCLUDED.net_margin,
      ebitda_margin       = EXCLUDED.ebitda_margin,
      fcf_margin          = EXCLUDED.fcf_margin,
      roe                 = EXCLUDED.roe,
      roa                 = EXCLUDED.roa,
      roic                = EXCLUDED.roic,
      current_ratio       = EXCLUDED.current_ratio,
      quick_ratio         = EXCLUDED.quick_ratio,
      debt_to_equity      = EXCLUDED.debt_to_equity,
      interest_coverage   = EXCLUDED.interest_coverage,
      revenue_growth_yoy  = EXCLUDED.revenue_growth_yoy,
      earnings_growth_yoy = EXCLUDED.earnings_growth_yoy,
      fcf_growth_yoy      = EXCLUDED.fcf_growth_yoy,
      source              = EXCLUDED.source,
      metadata            = EXCLUDED.metadata,
      updated_at          = now()
    RETURNING *
  `;

  return mapRatio(rows[0]);
}

export async function upsertValuationMetric(
  input: UpsertValuationMetricInput,
): Promise<ValuationMetricRecord> {
  await ensureFundamentalsSchema();
  const symbol = normalizeSymbol(input.symbol);

  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO valuation_metrics (
      symbol, as_of_date,
      market_cap, enterprise_value,
      pe_ratio, forward_pe, peg_ratio, earnings_yield,
      ev_to_ebitda, ev_to_revenue,
      price_to_book, price_to_sales, price_to_fcf,
      eps_ttm, book_value_per_share, revenue_ttm, ebitda_ttm, dividend_yield,
      source, metadata
    )
    VALUES (
      ${symbol},
      ${input.asOfDate}::date,
      ${input.marketCap ?? null},
      ${input.enterpriseValue ?? null},
      ${input.peRatio ?? null},
      ${input.forwardPe ?? null},
      ${input.pegRatio ?? null},
      ${input.earningsYield ?? null},
      ${input.evToEbitda ?? null},
      ${input.evToRevenue ?? null},
      ${input.priceToBook ?? null},
      ${input.priceToSales ?? null},
      ${input.priceToFcf ?? null},
      ${input.epsTtm ?? null},
      ${input.bookValuePerShare ?? null},
      ${input.revenueTtm ?? null},
      ${input.ebitdaTtm ?? null},
      ${input.dividendYield ?? null},
      ${input.source ?? "manual"},
      ${sql.json((input.metadata ?? {}) as never)}
    )
    ON CONFLICT (symbol, as_of_date)
    DO UPDATE SET
      market_cap           = EXCLUDED.market_cap,
      enterprise_value     = EXCLUDED.enterprise_value,
      pe_ratio             = EXCLUDED.pe_ratio,
      forward_pe           = EXCLUDED.forward_pe,
      peg_ratio            = EXCLUDED.peg_ratio,
      earnings_yield       = EXCLUDED.earnings_yield,
      ev_to_ebitda         = EXCLUDED.ev_to_ebitda,
      ev_to_revenue        = EXCLUDED.ev_to_revenue,
      price_to_book        = EXCLUDED.price_to_book,
      price_to_sales       = EXCLUDED.price_to_sales,
      price_to_fcf         = EXCLUDED.price_to_fcf,
      eps_ttm              = EXCLUDED.eps_ttm,
      book_value_per_share = EXCLUDED.book_value_per_share,
      revenue_ttm          = EXCLUDED.revenue_ttm,
      ebitda_ttm           = EXCLUDED.ebitda_ttm,
      dividend_yield       = EXCLUDED.dividend_yield,
      source               = EXCLUDED.source,
      metadata             = EXCLUDED.metadata,
      updated_at           = now()
    RETURNING *
  `;

  return mapValuationMetric(rows[0]);
}

export async function bulkUpsertFundamentals(payload: {
  financials?: UpsertFinancialInput[];
  ratios?: UpsertRatioInput[];
  valuationMetrics?: UpsertValuationMetricInput[];
}): Promise<{ financials: number; ratios: number; valuationMetrics: number }> {
  const [fins, rats, vals] = await Promise.all([
    Promise.all((payload.financials ?? []).map(upsertFinancial)),
    Promise.all((payload.ratios ?? []).map(upsertRatio)),
    Promise.all((payload.valuationMetrics ?? []).map(upsertValuationMetric)),
  ]);

  return {
    financials: fins.length,
    ratios: rats.length,
    valuationMetrics: vals.length,
  };
}
