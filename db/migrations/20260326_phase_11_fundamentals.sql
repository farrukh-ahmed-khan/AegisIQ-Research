BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- financials  –  income statement, balance sheet, and cash flow data per period
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financials (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol           text        NOT NULL,
  period_type      text        NOT NULL DEFAULT 'annual',  -- 'annual' | 'quarterly'
  period_end_date  date        NOT NULL,
  fiscal_year      integer     NOT NULL,
  fiscal_quarter   integer,                               -- NULL for annual
  currency         text        NOT NULL DEFAULT 'USD',

  -- Income Statement
  revenue                numeric(22,4),
  gross_profit           numeric(22,4),
  operating_income       numeric(22,4),
  ebitda                 numeric(22,4),
  net_income             numeric(22,4),
  eps_basic              numeric(14,6),
  eps_diluted            numeric(14,6),

  -- Balance Sheet
  total_assets           numeric(22,4),
  total_liabilities      numeric(22,4),
  total_equity           numeric(22,4),
  cash_and_equivalents   numeric(22,4),
  total_debt             numeric(22,4),
  shares_outstanding     numeric(22,4),

  -- Cash Flow
  operating_cash_flow    numeric(22,4),
  capital_expenditures   numeric(22,4),
  free_cash_flow         numeric(22,4),

  source                 text        NOT NULL DEFAULT 'manual',
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT financials_symbol_check       CHECK (char_length(symbol) > 0),
  CONSTRAINT financials_period_type_check  CHECK (period_type IN ('annual', 'quarterly')),
  CONSTRAINT financials_unique_period      UNIQUE (symbol, period_type, period_end_date)
);

CREATE INDEX IF NOT EXISTS idx_financials_symbol
  ON financials (symbol, period_type, period_end_date DESC);

CREATE INDEX IF NOT EXISTS idx_financials_fiscal
  ON financials (symbol, fiscal_year DESC, fiscal_quarter DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────────────────
-- ratios  –  profitability, efficiency, and growth ratios per period
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratios (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol           text        NOT NULL,
  period_type      text        NOT NULL DEFAULT 'annual',
  period_end_date  date        NOT NULL,
  fiscal_year      integer     NOT NULL,
  fiscal_quarter   integer,

  -- Profitability
  gross_margin           numeric(10,6),   -- e.g. 0.4341 = 43.41%
  operating_margin       numeric(10,6),
  net_margin             numeric(10,6),
  ebitda_margin          numeric(10,6),
  fcf_margin             numeric(10,6),

  -- Returns
  roe                    numeric(10,6),   -- return on equity
  roa                    numeric(10,6),   -- return on assets
  roic                   numeric(10,6),   -- return on invested capital

  -- Liquidity & Leverage
  current_ratio          numeric(10,4),
  quick_ratio            numeric(10,4),
  debt_to_equity         numeric(10,4),
  interest_coverage      numeric(10,4),

  -- Growth (YoY)
  revenue_growth_yoy     numeric(10,6),
  earnings_growth_yoy    numeric(10,6),
  fcf_growth_yoy         numeric(10,6),

  source                 text        NOT NULL DEFAULT 'manual',
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ratios_symbol_check       CHECK (char_length(symbol) > 0),
  CONSTRAINT ratios_period_type_check  CHECK (period_type IN ('annual', 'quarterly')),
  CONSTRAINT ratios_unique_period      UNIQUE (symbol, period_type, period_end_date)
);

CREATE INDEX IF NOT EXISTS idx_ratios_symbol
  ON ratios (symbol, period_type, period_end_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- valuation_metrics  –  market-based valuation multiples (point-in-time)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS valuation_metrics (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol           text        NOT NULL,
  as_of_date       date        NOT NULL,

  -- Market Size
  market_cap             numeric(22,4),
  enterprise_value       numeric(22,4),

  -- Earnings Multiples
  pe_ratio               numeric(14,4),
  forward_pe             numeric(14,4),
  peg_ratio              numeric(14,4),
  earnings_yield         numeric(10,6),

  -- EV Multiples
  ev_to_ebitda           numeric(14,4),
  ev_to_revenue          numeric(14,4),

  -- Price Multiples
  price_to_book          numeric(14,4),
  price_to_sales         numeric(14,4),
  price_to_fcf           numeric(14,4),

  -- Per-Share & Yield
  eps_ttm                numeric(14,6),
  book_value_per_share   numeric(14,6),
  revenue_ttm            numeric(22,4),
  ebitda_ttm             numeric(22,4),
  dividend_yield         numeric(10,6),

  source                 text        NOT NULL DEFAULT 'manual',
  metadata               jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valuation_metrics_symbol_check  CHECK (char_length(symbol) > 0),
  CONSTRAINT valuation_metrics_unique_date   UNIQUE (symbol, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_valuation_metrics_symbol
  ON valuation_metrics (symbol, as_of_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers – keep updated_at current
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_financials_updated_at ON financials;
CREATE TRIGGER trg_financials_updated_at
BEFORE UPDATE ON financials
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ratios_updated_at ON ratios;
CREATE TRIGGER trg_ratios_updated_at
BEFORE UPDATE ON ratios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_valuation_metrics_updated_at ON valuation_metrics;
CREATE TRIGGER trg_valuation_metrics_updated_at
BEFORE UPDATE ON valuation_metrics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
