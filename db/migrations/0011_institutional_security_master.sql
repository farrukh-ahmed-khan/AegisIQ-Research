ALTER TABLE securities
  ADD COLUMN IF NOT EXISTS normalized_company_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_exchange TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN,
  ADD COLUMN IF NOT EXISTS isin TEXT,
  ADD COLUMN IF NOT EXISTS figi TEXT;

UPDATE securities
SET
  normalized_company_name = LOWER(REGEXP_REPLACE(COALESCE(company_name, ''), '\\s+', ' ', 'g')),
  primary_exchange = COALESCE(primary_exchange, exchange),
  region = CASE
    WHEN UPPER(COALESCE(country, '')) IN ('US', 'USA', 'UNITED STATES') THEN 'North America'
    WHEN UPPER(COALESCE(country, '')) IN ('CA', 'CAN', 'CANADA', 'MX', 'MEX', 'MEXICO') THEN 'North America'
    WHEN UPPER(COALESCE(country, '')) IN ('GB', 'UK', 'UNITED KINGDOM', 'DE', 'GERMANY', 'FR', 'FRANCE', 'IT', 'ITALY', 'ES', 'SPAIN', 'NL', 'NETHERLANDS', 'SE', 'SWEDEN', 'CH', 'SWITZERLAND') THEN 'Europe'
    WHEN UPPER(COALESCE(country, '')) IN ('JP', 'JAPAN', 'CN', 'CHINA', 'HK', 'HONG KONG', 'SG', 'SINGAPORE', 'IN', 'INDIA', 'KR', 'SOUTH KOREA', 'AU', 'AUSTRALIA', 'NZ', 'NEW ZEALAND') THEN 'APAC'
    WHEN UPPER(COALESCE(country, '')) IN ('BR', 'BRAZIL', 'AR', 'ARGENTINA', 'CL', 'CHILE', 'CO', 'COLOMBIA', 'PE', 'PERU') THEN 'LATAM'
    WHEN UPPER(COALESCE(country, '')) IN ('AE', 'UAE', 'SA', 'SAUDI ARABIA', 'QA', 'QATAR', 'ZA', 'SOUTH AFRICA', 'EG', 'EGYPT') THEN 'MEA'
    WHEN country IS NULL OR BTRIM(country) = '' THEN region
    ELSE COALESCE(region, 'Other')
  END,
  is_active = COALESCE(is_active, TRUE)
WHERE
  normalized_company_name IS NULL
  OR primary_exchange IS NULL
  OR region IS NULL
  OR is_active IS NULL;

CREATE INDEX IF NOT EXISTS securities_normalized_company_name_idx
  ON securities (normalized_company_name);

CREATE INDEX IF NOT EXISTS securities_primary_exchange_idx
  ON securities (primary_exchange);

CREATE INDEX IF NOT EXISTS securities_region_idx
  ON securities (region);

CREATE INDEX IF NOT EXISTS securities_is_active_idx
  ON securities (is_active);

CREATE INDEX IF NOT EXISTS securities_isin_idx
  ON securities (isin);

CREATE INDEX IF NOT EXISTS securities_figi_idx
  ON securities (figi);
