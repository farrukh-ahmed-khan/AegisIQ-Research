"use client";

import { useState } from "react";
import styles from "./InvestorGrowthForm.module.css";

type FormState = {
  ticker: string;
  company_name: string;
  campaign_objective: string;
  audience_focus: string;
  tone: string;
  notes: string;
};

type Props = {
  onSubmit: (formData: FormState) => Promise<boolean>;
  isLoading: boolean;
};

const initialState: FormState = {
  ticker: "",
  company_name: "",
  campaign_objective: "",
  audience_focus: "",
  tone: "",
  notes: "",
};

export default function InvestorGrowthForm({ onSubmit, isLoading }: Props) {
  const [formData, setFormData] = useState<FormState>(initialState);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(formData);
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h2 className={styles.title}>Campaign Input</h2>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Ticker</span>
          <input
            className={styles.input}
            value={formData.ticker}
            onChange={(e) => onChange("ticker", e.target.value.toUpperCase())}
            placeholder="AAPL"
            disabled={isLoading}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Company Name</span>
          <input
            className={styles.input}
            value={formData.company_name}
            onChange={(e) => onChange("company_name", e.target.value)}
            placeholder="Apple Inc."
            disabled={isLoading}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Campaign Objective</span>
        <input
          className={styles.input}
          value={formData.campaign_objective}
          onChange={(e) => onChange("campaign_objective", e.target.value)}
          placeholder="Institutional investor outreach"
          disabled={isLoading}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Audience Focus</span>
        <input
          className={styles.input}
          value={formData.audience_focus}
          onChange={(e) => onChange("audience_focus", e.target.value)}
          placeholder="Long-only funds"
          disabled={isLoading}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Tone</span>
        <input
          className={styles.input}
          value={formData.tone}
          onChange={(e) => onChange("tone", e.target.value)}
          placeholder="Professional, concise"
          disabled={isLoading}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Notes</span>
        <textarea
          className={styles.textarea}
          value={formData.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Add context for the strategy engine..."
          disabled={isLoading}
        />
      </label>

      <button type="submit" className={styles.button} disabled={isLoading}>
        {isLoading ? "Generating Strategy..." : "Generate Strategy"}
      </button>
    </form>
  );
}
