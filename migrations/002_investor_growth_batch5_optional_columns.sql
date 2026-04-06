ALTER TABLE IF EXISTS investor_growth_campaigns
  ADD COLUMN IF NOT EXISTS approval_status TEXT;

ALTER TABLE IF EXISTS investor_growth_audit_log
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS acted_by UUID,
  ADD COLUMN IF NOT EXISTS segment_id UUID;

ALTER TABLE IF EXISTS investor_campaign_approvals
  ADD COLUMN IF NOT EXISTS segment_id UUID;
