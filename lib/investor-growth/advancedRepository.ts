import { sql } from "@/lib/db";

type JsonRecord = Record<string, unknown>;

export type ChannelExecutionRecord = {
  id: string;
  campaign_id: string;
  user_id: string;
  channel: string;
  platform: string | null;
  template_name: string | null;
  draft_content: string | null;
  scheduled_for: string | null;
  approval_rule_name: string | null;
  approval_status: string;
  delivery_status: string;
  provider_message_id: string | null;
  metrics_json: JsonRecord;
  metadata_json: JsonRecord;
  created_at: string;
  updated_at: string;
};

export type CampaignAnalyticsSnapshot = {
  id: string;
  campaign_id: string;
  user_id: string;
  metrics_json: JsonRecord;
  segment_metrics_json: JsonRecord;
  cohort_metrics_json: JsonRecord;
  top_content_json: JsonRecord;
  funnel_json: JsonRecord;
  trend_json: JsonRecord;
  updated_at: string;
};

export type ContactTimelineEntry = {
  id: string;
  contact_id: string;
  user_id: string;
  entry_type: string;
  title: string;
  note: string | null;
  due_at: string | null;
  metadata_json: JsonRecord;
  created_at: string;
};

type UpsertChannelExecutionInput = {
  campaign_id: string;
  user_id: string;
  channel: string;
  platform?: string | null;
  template_name?: string | null;
  draft_content?: string | null;
  scheduled_for?: string | null;
  approval_rule_name?: string | null;
  approval_status?: string;
  delivery_status?: string;
  provider_message_id?: string | null;
  metrics_json?: JsonRecord;
  metadata_json?: JsonRecord;
};

type UpdateCampaignAdvancedInput = {
  channel_mix_json?: JsonRecord;
  posting_calendar_json?: JsonRecord;
  social_posts_json?: JsonRecord;
  approval_rules_json?: JsonRecord;
  ai_strategy_json?: JsonRecord;
  compliance_state?: string;
  compliance_hold_reason?: string | null;
  content_locked_at?: string | null;
  post_approval_edit_invalidated?: boolean;
};

type UpdateContactCrmInput = {
  account_name?: string | null;
  relationship_stage?: string | null;
  interest_score?: number | null;
  last_engagement_at?: string | null;
  next_follow_up_at?: string | null;
  crm_metadata_json?: JsonRecord;
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mergeMetrics(
  current: JsonRecord | undefined,
  incoming: JsonRecord | undefined,
): JsonRecord {
  return {
    ...(current ?? {}),
    ...(incoming ?? {}),
  };
}

let schemaReady = false;

export async function ensureInvestorGrowthAdvancedSchema() {
  if (schemaReady) {
    return;
  }

  await sql`
    ALTER TABLE investor_growth_campaigns
      ADD COLUMN IF NOT EXISTS channel_mix_json JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS posting_calendar_json JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS social_posts_json JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS approval_rules_json JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS ai_strategy_json JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS compliance_state TEXT DEFAULT 'clear',
      ADD COLUMN IF NOT EXISTS compliance_hold_reason TEXT,
      ADD COLUMN IF NOT EXISTS content_locked_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS post_approval_edit_invalidated BOOLEAN DEFAULT FALSE
  `;

  await sql`
    ALTER TABLE investor_contacts
      ADD COLUMN IF NOT EXISTS account_name TEXT,
      ADD COLUMN IF NOT EXISTS relationship_stage TEXT DEFAULT 'prospect',
      ADD COLUMN IF NOT EXISTS interest_score NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS crm_metadata_json JSONB DEFAULT '{}'::jsonb
  `;

  await sql`
    ALTER TABLE investor_campaign_approvals
      ADD COLUMN IF NOT EXISTS step_number INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS channel TEXT,
      ADD COLUMN IF NOT EXISTS approver_role TEXT,
      ADD COLUMN IF NOT EXISTS rule_name TEXT,
      ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMP
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ig_channel_exec_campaign_id
      ON investor_growth_channel_executions(campaign_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ig_channel_exec_user_id
      ON investor_growth_channel_executions(user_id)
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ig_campaign_analytics_campaign_id
      ON investor_growth_campaign_analytics(campaign_id)
  `;

  await sql`
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
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ig_contact_timeline_contact_id
      ON investor_contact_timeline(contact_id)
  `;

  schemaReady = true;
}

function mapChannelExecution(
  row: Record<string, unknown>,
): ChannelExecutionRecord {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    user_id: String(row.user_id),
    channel: String(row.channel ?? ""),
    platform: asNullableString(row.platform),
    template_name: asNullableString(row.template_name),
    draft_content: asNullableString(row.draft_content),
    scheduled_for: asNullableString(row.scheduled_for),
    approval_rule_name: asNullableString(row.approval_rule_name),
    approval_status: String(row.approval_status ?? "draft"),
    delivery_status: String(row.delivery_status ?? "not_sent"),
    provider_message_id: asNullableString(row.provider_message_id),
    metrics_json: asRecord(row.metrics_json),
    metadata_json: asRecord(row.metadata_json),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapAnalyticsSnapshot(
  row: Record<string, unknown>,
): CampaignAnalyticsSnapshot {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    user_id: String(row.user_id),
    metrics_json: asRecord(row.metrics_json),
    segment_metrics_json: asRecord(row.segment_metrics_json),
    cohort_metrics_json: asRecord(row.cohort_metrics_json),
    top_content_json: asRecord(row.top_content_json),
    funnel_json: asRecord(row.funnel_json),
    trend_json: asRecord(row.trend_json),
    updated_at: String(row.updated_at),
  };
}

function mapTimelineEntry(row: Record<string, unknown>): ContactTimelineEntry {
  return {
    id: String(row.id),
    contact_id: String(row.contact_id),
    user_id: String(row.user_id),
    entry_type: String(row.entry_type ?? ""),
    title: String(row.title ?? ""),
    note: asNullableString(row.note),
    due_at: asNullableString(row.due_at),
    metadata_json: asRecord(row.metadata_json),
    created_at: String(row.created_at),
  };
}

export async function upsertChannelExecution(
  input: UpsertChannelExecutionInput,
): Promise<ChannelExecutionRecord> {
  await ensureInvestorGrowthAdvancedSchema();

  const existing = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_channel_executions
    WHERE campaign_id = ${input.campaign_id}::uuid
      AND channel = ${input.channel}
      AND COALESCE(platform, '') = COALESCE(${input.platform ?? null}, '')
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (existing[0]) {
    const existingMetrics = asRecord(existing[0].metrics_json);
    const existingMetadata = asRecord(existing[0].metadata_json);
    const nextMetrics = mergeMetrics(existingMetrics, input.metrics_json);
    const nextMetadata = mergeMetrics(existingMetadata, input.metadata_json);

    const rows = await sql<Record<string, unknown>[]>`
      UPDATE investor_growth_channel_executions
      SET
        template_name = COALESCE(${input.template_name ?? null}, template_name),
        draft_content = COALESCE(${input.draft_content ?? null}, draft_content),
        scheduled_for = COALESCE(${input.scheduled_for ?? null}::timestamp, scheduled_for),
        approval_rule_name = COALESCE(${input.approval_rule_name ?? null}, approval_rule_name),
        approval_status = COALESCE(${input.approval_status ?? null}, approval_status),
        delivery_status = COALESCE(${input.delivery_status ?? null}, delivery_status),
        provider_message_id = COALESCE(${input.provider_message_id ?? null}, provider_message_id),
        metrics_json = ${JSON.stringify(nextMetrics)}::jsonb,
        metadata_json = ${JSON.stringify(nextMetadata)}::jsonb,
        updated_at = now()
      WHERE id = ${String(existing[0].id)}::uuid
      RETURNING *
    `;

    return mapChannelExecution(rows[0]);
  }

  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_growth_channel_executions (
      id,
      campaign_id,
      user_id,
      channel,
      platform,
      template_name,
      draft_content,
      scheduled_for,
      approval_rule_name,
      approval_status,
      delivery_status,
      provider_message_id,
      metrics_json,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      ${input.campaign_id}::uuid,
      ${input.user_id}::uuid,
      ${input.channel},
      ${input.platform ?? null},
      ${input.template_name ?? null},
      ${input.draft_content ?? null},
      ${input.scheduled_for ?? null}::timestamp,
      ${input.approval_rule_name ?? null},
      ${input.approval_status ?? "draft"},
      ${input.delivery_status ?? "not_sent"},
      ${input.provider_message_id ?? null},
      ${JSON.stringify(input.metrics_json ?? {})}::jsonb,
      ${JSON.stringify(input.metadata_json ?? {})}::jsonb,
      now(),
      now()
    )
    RETURNING *
  `;

  return mapChannelExecution(rows[0]);
}

export async function listChannelExecutionsByCampaign(
  campaignId: string,
): Promise<ChannelExecutionRecord[]> {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_channel_executions
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY channel ASC, created_at DESC
  `;

  return rows.map(mapChannelExecution);
}

export async function listCalendarExecutionsByUser(
  userId: string,
): Promise<ChannelExecutionRecord[]> {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_channel_executions
    WHERE user_id = ${userId}::uuid
      AND scheduled_for IS NOT NULL
    ORDER BY scheduled_for ASC, created_at DESC
  `;

  return rows.map(mapChannelExecution);
}

export async function updateCampaignAdvancedFields(
  campaignId: string,
  input: UpdateCampaignAdvancedInput,
) {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_growth_campaigns
    SET
      channel_mix_json = COALESCE(${JSON.stringify(input.channel_mix_json ?? null)}::jsonb, channel_mix_json),
      posting_calendar_json = COALESCE(${JSON.stringify(input.posting_calendar_json ?? null)}::jsonb, posting_calendar_json),
      social_posts_json = COALESCE(${JSON.stringify(input.social_posts_json ?? null)}::jsonb, social_posts_json),
      approval_rules_json = COALESCE(${JSON.stringify(input.approval_rules_json ?? null)}::jsonb, approval_rules_json),
      ai_strategy_json = COALESCE(${JSON.stringify(input.ai_strategy_json ?? null)}::jsonb, ai_strategy_json),
      compliance_state = COALESCE(${input.compliance_state ?? null}, compliance_state),
      compliance_hold_reason = COALESCE(${input.compliance_hold_reason ?? null}, compliance_hold_reason),
      content_locked_at = COALESCE(${input.content_locked_at ?? null}::timestamp, content_locked_at),
      post_approval_edit_invalidated = COALESCE(${typeof input.post_approval_edit_invalidated === "boolean" ? input.post_approval_edit_invalidated : null}, post_approval_edit_invalidated),
      updated_at = now()
    WHERE id = ${campaignId}::uuid
    RETURNING *
  `;

  return rows[0] ?? null;
}

export async function getCampaignAdvancedDetails(campaignId: string) {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    SELECT
      channel_mix_json,
      posting_calendar_json,
      social_posts_json,
      approval_rules_json,
      ai_strategy_json,
      compliance_state,
      compliance_hold_reason,
      content_locked_at,
      post_approval_edit_invalidated
    FROM investor_growth_campaigns
    WHERE id = ${campaignId}::uuid
    LIMIT 1
  `;

  if (!rows[0]) {
    return null;
  }

  return {
    channel_mix_json: asRecord(rows[0].channel_mix_json),
    posting_calendar_json: asRecord(rows[0].posting_calendar_json),
    social_posts_json: asRecord(rows[0].social_posts_json),
    approval_rules_json: asRecord(rows[0].approval_rules_json),
    ai_strategy_json: asRecord(rows[0].ai_strategy_json),
    compliance_state: asNullableString(rows[0].compliance_state) ?? "clear",
    compliance_hold_reason: asNullableString(rows[0].compliance_hold_reason),
    content_locked_at: asNullableString(rows[0].content_locked_at),
    post_approval_edit_invalidated:
      rows[0].post_approval_edit_invalidated === true,
  };
}

export async function refreshCampaignAnalytics(
  campaignId: string,
  userId: string,
): Promise<CampaignAnalyticsSnapshot> {
  await ensureInvestorGrowthAdvancedSchema();

  const deliveryRows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_delivery_events
    WHERE campaign_id = ${campaignId}::uuid
  `;

  const channelRows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_channel_executions
    WHERE campaign_id = ${campaignId}::uuid
  `;

  const sent = deliveryRows.filter(
    (row) => String(row.delivery_status ?? "") === "sent",
  ).length;
  const failed = deliveryRows.filter(
    (row) => String(row.delivery_status ?? "") === "failed",
  ).length;
  const scheduled = channelRows.filter(
    (row) => String(row.delivery_status ?? "") === "scheduled",
  ).length;
  const approved = channelRows.filter(
    (row) => String(row.approval_status ?? "") === "approved",
  ).length;

  const deliveryOpens = deliveryRows.reduce(
    (sum, row) => sum + asNumber(asRecord(row.provider_response_json).opens),
    0,
  );
  const deliveryClicks = deliveryRows.reduce(
    (sum, row) => sum + asNumber(asRecord(row.provider_response_json).clicks),
    0,
  );
  const deliveryReplies = deliveryRows.reduce(
    (sum, row) => sum + asNumber(asRecord(row.provider_response_json).replies),
    0,
  );

  const channelOpens = channelRows.reduce(
    (sum, row) => sum + asNumber(asRecord(row.metrics_json).opens),
    0,
  );
  const channelClicks = channelRows.reduce(
    (sum, row) => sum + asNumber(asRecord(row.metrics_json).clicks),
    0,
  );
  const channelReplies = channelRows.reduce(
    (sum, row) => sum + asNumber(asRecord(row.metrics_json).replies),
    0,
  );

  const opens = channelOpens > 0 ? channelOpens : deliveryOpens;
  const clicks = channelClicks > 0 ? channelClicks : deliveryClicks;
  const replies = channelReplies > 0 ? channelReplies : deliveryReplies;

  const channels = channelRows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.channel ?? "unknown");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const metrics = {
    sent,
    failed,
    scheduled,
    approved,
    opens,
    clicks,
    replies,
    approval_to_delivery_conversion:
      approved > 0 ? Number(((sent / approved) * 100).toFixed(2)) : 0,
    engagement_score: opens * 1 + clicks * 2 + replies * 3,
    channel_mix_coverage: Object.keys(channels).length,
  };

  const segmentMetrics = {
    all_segments: {
      sends: sent,
      replies,
      clicks,
      engagement_score: metrics.engagement_score,
    },
  };

  const cohortMetrics = {
    current_campaign: {
      send_rate: sent + failed > 0 ? Number(((sent / (sent + failed)) * 100).toFixed(2)) : 0,
      failure_rate: sent + failed > 0 ? Number(((failed / (sent + failed)) * 100).toFixed(2)) : 0,
    },
  };

  const topContent = {
    best_channel:
      Object.entries(channels).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "email",
    total_variants: channelRows.length,
  };

  const funnel = {
    approvals: approved,
    scheduled,
    delivered: sent,
    engaged: opens + clicks + replies,
  };

  const trend = {
    generated_at: new Date().toISOString(),
    sends_last_snapshot: sent,
    engagement_last_snapshot: metrics.engagement_score,
  };

  const existing = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_campaign_analytics
    WHERE campaign_id = ${campaignId}::uuid
    LIMIT 1
  `;

  if (existing[0]) {
    const rows = await sql<Record<string, unknown>[]>`
      UPDATE investor_growth_campaign_analytics
      SET
        metrics_json = ${JSON.stringify(metrics)}::jsonb,
        segment_metrics_json = ${JSON.stringify(segmentMetrics)}::jsonb,
        cohort_metrics_json = ${JSON.stringify(cohortMetrics)}::jsonb,
        top_content_json = ${JSON.stringify(topContent)}::jsonb,
        funnel_json = ${JSON.stringify(funnel)}::jsonb,
        trend_json = ${JSON.stringify(trend)}::jsonb,
        updated_at = now()
      WHERE id = ${String(existing[0].id)}::uuid
      RETURNING *
    `;

    return mapAnalyticsSnapshot(rows[0]);
  }

  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_growth_campaign_analytics (
      id,
      campaign_id,
      user_id,
      metrics_json,
      segment_metrics_json,
      cohort_metrics_json,
      top_content_json,
      funnel_json,
      trend_json,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      ${campaignId}::uuid,
      ${userId}::uuid,
      ${JSON.stringify(metrics)}::jsonb,
      ${JSON.stringify(segmentMetrics)}::jsonb,
      ${JSON.stringify(cohortMetrics)}::jsonb,
      ${JSON.stringify(topContent)}::jsonb,
      ${JSON.stringify(funnel)}::jsonb,
      ${JSON.stringify(trend)}::jsonb,
      now(),
      now()
    )
    RETURNING *
  `;

  return mapAnalyticsSnapshot(rows[0]);
}

export async function getCampaignAnalytics(
  campaignId: string,
): Promise<CampaignAnalyticsSnapshot | null> {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_campaign_analytics
    WHERE campaign_id = ${campaignId}::uuid
    LIMIT 1
  `;

  return rows[0] ? mapAnalyticsSnapshot(rows[0]) : null;
}

export async function getPortfolioAnalytics(userId: string) {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_campaign_analytics
    WHERE user_id = ${userId}::uuid
    ORDER BY updated_at DESC
  `;

  const snapshots = rows.map(mapAnalyticsSnapshot);
  const totals = snapshots.reduce(
    (acc, snapshot) => {
      const metrics = snapshot.metrics_json;
      acc.sent += asNumber(metrics.sent);
      acc.failed += asNumber(metrics.failed);
      acc.opens += asNumber(metrics.opens);
      acc.clicks += asNumber(metrics.clicks);
      acc.replies += asNumber(metrics.replies);
      acc.engagement_score += asNumber(metrics.engagement_score);
      return acc;
    },
    { sent: 0, failed: 0, opens: 0, clicks: 0, replies: 0, engagement_score: 0 },
  );

  return {
    totals,
    top_content_panels: snapshots.slice(0, 5).map((snapshot) => ({
      campaign_id: snapshot.campaign_id,
      ...snapshot.top_content_json,
    })),
    trend_views: snapshots.slice(0, 8).map((snapshot) => ({
      campaign_id: snapshot.campaign_id,
      ...snapshot.trend_json,
    })),
  };
}

export async function getExecutionSummaryByUser(userId: string) {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_growth_channel_executions
    WHERE user_id = ${userId}::uuid
    ORDER BY updated_at DESC
  `;

  const executions = rows.map(mapChannelExecution);
  const byChannel = executions.reduce<Record<string, number>>((acc, execution) => {
    acc[execution.channel] = (acc[execution.channel] ?? 0) + 1;
    return acc;
  }, {});

  return {
    executions,
    by_channel: byChannel,
  };
}

export async function updateContactCrm(
  contactId: string,
  input: UpdateContactCrmInput,
) {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    UPDATE investor_contacts
    SET
      account_name = COALESCE(${input.account_name ?? null}, account_name),
      relationship_stage = COALESCE(${input.relationship_stage ?? null}, relationship_stage),
      interest_score = COALESCE(${input.interest_score ?? null}, interest_score),
      last_engagement_at = COALESCE(${input.last_engagement_at ?? null}::timestamp, last_engagement_at),
      next_follow_up_at = COALESCE(${input.next_follow_up_at ?? null}::timestamp, next_follow_up_at),
      crm_metadata_json = COALESCE(${JSON.stringify(input.crm_metadata_json ?? null)}::jsonb, crm_metadata_json),
      updated_at = now()
    WHERE id = ${contactId}::uuid
    RETURNING *
  `;

  return rows[0] ?? null;
}

export async function createContactTimelineEntry(input: {
  contact_id: string;
  user_id: string;
  entry_type: string;
  title: string;
  note?: string | null;
  due_at?: string | null;
  metadata_json?: JsonRecord;
}) {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO investor_contact_timeline (
      id,
      contact_id,
      user_id,
      entry_type,
      title,
      note,
      due_at,
      metadata_json,
      created_at
    ) VALUES (
      gen_random_uuid(),
      ${input.contact_id}::uuid,
      ${input.user_id}::uuid,
      ${input.entry_type},
      ${input.title},
      ${input.note ?? null},
      ${input.due_at ?? null}::timestamp,
      ${JSON.stringify(input.metadata_json ?? {})}::jsonb,
      now()
    )
    RETURNING *
  `;

  return mapTimelineEntry(rows[0]);
}

export async function getContactTimeline(contactId: string) {
  await ensureInvestorGrowthAdvancedSchema();

  const rows = await sql<Record<string, unknown>[]>`
    SELECT *
    FROM investor_contact_timeline
    WHERE contact_id = ${contactId}::uuid
    ORDER BY created_at DESC
  `;

  return rows.map(mapTimelineEntry);
}
