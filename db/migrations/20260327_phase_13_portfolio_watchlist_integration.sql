BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Some environments may not have earlier watchlist migrations applied yet.
-- Create baseline watchlist tables so this migration can run end-to-end.
CREATE TABLE IF NOT EXISTS watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure watchlist_items has the ownership/timestamp columns expected by the repository layer.
ALTER TABLE watchlist_items
  ADD COLUMN IF NOT EXISTS clerk_user_id text;

UPDATE watchlist_items wi
SET clerk_user_id = w.clerk_user_id
FROM watchlists w
WHERE wi.watchlist_id = w.id
  AND wi.clerk_user_id IS NULL;

UPDATE watchlist_items
SET clerk_user_id = 'legacy_user'
WHERE clerk_user_id IS NULL;

ALTER TABLE watchlist_items
  ALTER COLUMN clerk_user_id SET NOT NULL;

ALTER TABLE watchlist_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Selection snapshots persist which symbols were selected from a screener run.
CREATE TABLE IF NOT EXISTS screener_selection_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  workspace_id text NOT NULL DEFAULT 'global_screener',
  name text,
  coverage_mode text NOT NULL DEFAULT 'security_master',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_matches integer NOT NULL DEFAULT 0,
  result_count integer NOT NULL DEFAULT 0,
  selected_count integer NOT NULL DEFAULT 0,
  linked_watchlist_id uuid REFERENCES watchlists(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT screener_selection_runs_coverage_mode_check
    CHECK (coverage_mode IN ('security_master', 'watchlist_fallback'))
);

CREATE INDEX IF NOT EXISTS idx_screener_selection_runs_user_created
  ON screener_selection_runs (clerk_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_screener_selection_runs_workspace_created
  ON screener_selection_runs (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS screener_selection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES screener_selection_runs(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  company_name text,
  exchange text,
  sector text,
  industry text,
  region text,
  country text,
  currency text,
  security_type text,
  market_cap numeric(22,4),
  pe_ratio numeric(14,4),
  ev_to_ebitda numeric(14,4),
  price_to_book numeric(14,4),
  price_to_sales numeric(14,4),
  revenue_growth_yoy numeric(10,6),
  earnings_growth_yoy numeric(10,6),
  fcf_growth_yoy numeric(10,6),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT screener_selection_items_symbol_not_blank CHECK (btrim(symbol) <> ''),
  CONSTRAINT screener_selection_items_unique_symbol_per_run UNIQUE (run_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_screener_selection_items_run
  ON screener_selection_items (run_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_screener_selection_items_symbol
  ON screener_selection_items (symbol);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_watchlist_items_updated_at ON watchlist_items;
CREATE TRIGGER trg_watchlist_items_updated_at
BEFORE UPDATE ON watchlist_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;