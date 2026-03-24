// lib/parseExcel.ts
import XLSX from "xlsx";

// Type for normalized row
export interface NormalizedRow {
  ticker: string | null;
  date: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

// Parse Excel buffer into array of normalized rows
export function parseExcelBuffer(
  buffer: ArrayBuffer | Uint8Array,
): NormalizedRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("No worksheet found in uploaded Excel file.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: null,
  });

  if (!rows.length) {
    throw new Error("The worksheet is empty.");
  }

  const normalized = rows
    .map(normalizeRow)
    .filter(
      (row) =>
        row.date &&
        row.open !== null &&
        row.high !== null &&
        row.low !== null &&
        row.close !== null,
    );

  if (!normalized.length) {
    throw new Error(
      "No valid stock-history rows found. Expected columns like Date, Open, High, Low, Close, Volume.",
    );
  }

  return normalized;
}

// Normalize individual row
function normalizeRow(row: Record<string, any>): NormalizedRow {
  const mapped: Partial<NormalizedRow> = {};
  const keys = Object.keys(row);

  for (const key of keys) {
    const normalizedKey = String(key).trim().toLowerCase();

    if (normalizedKey === "date") mapped.date = normalizeDate(row[key]);
    if (normalizedKey === "open") mapped.open = toNumber(row[key]);
    if (normalizedKey === "high") mapped.high = toNumber(row[key]);
    if (normalizedKey === "low") mapped.low = toNumber(row[key]);
    if (normalizedKey === "close") mapped.close = toNumber(row[key]);
    if (normalizedKey === "volume") mapped.volume = toInteger(row[key]);
    if (normalizedKey === "ticker" || normalizedKey === "symbol") {
      mapped.ticker = row[key] ? String(row[key]).trim().toUpperCase() : null;
    }
  }

  return {
    ticker: mapped.ticker ?? null,
    date: mapped.date ?? null,
    open: mapped.open ?? null,
    high: mapped.high ?? null,
    low: mapped.low ?? null,
    close: mapped.close ?? null,
    volume: mapped.volume ?? null,
  };
}

// Normalize date values from Excel
function normalizeDate(value: any): string | null {
  if (!value) return null;

  // If already a Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  // If Excel numeric date
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const yyyy = String(parsed.y).padStart(4, "0");
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // If string
  const text = String(value).trim();
  const date = new Date(text);
  if (!isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return null;
}

// Convert value to number or null
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Convert value to integer or null
function toInteger(value: any): number | null {
  const n = toNumber(value);
  return n === null ? null : Math.trunc(n);
}
