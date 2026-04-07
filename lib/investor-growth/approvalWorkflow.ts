import type { InvestorCampaignApproval } from "@/types/investor-growth";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value !== "false" && value !== "off" && value !== "0";
  }

  return fallback;
}

export type ApprovalChainStep = {
  step_number: number;
  channel: string;
  approver_role: string;
  rule_name: string;
  sla_due_at: string | null;
};

export function buildApprovalChain(
  approvalRules: JsonRecord | undefined,
  channelMix: JsonRecord | undefined,
): ApprovalChainStep[] {
  const rules = asRecord(approvalRules);
  const channels = [
    asBoolean(asRecord(channelMix).email, true) ? "email" : null,
    asBoolean(asRecord(channelMix).sms, true) ? "sms" : null,
    asBoolean(asRecord(channelMix).social, true) ? "social" : null,
  ].filter(Boolean) as string[];

  const defaultRules: Record<string, { required_role: string; steps: number; sla_hours: number }> = {
    email: { required_role: "marketing_lead", steps: 1, sla_hours: 24 },
    sms: { required_role: "compliance", steps: 2, sla_hours: 12 },
    social: { required_role: "communications", steps: 1, sla_hours: 24 },
  };

  let nextStepNumber = 1;
  const chain: ApprovalChainStep[] = [];

  for (const channel of channels.length > 0 ? channels : ["email"]) {
    const rule = asRecord(rules[channel]);
    const fallback = defaultRules[channel] ?? defaultRules.email;
    const steps = Math.max(1, asNumber(rule.steps, fallback.steps));
    const role = String(rule.required_role ?? fallback.required_role);
    const slaHours = Math.max(1, asNumber(rule.sla_hours, fallback.sla_hours));

    for (let index = 0; index < steps; index += 1) {
      const dueAt = new Date(Date.now() + (nextStepNumber * slaHours * 60 * 60 * 1000));

      chain.push({
        step_number: nextStepNumber,
        channel,
        approver_role: role,
        rule_name: `${channel}_step_${index + 1}`,
        sla_due_at: dueAt.toISOString(),
      });

      nextStepNumber += 1;
    }
  }

  return chain;
}

export function labelApprovalAction(action: string): string {
  switch (action) {
    case "campaign_submitted":
      return "Submitted for approval";
    case "campaign_approved":
      return "Campaign approved";
    case "campaign_rejected":
      return "Campaign rejected";
    case "approval_step_approved":
      return "Approval step approved";
    case "approval_step_invalidated":
      return "Approval step invalidated";
    default:
      return action;
  }
}

export function buildApprovalStepLabel(approval: InvestorCampaignApproval): string {
  const channel = approval.channel ? approval.channel.toUpperCase() : "GENERAL";
  const role = approval.approver_role ?? "review";
  const step = approval.step_number ?? approval.sequence_index ?? 1;
  return `Step ${step} • ${channel} • ${role}`;
}
