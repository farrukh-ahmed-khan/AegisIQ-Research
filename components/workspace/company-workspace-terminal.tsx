import Link from "next/link";
import type { CompanyWorkspaceTerminalViewModel } from "../../types/workspace";
import styles from "./company-workspace-terminal.module.css";
import {
  createWorkspaceDocumentAction,
  createWorkspaceNoteAction,
  deleteWorkspaceNoteAction,
  updateWorkspaceNoteAction,
  uploadWorkspaceDocumentAction,
} from "../../app/workspace/[symbol]/actions";

interface CompanyWorkspaceTerminalProps {
  data: CompanyWorkspaceTerminalViewModel;
}

function formatCurrency(value: number | null, currency: string): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function formatFileSize(value: number | null): string {
  if (value === null || value <= 0) {
    return "—";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function Card({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {description ? (
            <p className={styles.subtleText}>{description}</p>
          ) : null}
        </div>
        {action ? <div className={styles.shrink0}>{action}</div> : null}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.labelText}>{title}</p>
      <p className={styles.subtleText}>{body}</p>
    </div>
  );
}

function CreateNoteForm({ symbol }: { symbol: string }) {
  return (
    <details className={styles.detailsPanel}>
      <summary className={styles.detailsSummary}>Add note</summary>
      <form action={createWorkspaceNoteAction} className={styles.formGrid}>
        <input type="hidden" name="symbol" value={symbol} />
        <div className={styles.fieldGroup}>
          <label htmlFor="workspace-note-title" className={styles.fieldLabel}>
            Title
          </label>
          <input
            id="workspace-note-title"
            name="title"
            required
            maxLength={140}
            className={styles.fieldInput}
            placeholder="Investment thesis update"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="workspace-note-body" className={styles.fieldLabel}>
            Body
          </label>
          <textarea
            id="workspace-note-body"
            name="bodyMd"
            rows={5}
            className={styles.fieldInput}
            placeholder="Key catalysts, risks, valuation thoughts, and management observations."
          />
        </div>
        <label className={styles.inlineCheck}>
          <input type="checkbox" name="isPinned" className={styles.checkbox} />
          Pin note
        </label>
        <div>
          <button type="submit" className={styles.primaryButton}>
            Save Note
          </button>
        </div>
      </form>
    </details>
  );
}

function CreateDocumentForm({ symbol }: { symbol: string }) {
  return (
    <details className={styles.detailsPanel}>
      <summary className={styles.detailsSummary}>Link document</summary>
      <form action={createWorkspaceDocumentAction} className={styles.formGrid}>
        <input type="hidden" name="symbol" value={symbol} />
        <div className={styles.fieldGroup}>
          <label
            htmlFor="workspace-document-title"
            className={styles.fieldLabel}
          >
            Title
          </label>
          <input
            id="workspace-document-title"
            name="title"
            required
            maxLength={180}
            className={styles.fieldInput}
            placeholder="Q4 earnings transcript"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label
            htmlFor="workspace-document-kind"
            className={styles.fieldLabel}
          >
            Kind
          </label>
          <select
            id="workspace-document-kind"
            name="kind"
            defaultValue="other"
            className={styles.fieldInput}
          >
            <option value="report">Report</option>
            <option value="filing">Filing</option>
            <option value="model">Model</option>
            <option value="transcript">Transcript</option>
            <option value="deck">Deck</option>
            <option value="memo">Memo</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="workspace-document-url" className={styles.fieldLabel}>
            Source URL
          </label>
          <input
            id="workspace-document-url"
            name="sourceUrl"
            type="url"
            className={styles.fieldInput}
            placeholder="https://..."
          />
        </div>
        <div className={styles.twoColGrid}>
          <div className={styles.fieldGroup}>
            <label
              htmlFor="workspace-document-provider"
              className={styles.fieldLabel}
            >
              Provider
            </label>
            <input
              id="workspace-document-provider"
              name="sourceProvider"
              maxLength={80}
              className={styles.fieldInput}
              placeholder="SEC, IR site, Internal"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label
              htmlFor="workspace-document-mimetype"
              className={styles.fieldLabel}
            >
              MIME Type
            </label>
            <input
              id="workspace-document-mimetype"
              name="mimeType"
              maxLength={120}
              className={styles.fieldInput}
              placeholder="application/pdf"
            />
          </div>
        </div>
        <div>
          <button type="submit" className={styles.primaryButton}>
            Save Document
          </button>
        </div>
      </form>
    </details>
  );
}

function UploadDocumentForm({ symbol }: { symbol: string }) {
  return (
    <details className={styles.detailsPanel}>
      <summary className={styles.detailsSummary}>Upload document</summary>
      <form action={uploadWorkspaceDocumentAction} className={styles.formGrid}>
        <input type="hidden" name="symbol" value={symbol} />
        <div className={styles.fieldGroup}>
          <label htmlFor="workspace-upload-title" className={styles.fieldLabel}>
            Title
          </label>
          <input
            id="workspace-upload-title"
            name="title"
            maxLength={180}
            className={styles.fieldInput}
            placeholder="Optional — defaults to filename"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="workspace-upload-kind" className={styles.fieldLabel}>
            Kind
          </label>
          <select
            id="workspace-upload-kind"
            name="kind"
            defaultValue="other"
            className={styles.fieldInput}
          >
            <option value="report">Report</option>
            <option value="filing">Filing</option>
            <option value="model">Model</option>
            <option value="transcript">Transcript</option>
            <option value="deck">Deck</option>
            <option value="memo">Memo</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="workspace-upload-file" className={styles.fieldLabel}>
            File
          </label>
          <input
            id="workspace-upload-file"
            name="file"
            type="file"
            required
            accept=".pdf,.txt,.csv,.docx,application/pdf,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className={styles.fileInput}
          />
        </div>
        <p className={styles.mutedXs}>
          Supported: PDF, TXT, CSV, DOCX. Max 10 MB.
        </p>
        <div>
          <button type="submit" className={styles.primaryButton}>
            Upload Document
          </button>
        </div>
      </form>
    </details>
  );
}

function EditNoteForm({
  symbol,
  noteId,
  title,
  bodyMd,
  isPinned,
}: {
  symbol: string;
  noteId: string;
  title: string;
  bodyMd: string;
  isPinned: boolean;
}) {
  return (
    <details className={styles.noteEditPanel}>
      <summary className={styles.summaryAccent}>Edit Note</summary>
      <form
        action={updateWorkspaceNoteAction}
        className={styles.formGridCompact}
      >
        <input type="hidden" name="symbol" value={symbol} />
        <input type="hidden" name="noteId" value={noteId} />

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Title</label>
          <input
            name="title"
            required
            maxLength={140}
            defaultValue={title}
            className={styles.fieldInput}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Body</label>
          <textarea
            name="bodyMd"
            rows={4}
            defaultValue={bodyMd}
            className={styles.fieldInput}
          />
        </div>

        <label className={styles.inlineCheck}>
          <input
            type="checkbox"
            name="isPinned"
            defaultChecked={isPinned}
            className={styles.checkbox}
          />
          Pin note
        </label>

        <div>
          <button type="submit" className={styles.primaryButton}>
            Update Note
          </button>
        </div>
      </form>
    </details>
  );
}

function DeleteNoteForm({
  symbol,
  noteId,
}: {
  symbol: string;
  noteId: string;
}) {
  return (
    <details className={styles.noteDeletePanel}>
      <summary className={styles.summaryDanger}>Delete Note</summary>
      <form
        action={deleteWorkspaceNoteAction}
        className={styles.formGridCompactDanger}
      >
        <input type="hidden" name="symbol" value={symbol} />
        <input type="hidden" name="noteId" value={noteId} />

        <div className={styles.fieldLabel}>
          Type <span className={styles.dangerTextStrong}>DELETE</span> to
          confirm permanent removal.
        </div>

        <input
          name="confirmation"
          required
          maxLength={12}
          className={styles.fieldInput}
          placeholder="DELETE"
        />

        <div>
          <button type="submit" className={styles.dangerButton}>
            Confirm Delete
          </button>
        </div>
      </form>
    </details>
  );
}

export function CompanyWorkspaceTerminal({
  data,
}: CompanyWorkspaceTerminalProps) {
  const latestValuation = data.valuations[0];
  const latestReport = data.reports[0];

  return (
    <div className={`${styles.terminalTheme}`}>
      <div className={`${styles.shell} `}>
        <header className={`${styles.hero}`}>
          <div className={styles.heroLayout}>
            <div className={styles.stackMd}>
              <div className={`${styles.heroBadge} `}>
                Company Workspace Terminal
              </div>

              <div>
                <div className={styles.inlineWrap}>
                  <h1 className={styles.symbolTitle}>
                    {data?.workspace?.symbol}
                  </h1>
                  {data.workspace?.exchange ? (
                    <span className={styles.pill}>
                      {data.workspace?.exchange}
                    </span>
                  ) : null}
                  <span className={styles.pillSuccess}>
                    {data?.workspace?.coverageStatus}
                  </span>
                </div>
                <p className={styles.bodyText}>
                  {data?.workspace?.companyName ?? "Coverage workspace"}
                </p>
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Last Price</div>
                <div className={styles.metricValue}>
                  {formatCurrency(
                    data.workspace?.lastPrice,
                    data.workspace?.primaryCurrency,
                  )}
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Rating</div>
                <div className={styles.metricValue}>
                  {data?.workspace?.latestRating ?? "—"}
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Target Price</div>
                <div className={styles.metricValue}>
                  {formatCurrency(
                    data?.workspace?.latestTargetPrice,
                    data?.workspace?.primaryCurrency,
                  )}
                </div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Updated</div>
                <div className={styles.metricSubValue}>
                  {formatDateTime(data?.workspace?.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.actionRow}>
            <Link
              href={`/reports/new?symbol=${encodeURIComponent(data?.workspace?.symbol)}`}
              className={styles.primaryButton}
            >
              Generate Report
            </Link>
            <Link
              href={`/valuation?symbol=${encodeURIComponent(data?.workspace?.symbol)}`}
              className={styles.secondaryButton}
            >
              Open Valuation
            </Link>
            <Link
              href={`/ai-analyst?symbol=${encodeURIComponent(data?.workspace?.symbol)}`}
              className={styles.secondaryButton}
            >
              AI Analyst
            </Link>
          </div>
        </header>

        <div className={styles.twoPanelGrid}>
          <Card
            title="Research Pipeline"
            description="Core research status for this coverage name."
          >
            <div className={styles.kpiGrid}>
              <div className={styles.surfaceCard}>
                <div className={styles.metricLabel}>Latest Valuation</div>
                <div className={styles.kpiValue}>
                  {latestValuation
                    ? formatCurrency(
                        latestValuation?.fairValue,
                        data?.workspace?.primaryCurrency,
                      )
                    : "—"}
                </div>
                <div className={styles.subtleText}>
                  {latestValuation
                    ? latestValuation.modelName
                    : "No snapshot saved"}
                </div>
              </div>

              <div className={styles.surfaceCard}>
                <div className={styles.metricLabel}>Upside / Downside</div>
                <div className={styles.kpiValue}>
                  {latestValuation
                    ? formatPercent(latestValuation.upsideDownsidePct)
                    : "—"}
                </div>
                <div className={styles.subtleText}>
                  Relative to latest market price
                </div>
              </div>

              <div className={styles.surfaceCard}>
                <div className={styles.metricLabel}>Latest Report Run</div>
                <div className={styles.kpiValueCaps}>
                  {latestReport?.status ?? "—"}
                </div>
                <div className={styles.subtleText}>
                  {latestReport
                    ? formatDateTime(latestReport.createdAt)
                    : "No report runs yet"}
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Terminal Actions"
            description="Fast launch points for the existing platform modules."
          >
            <div className={styles.stackSm}>
              <Link
                href={`/reports/new?symbol=${encodeURIComponent(data.workspace.symbol)}`}
                className={styles.actionCard}
              >
                <div className={styles.cardTitle}>New Institutional Report</div>
                <div className={styles.subtleText}>
                  Launch report generation with the current symbol preloaded.
                </div>
              </Link>

              <Link
                href={`/reports?symbol=${encodeURIComponent(data.workspace.symbol)}`}
                className={styles.actionCard}
              >
                <div className={styles.cardTitle}>Report History</div>
                <div className={styles.subtleText}>
                  Review previous report runs and exported PDFs.
                </div>
              </Link>

              <Link
                href={`/ai-analyst?symbol=${encodeURIComponent(data.workspace.symbol)}`}
                className={styles.actionCard}
              >
                <div className={styles.cardTitle}>AI Analyst Session</div>
                <div className={styles.subtleText}>
                  Open analyst Q&A and research drafting for this company.
                </div>
              </Link>
            </div>
          </Card>
        </div>

        <div className={styles.threePanelGrid}>
          <Card
            title="Research Notes"
            description="Pinned and recent internal note coverage."
            action={<CreateNoteForm symbol={data.workspace.symbol} />}
          >
            {data.notes.length === 0 ? (
              <EmptyState
                title="No notes yet"
                body="Use this workspace to centralize thesis updates, risks, catalysts, and management observations."
              />
            ) : (
              <div className={styles.stackMd}>
                {data.notes.slice(0, 8).map((note) => (
                  <div key={note.id} className={styles.surfaceCard}>
                    <div className={styles.rowBetweenStart}>
                      <div>
                        <h3 className={styles.cardTitle}>{note.title}</h3>
                        <p className={styles.metaSubtleText}>
                          Updated {formatDateTime(note.updatedAt)}
                        </p>
                      </div>
                      {note.isPinned ? (
                        <span className={styles.pillWarning}>Pinned</span>
                      ) : null}
                    </div>

                    <p className={styles.preText}>
                      {note.bodyMd || "Empty note"}
                    </p>

                    <EditNoteForm
                      symbol={data.workspace.symbol}
                      noteId={note.id}
                      title={note.title}
                      bodyMd={note.bodyMd}
                      isPinned={note.isPinned}
                    />

                    <DeleteNoteForm
                      symbol={data.workspace.symbol}
                      noteId={note.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Documents"
            description="Source materials linked to this workspace."
            action={
              <div className={styles.stackTiny}>
                <UploadDocumentForm symbol={data.workspace.symbol} />
                <CreateDocumentForm symbol={data.workspace.symbol} />
              </div>
            }
          >
            {data.documents.length === 0 ? (
              <EmptyState
                title="No documents linked"
                body="Reports, transcripts, decks, and filings will appear here once attached to the workspace."
              />
            ) : (
              <div className={styles.stackMd}>
                {data.documents.slice(0, 8).map((document) => {
                  const blobContentHref =
                    document.sourceProvider === "netlify_blobs"
                      ? `/api/workspaces/${encodeURIComponent(
                          data.workspace.symbol,
                        )}/documents/${encodeURIComponent(document.id)}/content`
                      : null;

                  return (
                    <div key={document.id} className={styles.surfaceCard}>
                      <div className={styles.rowBetweenCenter}>
                        <div className={styles.minW0}>
                          <h3 className={styles.truncateTitle}>
                            {document.title}
                          </h3>
                          <p className={styles.metaLabel}>
                            {document.kind}
                            {document.sourceProvider
                              ? ` · ${document.sourceProvider.replaceAll("_", " ")}`
                              : ""}
                          </p>
                          <div className={styles.metaRow}>
                            <span>
                              {formatFileSize(document.fileSizeBytes)}
                            </span>
                            {document.mimeType ? (
                              <span>{document.mimeType}</span>
                            ) : null}
                          </div>
                          {blobContentHref ? (
                            <a
                              href={blobContentHref}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.inlineLink}
                            >
                              Open attachment
                            </a>
                          ) : null}
                          {!blobContentHref && document.sourceUrl ? (
                            <a
                              href={document.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.inlineLink}
                            >
                              Open source
                            </a>
                          ) : null}
                        </div>
                        <span className={styles.timeStamp}>
                          {formatDate(document.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card
            title="Activity"
            description="Recent workspace events and model updates."
          >
            {data.activity.length === 0 ? (
              <EmptyState
                title="No activity yet"
                body="Workspace activity will populate as reports are generated, valuations are saved, notes are added."
              />
            ) : (
              <div className={styles.stackMd}>
                {data.activity.slice(0, 10).map((event) => (
                  <div key={event.id} className={styles.surfaceCard}>
                    <div className={styles.rowBetweenStart}>
                      <div>
                        <h3 className={styles.cardTitle}>{event.label}</h3>
                        {event.detail ? (
                          <p className={styles.bodyText}>{event.detail}</p>
                        ) : null}
                      </div>
                      <span className={styles.timeStamp}>
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card
          title="Recent Report Runs"
          description="Latest report generation jobs and PDF outputs."
        >
          {data.reports.length === 0 ? (
            <EmptyState
              title="No report runs yet"
              body="Generated reports for this symbol will appear here as they are created."
            />
          ) : (
            <div className={styles.stackSm}>
              {data.reports.map((report) => (
                <div key={report.id} className={styles.surfaceCard}>
                  <div className={styles.reportRow}>
                    <div>
                      <div className={styles.cardTitleCaps}>
                        {report.reportType.replaceAll("_", " ")}
                      </div>
                      <div className={styles.subtleText}>
                        Status:{" "}
                        <span className={styles.capitalize}>
                          {report.status}
                        </span>
                      </div>
                      <div className={styles.mutedXs}>
                        Created {formatDateTime(report.createdAt)}
                      </div>
                    </div>
                    <div className={styles.inlineGap2}>
                      {report.pdfUrl ? (
                        <a
                          href={report.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.secondaryButton}
                        >
                          Open PDF
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
