-- AI Report Builder usage tracking for Starter plan rate limiting
-- Starter users are capped at 3 AI-generated reports per calendar month.

CREATE TABLE IF NOT EXISTS ai_report_usage (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,          -- Clerk user ID
  month       TEXT        NOT NULL,          -- Format: YYYY-MM  (e.g. 2026-04)
  count       INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_ai_report_usage_user_month
  ON ai_report_usage (user_id, month);
