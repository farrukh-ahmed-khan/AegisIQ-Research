CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS investor_growth_campaigns (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,

  ticker TEXT,
  company_name TEXT,

  campaign_objective TEXT,
  audience_focus TEXT,
  tone TEXT,
  notes TEXT,

  input_payload_json JSONB,
  strategy_payload_json JSONB,
  content_payload_json JSONB,

  email_subject TEXT,
  email_body TEXT,
  sms_body TEXT,
  social_post TEXT,

  segment_id UUID,

  status TEXT DEFAULT 'draft',

  email_delivery_status TEXT DEFAULT 'not_sent',

  email_sent_at TIMESTAMP,

  email_provider_message_id TEXT,
  email_last_error TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_growth_delivery_events (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,

  channel TEXT,
  platform TEXT,

  recipient_payload_json JSONB,
  content_payload_json JSONB,

  delivery_status TEXT,

  provider_message_id TEXT,
  provider_response_json JSONB,

  error_message TEXT,

  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_contacts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,

  name TEXT,
  email TEXT,
  phone TEXT,

  organization TEXT,
  role TEXT,
  investor_type TEXT,

  tags_json JSONB,
  notes TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_segments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID,

  name TEXT,
  description TEXT,

  rules_json JSONB,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_segment_members (
  id UUID PRIMARY KEY,
  segment_id UUID NOT NULL,
  contact_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS investor_campaign_approvals (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,

  status TEXT,

  submitted_at TIMESTAMP,
  decided_at TIMESTAMP,

  decision_notes TEXT,

  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_growth_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID,

  action TEXT,

  metadata_json JSONB,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ig_campaigns_user_id ON investor_growth_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_ig_delivery_campaign_id ON investor_growth_delivery_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ig_contacts_user_id ON investor_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_ig_segments_user_id ON investor_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_ig_segment_members_segment_id ON investor_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_ig_approvals_campaign_id ON investor_campaign_approvals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ig_audit_campaign_id ON investor_growth_audit_log(campaign_id);
