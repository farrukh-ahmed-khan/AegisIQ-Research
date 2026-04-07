import type { InvestorGrowthCampaign } from "@/types/investor-growth";
import type {
  CampaignAnalyticsSnapshot,
  ChannelExecutionRecord,
} from "@/lib/investor-growth/advancedRepository";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value !== "false" && value !== "off" && value !== "0";
  }

  return fallback;
}

function enabledChannels(channelMix: JsonRecord | undefined): string[] {
  const mix = asRecord(channelMix);
  const channels = [
    asBoolean(mix.email, true) ? "email" : null,
    asBoolean(mix.sms, true) ? "sms" : null,
    asBoolean(mix.social, true) ? "social" : null,
  ].filter(Boolean);

  return channels as string[];
}

export function buildAiStrategySummary(input: {
  campaign: InvestorGrowthCampaign;
  analytics?: CampaignAnalyticsSnapshot | null;
  advanced?: {
    channel_mix_json?: JsonRecord;
    approval_rules_json?: JsonRecord;
    compliance_state?: string;
  } | null;
  channelExecutions?: ChannelExecutionRecord[];
}): JsonRecord {
  const { campaign, analytics, advanced, channelExecutions = [] } = input;
  const metrics = asRecord(analytics?.metrics_json);
  const funnel = asRecord(analytics?.funnel_json);
  const topContent = asRecord(analytics?.top_content_json);
  const trend = asRecord(analytics?.trend_json);
  const approvalRules = asRecord(advanced?.approval_rules_json);
  const channels = enabledChannels(
    advanced?.channel_mix_json ?? campaign.channel_mix_json,
  );
  const scheduledTouches = channelExecutions.filter(
    (execution) => execution.delivery_status === "scheduled",
  ).length;
  const riskFlags: string[] = [];

  if ((advanced?.compliance_state ?? campaign.compliance_state) === "hold") {
    riskFlags.push("Campaign is currently on compliance hold.");
  }

  if (campaign.post_approval_edit_invalidated) {
    riskFlags.push("Post-approval edits invalidated the last approval state.");
  }

  if (asNumber(metrics.failed) > 0) {
    riskFlags.push("Delivery failures are present and should be reviewed.");
  }

  if (asNumber(funnel.approvals) === 0) {
    riskFlags.push("No approvals have cleared yet.");
  }

  const bestChannel = String(topContent.best_channel ?? channels[0] ?? "email");
  const engagementScore = asNumber(metrics.engagement_score);
  const sendVolume = asNumber(metrics.sent);
  const audience =
    campaign.audience_focus?.trim() || "targeted investor segments with current relevance";

  const timingRecommendation =
    scheduledTouches > 0
      ? "Preserve the existing scheduled sequence and reinforce approved touches within 24 hours of the primary send."
      : campaign.tone?.toLowerCase().includes("urgent")
        ? "Lead with email in the next business window, then follow with same-day SMS reinforcement."
        : "Lead with email, follow with SMS the next business morning, and schedule social support within 24-48 hours.";

  const contentVariants = [
    "Short-form credibility message for mobile and SMS audiences.",
    "Performance-oriented email variant for high-intent institutional targets.",
    `Social proof variant optimized for ${bestChannel} awareness.`,
  ];

  const explainableSummary = [
    `Audience recommendation leans toward ${audience} because that matches the campaign focus and current relationship context.`,
    `Channel mix recommendation is ${channels.join(" + ") || "email"} based on configured execution coverage and recorded activity.`,
    `Timing recommendation reflects ${scheduledTouches > 0 ? "existing calendar commitments" : "the current absence of scheduled follow-up touches"}.`,
    `Risk review is influenced by compliance state "${advanced?.compliance_state ?? campaign.compliance_state ?? "clear"}" and ${asNumber(metrics.failed)} failed deliveries.`,
  ].join(" ");

  return {
    summary:
      engagementScore > 0
        ? `Campaign is active with engagement score ${engagementScore}; continue the approved ${channels.join(" + ")} sequence.`
        : `Campaign is prepared for launch; begin with ${channels.join(" + ")} once approvals are complete.`,
    audience_selection_recommendation: audience,
    timing_recommendation: timingRecommendation,
    content_variant_recommendations: contentVariants,
    channel_mix_recommendation: channels.join(" + "),
    campaign_risk_flags: riskFlags,
    explainable_summary: explainableSummary,
    best_next_actions: [
      sendVolume === 0 ? "Launch the first approved touch to start the attribution loop." : "Review channel-level engagement before expanding send volume.",
      "Compare segment response and rebalance the next content variant toward the best-performing channel.",
      "Keep compliance and approval SLAs visible before editing approved content.",
    ],
    top_performing_channel: bestChannel,
    trend_snapshot: trend,
    governance_inputs: approvalRules,
    enterprise_workspace: {
      deal_room_hooks: [
        "Attach approved campaign assets to issuer-facing deal room workflows.",
        "Reference campaign content from diligence and roadshow packages.",
      ],
      ir_analytics_workspace: {
        engagement_score: engagementScore,
        sent: sendVolume,
        best_channel: bestChannel,
      },
      board_level_reporting_exports: [
        "Campaign funnel summary",
        "Approval SLA summary",
        "Audience engagement trend snapshot",
      ],
      enterprise_user_controls: [
        "Role-aware approvals",
        "Channel-level publishing controls",
        "Locked content after approval",
      ],
      crm_api_integrations: [
        "Investor CRM sync placeholder",
        "Campaign analytics export placeholder",
      ],
      external_data_enrichment_connectors: [
        "Issuer-permitted firmographic enrichment",
        "Market awareness signal connectors",
      ],
      premium_reporting_and_governance_modules: [
        "Audit export pack",
        "Board reporting view",
        "Compliance variance monitor",
      ],
    },
  };
}
