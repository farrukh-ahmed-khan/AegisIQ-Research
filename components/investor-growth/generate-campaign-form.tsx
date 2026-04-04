"use client";

import React, { useState } from "react";
import { message } from "antd";
import styles from "./generate-campaign-form.module.css";
import FormField from "./form-field";
import TextAreaField from "./text-area-field";

interface GenerateCampaignFormProps {
  onGenerate: (formData: any) => Promise<boolean>;
  isLoading?: boolean;
  className?: string;
}

export default function GenerateCampaignForm({
  onGenerate,
  isLoading = false,
  className = "",
}: GenerateCampaignFormProps) {
  const [formData, setFormData] = useState({
    ticker: "",
    company_name: "",
    campaign_objective: "",
    audience_focus: "",
    tone: "professional",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ticker.trim()) {
      newErrors.ticker = "Ticker is required";
    }
    if (!formData.company_name.trim()) {
      newErrors.company_name = "Company name is required";
    }
    if (!formData.campaign_objective.trim()) {
      newErrors.campaign_objective = "Campaign objective is required";
    }
    if (!formData.audience_focus.trim()) {
      newErrors.audience_focus = "Audience focus is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      message.error("Please fill in required fields");
      return;
    }

    const success = await onGenerate(formData);
    if (success) {
      message.success("Campaign generated successfully");
    }
  };

  return (
    <form className={`${styles.form} ${className}`} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <FormField label="Ticker Symbol" required error={errors.ticker}>
          <input
            type="text"
            value={formData.ticker}
            onChange={(e) => handleChange("ticker", e.target.value)}
            placeholder="e.g., AAPL"
            disabled={isLoading}
          />
        </FormField>

        <FormField label="Company Name" required error={errors.company_name}>
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) => handleChange("company_name", e.target.value)}
            placeholder="e.g., Apple Inc."
            disabled={isLoading}
          />
        </FormField>
      </div>

      <FormField
        label="Campaign Objective"
        required
        error={errors.campaign_objective}
      >
        <input
          type="text"
          value={formData.campaign_objective}
          onChange={(e) => handleChange("campaign_objective", e.target.value)}
          placeholder="What do you want to achieve?"
          disabled={isLoading}
        />
      </FormField>

      <FormField label="Audience Focus" required error={errors.audience_focus}>
        <input
          type="text"
          value={formData.audience_focus}
          onChange={(e) => handleChange("audience_focus", e.target.value)}
          placeholder="Who is your target audience?"
          disabled={isLoading}
        />
      </FormField>

      <FormField label="Tone">
        <select
          value={formData.tone}
          onChange={(e) => handleChange("tone", e.target.value)}
          disabled={isLoading}
        >
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="formal">Formal</option>
          <option value="urgent">Urgent</option>
        </select>
      </FormField>

      <TextAreaField
        label="Additional Notes"
        value={formData.notes}
        onChange={(e) => handleChange("notes", e.target.value)}
        placeholder="Any additional context or requirements..."
        rows={4}
        helperText="Provide any specific details that should influence the campaign strategy"
      />

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isLoading}
      >
        {isLoading ? "Generating..." : "Generate Campaign Strategy"}
      </button>
    </form>
  );
}
