// Plan tier definitions and feature gating utilities
// Gate features server-side — never trust client-side tier checks alone.

export type PlanTier = "starter" | "pro" | "enterprise";

export const PLAN_RANK: Record<PlanTier, number> = {
  starter: 1,
  pro: 2,
  enterprise: 3,
};

// Feature flags — maps each feature to the minimum required plans
export const FEATURE_FLAGS: Record<string, PlanTier[]> = {
  // Research & Intelligence (starter+)
  reports: ["starter", "pro", "enterprise"],
  ai_report_builder: ["starter", "pro", "enterprise"], // starter is rate-limited (3/month)
  research_dashboard: ["starter", "pro", "enterprise"],

  // Campaign Execution (pro+)
  campaign_dashboard: ["pro", "enterprise"],
  ai_campaign_generation: ["pro", "enterprise"],
  channel_execution: ["pro", "enterprise"],
  posting_calendar: ["pro", "enterprise"],

  // Investor CRM & Audience (pro+)
  investor_contacts: ["pro", "enterprise"],
  investor_segments: ["pro", "enterprise"],
  crm_timeline: ["pro", "enterprise"],

  // Governance & Approvals
  approval_queue_standard: ["pro", "enterprise"], // single-step
  campaign_analytics: ["pro", "enterprise"],
  standard_exports: ["pro", "enterprise"],

  // Enterprise-only
  enrichment_connectors: ["enterprise"],
  multi_step_approvals: ["enterprise"],
  compliance_holds: ["enterprise"],
  role_based_permissions: ["enterprise"],
  ir_analytics_workspace: ["enterprise"],
  audit_exports: ["enterprise"],
  board_exports: ["enterprise"],
  crm_api_integrations: ["enterprise"],
  deal_room_hooks: ["enterprise"],
};

// Seat limits per plan
export const SEAT_LIMITS: Record<PlanTier, number | null> = {
  starter: 1,
  pro: 3,
  enterprise: null, // configurable via Stripe customer metadata `seats_limit`
};

// AI Report Builder monthly limit for Starter
export const AI_REPORT_MONTHLY_LIMIT: Record<PlanTier, number | null> = {
  starter: 3,
  pro: null, // unlimited
  enterprise: null, // unlimited
};

// Price IDs mapped to plan tiers (server-side only, no NEXT_PUBLIC prefix for secret mapping)
export function getPlanTierFromPriceId(priceId: string): PlanTier | null {
  if (!priceId) return null;

  const starterMonthly = process.env.STRIPE_PRICE_STARTER_MONTHLY || "";
  const starterAnnual = process.env.STRIPE_PRICE_STARTER_ANNUAL || "";
  const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || process.env.NEXT_PUBLIC_STRIPE_PRICE_SINGLE || "";
  const proAnnual = process.env.STRIPE_PRICE_PRO_ANNUAL || "";
  const enterpriseMonthly = process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || "";
  const enterpriseAnnual = process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || "";

  if (priceId === starterMonthly || priceId === starterAnnual) return "starter";
  if (priceId === proMonthly || priceId === proAnnual) return "pro";
  if (priceId === enterpriseMonthly || priceId === enterpriseAnnual) return "enterprise";

  return null;
}

// Check if a given plan meets the minimum required plan
export function planMeetsMinimum(
  userPlan: string | null | undefined,
  minimumPlan: PlanTier,
): boolean {
  if (!userPlan) return false;
  const rank = PLAN_RANK[userPlan as PlanTier];
  if (rank === undefined) return false;
  return rank >= PLAN_RANK[minimumPlan];
}

// Check if a plan has access to a specific feature
export function planHasFeature(
  userPlan: string | null | undefined,
  feature: string,
): boolean {
  const allowedPlans = FEATURE_FLAGS[feature];
  if (!allowedPlans) return false;
  if (!userPlan) return false;
  return allowedPlans.includes(userPlan as PlanTier);
}

// Get the minimum plan required for a feature (for upgrade prompt messaging)
export function getMinimumPlanForFeature(feature: string): PlanTier | null {
  const allowedPlans = FEATURE_FLAGS[feature];
  if (!allowedPlans || allowedPlans.length === 0) return null;

  const sorted = [...allowedPlans].sort(
    (a, b) => PLAN_RANK[a] - PLAN_RANK[b],
  );
  return sorted[0];
}

// Generate upgrade prompt message
export function getUpgradeMessage(
  currentPlan: string | null | undefined,
  requiredPlan: PlanTier,
): { message: string; cta: string } {
  if (requiredPlan === "enterprise") {
    return {
      message: `This feature is available on Enterprise and above.`,
      cta: "Talk to Enterprise Sales",
    };
  }
  return {
    message: `This feature is available on ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} and above.`,
    cta: `Upgrade to ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}`,
  };
}
