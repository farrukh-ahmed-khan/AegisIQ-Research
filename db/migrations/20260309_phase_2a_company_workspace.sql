BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'workspace_document_kind'
  ) THEN
    CREATE TYPE workspace_document_kind AS ENUM (
      'report',
      'filing',
      'model',
      'transcript',
      'deck',
      'memo',
      'other'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'workspace_activity_kind'
  ) THEN
    CREATE TYPE workspace_activity_kind AS ENUM (
      'workspace_created',
      'note_created',
      'note_updated',
      'document_added',
      'report_generated',
      'valuation_saved',
      'terminal_opened',
      'screener_saved'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'report_run_status'
  ) THEN
    CREATE TYPE report_run_status AS ENUM (
      'queued',
      'running',
      'completed',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS company_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  symbol text NOT NULL,
  company_name text,
  exchange text,
  primary_currency text NOT NULL DEFAULT 'USD',
  coverage_status text NOT NULL DEFAULT 'active',
  last_price numeric(18,6),
  last_price_at timestamptz,
  latest_rating text,
  latest_target_price numeric(18,6),
  latest_report_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_workspaces_symbol_check CHECK (char_length(symbol) > 0),
  CONSTRAINT company_workspaces_currency_check CHECK (char_length(primary_currency) > 0),
  CONSTRAINT company_workspaces_unique_user_symbol UNIQUE (clerk_user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_company_workspaces_user
  ON company_workspaces (clerk_user_id);

CREATE INDEX IF NOT EXISTS idx_company_workspaces_symbol
  ON company_workspaces (symbol);

CREATE INDEX IF NOT EXISTS idx_company_workspaces_updated_at
  ON company_workspaces (updated_at DESC);

CREATE TABLE IF NOT EXISTS workspace_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES company_workspaces(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  title text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_notes_title_check CHECK (char_length(title) > 0)
);

CREATE INDEX IF NOT EXISTS idx_workspace_notes_workspace
  ON workspace_notes (workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_notes_user
  ON workspace_notes (clerk_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS workspace_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES company_workspaces(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  title text NOT NULL,
  kind workspace_document_kind NOT NULL DEFAULT 'other',
  source_url text,
  storage_path text,
  mime_type text,
  source_provider text,
  file_size_bytes bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_documents_title_check CHECK (char_length(title) > 0)
);

CREATE INDEX IF NOT EXISTS idx_workspace_documents_workspace
  ON workspace_documents (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_documents_kind
  ON workspace_documents (kind);

CREATE TABLE IF NOT EXISTS valuation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES company_workspaces(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  model_name text NOT NULL,
  fair_value numeric(18,6),
  price_target numeric(18,6),
  upside_downside_pct numeric(10,4),
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valuation_snapshots_model_name_check CHECK (char_length(model_name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_workspace
  ON valuation_snapshots (workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES company_workspaces(id) ON DELETE SET NULL,
  clerk_user_id text NOT NULL,
  symbol text NOT NULL,
  report_type text NOT NULL DEFAULT 'equity_research',
  status report_run_status NOT NULL DEFAULT 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  pdf_url text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_runs_symbol_check CHECK (char_length(symbol) > 0),
  CONSTRAINT report_runs_report_type_check CHECK (char_length(report_type) > 0)
);

CREATE INDEX IF NOT EXISTS idx_report_runs_workspace
  ON report_runs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_runs_user
  ON report_runs (clerk_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_runs_status
  ON report_runs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES company_workspaces(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  kind workspace_activity_kind NOT NULL,
  label text NOT NULL,
  detail text,
  actor_name text,
  actor_clerk_user_id text,
  related_entity_type text,
  related_entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_activity_label_check CHECK (char_length(label) > 0)
);

CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace
  ON workspace_activity (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_activity_kind
  ON workspace_activity (kind, created_at DESC);

CREATE TABLE IF NOT EXISTS screener_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT screener_presets_name_check CHECK (char_length(name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_screener_presets_user
  ON screener_presets (clerk_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlists_name_check CHECK (char_length(name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user
  ON watchlists (clerk_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  company_name text,
  exchange text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlist_items_symbol_check CHECK (char_length(symbol) > 0),
  CONSTRAINT watchlist_items_unique UNIQUE (watchlist_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist
  ON watchlist_items (watchlist_id, sort_order ASC, created_at ASC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_workspaces_updated_at ON company_workspaces;
CREATE TRIGGER trg_company_workspaces_updated_at
BEFORE UPDATE ON company_workspaces
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_workspace_notes_updated_at ON workspace_notes;
CREATE TRIGGER trg_workspace_notes_updated_at
BEFORE UPDATE ON workspace_notes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_workspace_documents_updated_at ON workspace_documents;
CREATE TRIGGER trg_workspace_documents_updated_at
BEFORE UPDATE ON workspace_documents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_report_runs_updated_at ON report_runs;
CREATE TRIGGER trg_report_runs_updated_at
BEFORE UPDATE ON report_runs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_screener_presets_updated_at ON screener_presets;
CREATE TRIGGER trg_screener_presets_updated_at
BEFORE UPDATE ON screener_presets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_watchlists_updated_at ON watchlists;
CREATE TRIGGER trg_watchlists_updated_at
BEFORE UPDATE ON watchlists
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
