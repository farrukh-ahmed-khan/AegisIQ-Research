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

  status: InvestorGrowthCampaignStatus;
  email_delivery_status: InvestorGrowthDeliveryStatus;

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
