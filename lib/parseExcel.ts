import XLSX from "xlsx";

function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("No worksheet found in uploaded Excel file.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

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
        row.close !== null
    );

  if (!normalized.length) {
    throw new Error(
      "No valid stock-history rows found. Expected columns like Date, Open, High, Low, Close, Volume."
    );
  }

  return normalized;
}

function normalizeRow(row) {
  const mapped = {};
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
    ticker: mapped.ticker || null,
    date: mapped.date || null,
    open: mapped.open ?? null,
    high: mapped.high ?? null,
    low: mapped.low ?? null,
    close: mapped.close ?? null,
    volume: mapped.volume ?? null,
  };
}

function normalizeDate(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const yyyy = String(parsed.y).padStart(4, "0");
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const text = String(value).trim();
  const date = new Date(text);
  if (!isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toInteger(value) {
  const n = toNumber(value);
  return n === null ? null : Math.trunc(n);
}

export {
  parseExcelBuffer,
};
