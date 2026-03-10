CREATE TABLE IF NOT EXISTS security_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  symbol text NOT NULL,
  company_name text NOT NULL,
  exchange text,
  sector text,
  industry text,
  country text,
  currency text,
  security_type text NOT NULL DEFAULT 'equity',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT security_master_workspace_symbol_unique UNIQUE (workspace_id, symbol)
);

CREATE INDEX IF NOT EXISTS security_master_workspace_idx
  ON security_master (workspace_id);

CREATE INDEX IF NOT EXISTS security_master_workspace_symbol_idx
  ON security_master (workspace_id, symbol);

CREATE INDEX IF NOT EXISTS security_master_workspace_company_idx
  ON security_master (workspace_id, company_name);

CREATE INDEX IF NOT EXISTS security_master_workspace_sector_idx
  ON security_master (workspace_id, sector);

CREATE INDEX IF NOT EXISTS security_master_workspace_industry_idx
  ON security_master (workspace_id, industry);

CREATE INDEX IF NOT EXISTS security_master_workspace_country_idx
  ON security_master (workspace_id, country);

CREATE INDEX IF NOT EXISTS security_master_workspace_exchange_idx
  ON security_master (workspace_id, exchange);

CREATE INDEX IF NOT EXISTS security_master_workspace_security_type_idx
  ON security_master (workspace_id, security_type);

CREATE INDEX IF NOT EXISTS security_master_workspace_active_idx
  ON security_master (workspace_id, is_active);
