export type InvestorGrowthCampaignStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "sent";

export type InvestorGrowthDeliveryStatus =
  | "not_sent"
  | "sending"
  | "sent"
  | "failed";

export interface InvestorGrowthCampaign {
  id: string;
  user_id: string;
  workspace_id?: string | null;

  ticker?: string;
  company_name?: string;

  campaign_objective?: string;
  audience_focus?: string;
  tone?: string;
  notes?: string;

  strategy_payload_json?: any;
  content_payload_json?: any;

  email_subject?: string;
  email_body?: string;
  sms_body?: string;
  social_post?: string;

  segment_id?: string | null;
  channel_mix_json?: any;
  posting_calendar_json?: any;
  social_posts_json?: any;
  approval_rules_json?: any;
  ai_strategy_json?: any;
  compliance_state?: string;
  compliance_hold_reason?: string | null;
  content_locked_at?: string | null;
  post_approval_edit_invalidated?: boolean;

  status: InvestorGrowthCampaignStatus;
  email_delivery_status: InvestorGrowthDeliveryStatus;
  email_sent_at?: string | null;
  email_provider_message_id?: string | null;
  email_last_error?: string | null;

  created_at: string;
  updated_at: string;
}

export interface InvestorGrowthDeliveryEvent {
  id: string;
  campaign_id: string;
  user_id: string;

  channel: string;

  recipient_payload_json?: any;
  content_payload_json?: any;

  delivery_status: string;

  provider_message_id?: string;
  provider_response_json?: any;
  error_message?: string;

  created_at: string;
}

export interface InvestorContact {
  id: string;
  user_id: string;
  workspace_id?: string | null;

  name: string;
  email?: string;
  phone?: string;

  organization?: string;
  role?: string;
  investor_type?: string;
  account_name?: string;
  relationship_stage?: string;
  interest_score?: number;
  last_engagement_at?: string | null;
  next_follow_up_at?: string | null;
  crm_metadata_json?: any;

  tags_json?: any;
  notes?: string;

  created_at: string;
  updated_at: string;
}

export interface InvestorSegment {
  id: string;
  user_id: string;
  workspace_id?: string | null;

  name: string;
  description?: string;

  rules_json?: any;

  created_at: string;
  updated_at: string;
}

export interface InvestorSegmentMember {
  id: string;
  segment_id: string;
  contact_id: string;
}

export interface InvestorCampaignApproval {
  id: string;
  campaign_id: string;
  user_id: string;

  status: "pending" | "approved" | "rejected";
  step_number?: number;
  channel?: string | null;
  approver_role?: string | null;
  rule_name?: string | null;
  sla_due_at?: string | null;
  invalidated_at?: string | null;

  submitted_at?: string;
  decided_at?: string;

  decision_notes?: string;

  created_at: string;
}

export interface InvestorGrowthAuditLog {
  id: string;
  user_id: string;
  campaign_id?: string;

  action: string;
  metadata_json?: any;

  created_at: string;
}
