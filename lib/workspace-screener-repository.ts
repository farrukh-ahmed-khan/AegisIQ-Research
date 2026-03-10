import { sql } from "@/lib/db";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface ScreenerPresetRecord {
  id: string;
  clerkUserId: string;
  name: string;
  description: string | null;
  filters: JsonValue;
  sort: JsonValue | null;
  columns: JsonValue | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenerPresetRecordInput {
  name: string;
  description?: string | null;
  filters: JsonValue;
  sort?: JsonValue | null;
  columns?: JsonValue | null;
  isDefault?: boolean;
}

export interface UpdateScreenerPresetRecordInput {
  name?: string;
  description?: string | null;
  filters?: JsonValue;
  sort?: JsonValue | null;
  columns?: JsonValue | null;
  isDefault?: boolean;
}

export interface WatchlistRecord {
  id: string;
  clerkUserId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistRecordInput {
  name: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface UpdateWatchlistRecordInput {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface WatchlistItemRecord {
  id: string;
  watchlistId: string;
  clerkUserId: string;
  symbol: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistItemRecordInput {
  symbol: string;
}

type ScreenerPresetRow = {
  id: string;
  clerk_user_id: string;
  name: string;
  description: string | null;
  filters: JsonValue;
  sort: JsonValue | null;
  columns: JsonValue | null;
  is_default: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type WatchlistRow = {
  id: string;
  clerk_user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type WatchlistItemRow = {
  id: string;
  watchlist_id: string;
  clerk_user_id: string;
  symbol: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapPreset(row: ScreenerPresetRow): ScreenerPresetRecord {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    name: row.name,
    description: row.description,
    filters: row.filters,
    sort: row.sort,
    columns: row.columns,
    isDefault: row.is_default,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapWatchlist(row: WatchlistRow): WatchlistRecord {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    name: row.name,
    description: row.description,
    isDefault: row.is_default,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapWatchlistItem(row: WatchlistItemRow): WatchlistItemRecord {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    clerkUserId: row.clerk_user_id,
    symbol: row.symbol,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
}

function assertNonEmptyName(value: string, fieldName: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName}_required`);
  }

  if (trimmed.length > 120) {
    throw new Error(`${fieldName}_too_long`);
  }

  return trimmed;
}

function normalizeDescription(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 1000);
}

async function shouldBecomeDefaultPreset(clerkUserId: string, requestedDefault?: boolean): Promise<boolean> {
  if (requestedDefault) {
    return true;
  }

  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM screener_presets
    WHERE clerk_user_id = ${clerkUserId}
  `;

  return Number(rows[0]?.count ?? "0") === 0;
}

async function shouldBecomeDefaultWatchlist(clerkUserId: string, requestedDefault?: boolean): Promise<boolean> {
  if (requestedDefault) {
    return true;
  }

  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM watchlists
    WHERE clerk_user_id = ${clerkUserId}
  `;

  return Number(rows[0]?.count ?? "0") === 0;
}

async function clearOtherDefaultPresets(clerkUserId: string, activePresetId?: string): Promise<void> {
  if (activePresetId) {
    await sql`
      UPDATE screener_presets
      SET is_default = FALSE,
          updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId}
        AND id <> ${activePresetId}
        AND is_default = TRUE
    `;

    return;
  }

  await sql`
    UPDATE screener_presets
    SET is_default = FALSE,
        updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId}
      AND is_default = TRUE
  `;
}

async function clearOtherDefaultWatchlists(clerkUserId: string, activeWatchlistId?: string): Promise<void> {
  if (activeWatchlistId) {
    await sql`
      UPDATE watchlists
      SET is_default = FALSE,
          updated_at = NOW()
      WHERE clerk_user_id = ${clerkUserId}
        AND id <> ${activeWatchlistId}
        AND is_default = TRUE
    `;

    return;
  }

  await sql`
    UPDATE watchlists
    SET is_default = FALSE,
        updated_at = NOW()
    WHERE clerk_user_id = ${clerkUserId}
      AND is_default = TRUE
  `;
}

export async function listScreenerPresets(clerkUserId: string): Promise<ScreenerPresetRecord[]> {
  const rows = await sql<ScreenerPresetRow[]>`
    SELECT
      id,
      clerk_user_id,
      name,
      description,
      filters,
      sort,
      columns,
      is_default,
      created_at,
      updated_at
    FROM screener_presets
    WHERE clerk_user_id = ${clerkUserId}
    ORDER BY is_default DESC, updated_at DESC, created_at DESC
  `;

  return rows.map(mapPreset);
}

export async function createScreenerPreset(
  clerkUserId: string,
  input: CreateScreenerPresetRecordInput,
): Promise<ScreenerPresetRecord> {
  const name = assertNonEmptyName(input.name, "name");
  const description = normalizeDescription(input.description);
  const isDefault = await shouldBecomeDefaultPreset(clerkUserId, input.isDefault);

  if (isDefault) {
    await clearOtherDefaultPresets(clerkUserId);
  }

  const rows = await sql<ScreenerPresetRow[]>`
    INSERT INTO screener_presets (
      clerk_user_id,
      name,
      description,
      filters,
      sort,
      columns,
      is_default
    )
    VALUES (
      ${clerkUserId},
      ${name},
      ${description},
      ${JSON.stringify(input.filters)},
      ${input.sort == null ? null : JSON.stringify(input.sort)},
      ${input.columns == null ? null : JSON.stringify(input.columns)},
      ${isDefault}
    )
    RETURNING
      id,
      clerk_user_id,
      name,
      description,
      filters,
      sort,
      columns,
      is_default,
      created_at,
      updated_at
  `;

  return mapPreset(rows[0]);
}

export async function updateScreenerPreset(
  clerkUserId: string,
  presetId: string,
  input: UpdateScreenerPresetRecordInput,
): Promise<ScreenerPresetRecord | null> {
  const existingRows = await sql<ScreenerPresetRow[]>`
    SELECT
      id,
      clerk_user_id,
      name,
      description,
      filters,
      sort,
      columns,
      is_default,
      created_at,
      updated_at
    FROM screener_presets
    WHERE id = ${presetId}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  const existing = existingRows[0];

  if (!existing) {
    return null;
  }

  const nextName =
    typeof input.name === "string" ? assertNonEmptyName(input.name, "name") : existing.name;

  const nextDescription =
    input.description !== undefined ? normalizeDescription(input.description) : existing.description;

  const nextFilters = input.filters !== undefined ? input.filters : existing.filters;
  const nextSort = input.sort !== undefined ? input.sort : existing.sort;
  const nextColumns = input.columns !== undefined ? input.columns : existing.columns;
  const nextIsDefault = input.isDefault ?? existing.is_default;

  if (nextIsDefault) {
    await clearOtherDefaultPresets(clerkUserId, presetId);
  }

  const rows = await sql<ScreenerPresetRow[]>`
    UPDATE screener_presets
    SET
      name = ${nextName},
      description = ${nextDescription},
      filters = ${JSON.stringify(nextFilters)},
      sort = ${nextSort == null ? null : JSON.stringify(nextSort)},
      columns = ${nextColumns == null ? null : JSON.stringify(nextColumns)},
      is_default = ${nextIsDefault},
      updated_at = NOW()
    WHERE id = ${presetId}
      AND clerk_user_id = ${clerkUserId}
    RETURNING
      id,
      clerk_user_id,
      name,
      description,
      filters,
      sort,
      columns,
      is_default,
      created_at,
      updated_at
  `;

  return rows[0] ? mapPreset(rows[0]) : null;
}

export async function deleteScreenerPreset(clerkUserId: string, presetId: string): Promise<boolean> {
  const existingRows = await sql<{ is_default: boolean }[]>`
    SELECT is_default
    FROM screener_presets
    WHERE id = ${presetId}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  const existing = existingRows[0];

  if (!existing) {
    return false;
  }

  await sql`
    DELETE FROM screener_presets
    WHERE id = ${presetId}
      AND clerk_user_id = ${clerkUserId}
  `;

  if (existing.is_default) {
    const fallbackRows = await sql<{ id: string }[]>`
      SELECT id
      FROM screener_presets
      WHERE clerk_user_id = ${clerkUserId}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `;

    const fallbackId = fallbackRows[0]?.id;

    if (fallbackId) {
      await clearOtherDefaultPresets(clerkUserId, fallbackId);

      await sql`
        UPDATE screener_presets
        SET is_default = TRUE,
            updated_at = NOW()
        WHERE id = ${fallbackId}
          AND clerk_user_id = ${clerkUserId}
      `;
    }
  }

  return true;
}

export async function listWatchlists(clerkUserId: string): Promise<WatchlistRecord[]> {
  const rows = await sql<WatchlistRow[]>`
    SELECT
      id,
      clerk_user_id,
      name,
      description,
      is_default,
      created_at,
      updated_at
    FROM watchlists
    WHERE clerk_user_id = ${clerkUserId}
    ORDER BY is_default DESC, updated_at DESC, created_at DESC
  `;

  return rows.map(mapWatchlist);
}

export async function createWatchlist(
  clerkUserId: string,
  input: CreateWatchlistRecordInput,
): Promise<WatchlistRecord> {
  const name = assertNonEmptyName(input.name, "name");
  const description = normalizeDescription(input.description);
  const isDefault = await shouldBecomeDefaultWatchlist(clerkUserId, input.isDefault);

  if (isDefault) {
    await clearOtherDefaultWatchlists(clerkUserId);
  }

  const rows = await sql<WatchlistRow[]>`
    INSERT INTO watchlists (
      clerk_user_id,
      name,
      description,
      is_default
    )
    VALUES (
      ${clerkUserId},
      ${name},
      ${description},
      ${isDefault}
    )
    RETURNING
      id,
      clerk_user_id,
      name,
      description,
      is_default,
      created_at,
      updated_at
  `;

  return mapWatchlist(rows[0]);
}

export async function updateWatchlist(
  clerkUserId: string,
  watchlistId: string,
  input: UpdateWatchlistRecordInput,
): Promise<WatchlistRecord | null> {
  const existingRows = await sql<WatchlistRow[]>`
    SELECT
      id,
      clerk_user_id,
      name,
      description,
      is_default,
      created_at,
      updated_at
    FROM watchlists
    WHERE id = ${watchlistId}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  const existing = existingRows[0];

  if (!existing) {
    return null;
  }

  const nextName =
    typeof input.name === "string" ? assertNonEmptyName(input.name, "name") : existing.name;

  const nextDescription =
    input.description !== undefined ? normalizeDescription(input.description) : existing.description;

  const nextIsDefault = input.isDefault ?? existing.is_default;

  if (nextIsDefault) {
    await clearOtherDefaultWatchlists(clerkUserId, watchlistId);
  }

  const rows = await sql<WatchlistRow[]>`
    UPDATE watchlists
    SET
      name = ${nextName},
      description = ${nextDescription},
      is_default = ${nextIsDefault},
      updated_at = NOW()
    WHERE id = ${watchlistId}
      AND clerk_user_id = ${clerkUserId}
    RETURNING
      id,
      clerk_user_id,
      name,
      description,
      is_default,
      created_at,
      updated_at
  `;

  return rows[0] ? mapWatchlist(rows[0]) : null;
}

export async function deleteWatchlist(clerkUserId: string, watchlistId: string): Promise<boolean> {
  const existingRows = await sql<{ is_default: boolean }[]>`
    SELECT is_default
    FROM watchlists
    WHERE id = ${watchlistId}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  const existing = existingRows[0];

  if (!existing) {
    return false;
  }

  await sql`
    DELETE FROM watchlists
    WHERE id = ${watchlistId}
      AND clerk_user_id = ${clerkUserId}
  `;

  if (existing.is_default) {
    const fallbackRows = await sql<{ id: string }[]>`
      SELECT id
      FROM watchlists
      WHERE clerk_user_id = ${clerkUserId}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `;

    const fallbackId = fallbackRows[0]?.id;

    if (fallbackId) {
      await clearOtherDefaultWatchlists(clerkUserId, fallbackId);

      await sql`
        UPDATE watchlists
        SET is_default = TRUE,
            updated_at = NOW()
        WHERE id = ${fallbackId}
          AND clerk_user_id = ${clerkUserId}
      `;
    }
  }

  return true;
}

export async function listWatchlistItems(
  clerkUserId: string,
  watchlistId: string,
): Promise<WatchlistItemRecord[]> {
  const rows = await sql<WatchlistItemRow[]>`
    SELECT
      id,
      watchlist_id,
      clerk_user_id,
      symbol,
      created_at,
      updated_at
    FROM watchlist_items
    WHERE clerk_user_id = ${clerkUserId}
      AND watchlist_id = ${watchlistId}
    ORDER BY symbol ASC
  `;

  return rows.map(mapWatchlistItem);
}

export async function addWatchlistItem(
  clerkUserId: string,
  watchlistId: string,
  input: CreateWatchlistItemRecordInput,
): Promise<WatchlistItemRecord> {
  const normalizedSymbol = normalizeSymbol(input.symbol);

  if (!normalizedSymbol) {
    throw new Error("symbol_required");
  }

  const watchlistRows = await sql<{ id: string }[]>`
    SELECT id
    FROM watchlists
    WHERE id = ${watchlistId}
      AND clerk_user_id = ${clerkUserId}
    LIMIT 1
  `;

  if (!watchlistRows[0]) {
    throw new Error("watchlist_not_found");
  }

  const existingRows = await sql<WatchlistItemRow[]>`
    SELECT
      id,
      watchlist_id,
      clerk_user_id,
      symbol,
      created_at,
      updated_at
    FROM watchlist_items
    WHERE watchlist_id = ${watchlistId}
      AND clerk_user_id = ${clerkUserId}
      AND symbol = ${normalizedSymbol}
    LIMIT 1
  `;

  if (existingRows[0]) {
    return mapWatchlistItem(existingRows[0]);
  }

  const rows = await sql<WatchlistItemRow[]>`
    INSERT INTO watchlist_items (
      watchlist_id,
      clerk_user_id,
      symbol
    )
    VALUES (
      ${watchlistId},
      ${clerkUserId},
      ${normalizedSymbol}
    )
    RETURNING
      id,
      watchlist_id,
      clerk_user_id,
      symbol,
      created_at,
      updated_at
  `;

  await sql`
    UPDATE watchlists
    SET updated_at = NOW()
    WHERE id = ${watchlistId}
      AND clerk_user_id = ${clerkUserId}
  `;

  return mapWatchlistItem(rows[0]);
}

export async function removeWatchlistItem(
  clerkUserId: string,
  watchlistId: string,
  symbol: string,
): Promise<boolean> {
  const normalizedSymbol = normalizeSymbol(symbol);

  if (!normalizedSymbol) {
    return false;
  }

  const rows = await sql<{ id: string }[]>`
    DELETE FROM watchlist_items
    WHERE watchlist_id = ${watchlistId}
      AND clerk_user_id = ${clerkUserId}
      AND symbol = ${normalizedSymbol}
    RETURNING id
  `;

  if (rows[0]) {
    await sql`
      UPDATE watchlists
      SET updated_at = NOW()
      WHERE id = ${watchlistId}
        AND clerk_user_id = ${clerkUserId}
    `;

    return true;
  }

  return false;
}
