"use client";

import type { PlanTier } from "@/lib/plan-access";
import styles from "./UpgradePrompt.module.css";

interface UpgradePromptProps {
  featureName: string;
  requiredPlan: PlanTier;
  currentPlan?: PlanTier | null;
}

export default function UpgradePrompt({
  featureName,
  requiredPlan,
  currentPlan,
}: UpgradePromptProps) {
  const planLabel =
    requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);
  const isEnterpriseRequired = requiredPlan === "enterprise";

  const ctaLabel = isEnterpriseRequired
    ? "Talk to Enterprise Sales"
    : `Upgrade to ${planLabel}`;

  const ctaHref = isEnterpriseRequired ? "/enterprise-inquiry" : "/pricing";

  return (
    <div className={styles.container}>
      <div className={styles.iconWrap}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 className={styles.title}>{featureName} is locked</h3>
      <p className={styles.message}>
        {featureName} is available on{" "}
        <strong>{planLabel}</strong> and above.
        {currentPlan ? (
          <>
            {" "}
            You are currently on{" "}
            <strong>
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </strong>
            .
          </>
        ) : null}
      </p>
      <a href={ctaHref} className={styles.cta}>
        {ctaLabel}
      </a>
    </div>
  );
}
