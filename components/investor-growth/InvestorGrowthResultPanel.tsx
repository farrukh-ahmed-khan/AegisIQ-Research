import styles from "./InvestorGrowthResultPanel.module.css";

type GeneratedContent = {
  strategy: string;
  email_draft: string;
  sms_draft: string;
  social_post: string;
} | null;

type Props = {
  content: GeneratedContent;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  canSave: boolean;
  campaignId: string | null;
  error: string;
};

const sections = [
  {
    title: "Strategy",
    key: "strategy" as const,
    placeholder: "AI generated strategy will appear here",
  },
  {
    title: "Email Draft",
    key: "email_draft" as const,
    placeholder: "AI generated email draft will appear here",
  },
  {
    title: "SMS Draft",
    key: "sms_draft" as const,
    placeholder: "AI generated SMS draft will appear here",
  },
  {
    title: "Social Post",
    key: "social_post" as const,
    placeholder: "AI generated social post will appear here",
  },
];

export default function InvestorGrowthResultPanel({
  content,
  isLoading,
  isSaving,
  onSave,
  canSave,
  campaignId,
  error,
}: Props) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Generated Output</h2>

      {content && !isLoading ? (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => void onSave()}
            disabled={!canSave || isSaving}
          >
            {isSaving
              ? "Saving..."
              : canSave
                ? "Save Campaign"
                : "Campaign Saved"}
          </button>
          {campaignId ? (
            <p className={styles.savedText}>Saved Campaign ID: {campaignId}</p>
          ) : null}
        </div>
      ) : null}

      {isLoading && (
        <div className={styles.loadingState}>
          <p className={styles.loadingText}>Generating strategy...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}

      {!isLoading && !content && !error && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            Fill in the form and click "Generate Strategy" to create campaign
            content
          </p>
        </div>
      )}

      {content && !isLoading && (
        <div className={styles.stack}>
          {sections.map((section) => (
            <article key={section.title} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              <p className={styles.content}>
                {content[section.key] || section.placeholder}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
