ALTER TABLE IF EXISTS investor_growth_campaigns
  ADD COLUMN IF NOT EXISTS channel_mix_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS posting_calendar_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_posts_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_rules_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_strategy_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_state TEXT DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS compliance_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS content_locked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS post_approval_edit_invalidated BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS investor_contacts
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS relationship_stage TEXT DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS interest_score NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS crm_metadata_json JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS investor_campaign_approvals
  ADD COLUMN IF NOT EXISTS step_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS approver_role TEXT,
  ADD COLUMN IF NOT EXISTS rule_name TEXT,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS investor_growth_channel_executions (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL,
  platform TEXT,
  template_name TEXT,
  draft_content TEXT,
  scheduled_for TIMESTAMP,
  approval_rule_name TEXT,
  approval_status TEXT DEFAULT 'draft',
  delivery_status TEXT DEFAULT 'not_sent',
  provider_message_id TEXT,
  metrics_json JSONB DEFAULT '{}'::jsonb,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_growth_campaign_analytics (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  metrics_json JSONB DEFAULT '{}'::jsonb,
  segment_metrics_json JSONB DEFAULT '{}'::jsonb,
  cohort_metrics_json JSONB DEFAULT '{}'::jsonb,
  top_content_json JSONB DEFAULT '{}'::jsonb,
  funnel_json JSONB DEFAULT '{}'::jsonb,
  trend_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_contact_timeline (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL,
  user_id UUID NOT NULL,
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  due_at TIMESTAMP,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_channel_exec_campaign_id
  ON investor_growth_channel_executions(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ig_channel_exec_user_id
  ON investor_growth_channel_executions(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ig_campaign_analytics_campaign_id
  ON investor_growth_campaign_analytics(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ig_contact_timeline_contact_id
  ON investor_contact_timeline(contact_id);
