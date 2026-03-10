BEGIN;

CREATE TABLE IF NOT EXISTS screener_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns text[] NOT NULL DEFAULT ARRAY[]::text[],
  sort jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT screener_presets_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT screener_presets_unique_name_per_user UNIQUE (clerk_user_id, name)
);

CREATE INDEX IF NOT EXISTS screener_presets_user_idx
  ON screener_presets (clerk_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS screener_presets_default_idx
  ON screener_presets (clerk_user_id, is_default);

CREATE TABLE IF NOT EXISTS watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlists_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT watchlists_unique_name_per_user UNIQUE (clerk_user_id, name)
);

CREATE INDEX IF NOT EXISTS watchlists_user_idx
  ON watchlists (clerk_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS watchlists_default_idx
  ON watchlists (clerk_user_id, is_default);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  company_name text,
  exchange text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlist_items_symbol_not_blank CHECK (btrim(symbol) <> ''),
  CONSTRAINT watchlist_items_symbol_format CHECK (symbol ~ '^[A-Z0-9.\-]{1,12}$'),
  CONSTRAINT watchlist_items_unique_symbol_per_watchlist UNIQUE (watchlist_id, symbol)
);

CREATE INDEX IF NOT EXISTS watchlist_items_watchlist_idx
  ON watchlist_items (watchlist_id, sort_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS watchlist_items_symbol_idx
  ON watchlist_items (symbol);

COMMIT;
