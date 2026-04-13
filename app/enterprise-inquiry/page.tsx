"use client";

import { useState } from "react";
import styles from "./enterprise-inquiry.module.css";

type FormState = "idle" | "submitting" | "success" | "error";

export default function EnterpriseInquiryPage() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("submitting");
    setErrorMsg("");

    const data = new FormData(event.currentTarget);
    const payload = {
      name: data.get("name") as string,
      company: data.get("company") as string,
      role: data.get("role") as string,
      email: data.get("email") as string,
      numUsers: data.get("numUsers") as string,
      useCase: data.get("useCase") as string,
    };

    try {
      const res = await fetch("/api/enterprise-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error || "Submission failed.",
        );
      }

      setFormState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successBox}>
            <span className={styles.successIcon}>✓</span>
            <h1 className={styles.successTitle}>We received your inquiry</h1>
            <p className={styles.successText}>
              Our team will reach out within 1 business day to discuss your
              Enterprise setup. In the meantime, feel free to{" "}
              <a href="/features" className={styles.link}>
                explore features
              </a>{" "}
              or{" "}
              <a href="/dashboard" className={styles.link}>
                sign in to your account
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.badge}>Enterprise</span>
          <h1 className={styles.heading}>Talk to Sales</h1>
          <p className={styles.subtitle}>
            Enterprise plans are activated through our sales team after deal
            close — not via self-serve checkout. Fill out the form below and we
            will be in touch within 1 business day.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Full name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className={styles.input}
                placeholder="Jane Smith"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="company" className={styles.label}>
                Company *
              </label>
              <input
                id="company"
                name="company"
                type="text"
                required
                className={styles.input}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="role" className={styles.label}>
                Your role *
              </label>
              <input
                id="role"
                name="role"
                type="text"
                required
                className={styles.input}
                placeholder="VP of Investor Relations"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Work email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={styles.input}
                placeholder="jane@acme.com"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="numUsers" className={styles.label}>
              Number of users / seats needed *
            </label>
            <input
              id="numUsers"
              name="numUsers"
              type="text"
              required
              className={styles.input}
              placeholder="e.g. 10–25"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="useCase" className={styles.label}>
              Describe your use case *
            </label>
            <textarea
              id="useCase"
              name="useCase"
              required
              rows={5}
              className={styles.textarea}
              placeholder="Tell us what you're trying to accomplish with AegisIQ Enterprise — investor comms, compliance workflows, board reporting, etc."
            />
          </div>

          {formState === "error" && errorMsg ? (
            <p className={styles.errorMsg}>{errorMsg}</p>
          ) : null}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={formState === "submitting"}
          >
            {formState === "submitting" ? "Sending..." : "Submit Inquiry"}
          </button>

          <p className={styles.disclaimer}>
            By submitting, you agree to be contacted by our sales team. We will
            never spam you.
          </p>
        </form>
      </div>
    </div>
  );
}
