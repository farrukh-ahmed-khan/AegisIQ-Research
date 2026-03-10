export type WorkspaceDocumentKind =
  | "report"
  | "filing"
  | "model"
  | "transcript"
  | "deck"
  | "memo"
  | "other";

export type WorkspaceDocumentSourceProvider =
  | "external_url"
  | "netlify_blobs"
  | "manual"
  | "unknown";

export type WorkspaceActivityKind =
  | "workspace_created"
  | "note_created"
  | "note_updated"
  | "note_deleted"
  | "document_added"
  | "report_generated"
  | "valuation_saved"
  | "terminal_opened"
  | "screener_saved";

export type ReportRunStatus = "queued" | "running" | "completed" | "failed";

export interface CompanyWorkspace {
  id: string;
  clerkUserId: string;
  symbol: string;
  companyName: string | null;
  exchange: string | null;
  primaryCurrency: string;
  coverageStatus: string;
  lastPrice: number | null;
  lastPriceAt: string | null;
  latestRating: string | null;
  latestTargetPrice: number | null;
  latestReportId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceNote {
  id: string;
  workspaceId: string;
  clerkUserId: string;
  title: string;
  bodyMd: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDocument {
  id: string;
  workspaceId: string;
  clerkUserId: string;
  title: string;
  kind: WorkspaceDocumentKind;
  sourceUrl: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sourceProvider: WorkspaceDocumentSourceProvider | null;
  fileSizeBytes: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ValuationSnapshot {
  id: string;
  workspaceId: string;
  clerkUserId: string;
  modelName: string;
  fairValue: number | null;
  priceTarget: number | null;
  upsideDownsidePct: number | null;
  assumptions: Record<string, unknown>;
  outputs: Record<string, unknown>;
  createdAt: string;
}

export interface ReportRun {
  id: string;
  workspaceId: string | null;
  clerkUserId: string;
  symbol: string;
  reportType: string;
  status: ReportRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  pdfUrl: string | null;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  clerkUserId: string;
  kind: WorkspaceActivityKind;
  label: string;
  detail: string | null;
  actorName: string | null;
  actorClerkUserId: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ScreenerPreset {
  id: string;
  clerkUserId: string;
  name: string;
  description: string | null;
  filters: Record<string, unknown>;
  columns: string[];
  sort: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenerPresetInput {
  name: string;
  description?: string | null;
  filters?: Record<string, unknown>;
  columns?: string[];
  sort?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface UpdateScreenerPresetInput {
  name?: string;
  description?: string | null;
  filters?: Record<string, unknown>;
  columns?: string[];
  sort?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface Watchlist {
  id: string;
  clerkUserId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistInput {
  name: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface UpdateWatchlistInput {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  symbol: string;
  companyName: string | null;
  exchange: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreateWatchlistItemInput {
  symbol: string;
  companyName?: string | null;
  exchange?: string | null;
  sortOrder?: number | null;
}

export interface CompanyWorkspaceTerminalViewModel {
  workspace: Pick<
    CompanyWorkspace,
    | "symbol"
    | "companyName"
    | "exchange"
    | "coverageStatus"
    | "primaryCurrency"
    | "lastPrice"
    | "lastPriceAt"
    | "latestRating"
    | "latestTargetPrice"
    | "updatedAt"
  >;
  notes: WorkspaceNote[];
  documents: WorkspaceDocument[];
  valuations: ValuationSnapshot[];
  reports: ReportRun[];
  activity: WorkspaceActivity[];
}

export interface CreateWorkspaceNoteInput {
  title: string;
  bodyMd: string;
  isPinned?: boolean;
}

export interface CreateWorkspaceDocumentInput {
  title: string;
  kind: WorkspaceDocumentKind;
  sourceUrl?: string | null;
  sourceProvider?: WorkspaceDocumentSourceProvider | null;
  mimeType?: string | null;
  storagePath?: string | null;
  fileSizeBytes?: number | null;
  metadata?: Record<string, unknown>;
}
