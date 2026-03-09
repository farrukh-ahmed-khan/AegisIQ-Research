const { neon } = require("@neondatabase/serverless");

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "GET") {
      return response(405, { error: "Method not allowed." });
    }

    const id = event.queryStringParameters?.id;

    if (!id) {
      return response(400, { error: "Missing report request id." });
    }

    const sql = neon(process.env.DATABASE_URL);

    const requests = await sql`
      SELECT
        id,
        ticker,
        period,
        status,
        original_filename,
        row_count,
        created_at
      FROM report_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!requests.length) {
      return response(404, { error: "Report request not found." });
    }

    const request = requests[0];

    const history = await sql`
      SELECT
        trade_date,
        open,
        high,
        low,
        close,
        volume
      FROM stock_history_uploads
      WHERE report_request_id = ${id}
      ORDER BY trade_date ASC
    `;

    const summary = buildSummary(history);

    return response(200, {
      request,
      summary,
      history,
    });
  } catch (error) {
    return response(500, { error: error.message || "Server error." });
  }
};

function buildSummary(history) {
  if (!history.length) {
    return {
      rows: 0,
      firstDate: null,
      lastDate: null,
      firstClose: null,
      lastClose: null,
      absoluteChange: null,
      percentChange: null,
      highMax: null,
      lowMin: null,
      averageVolume: null,
    };
  }

  const first = history[0];
  const last = history[history.length - 1];

  const closes = history.map((r) => toNumber(r.close)).filter((v) => v !== null);
  const highs = history.map((r) => toNumber(r.high)).filter((v) => v !== null);
  const lows = history.map((r) => toNumber(r.low)).filter((v) => v !== null);
  const volumes = history.map((r) => toNumber(r.volume)).filter((v) => v !== null);

  const firstClose = toNumber(first.close);
  const lastClose = toNumber(last.close);
  const absoluteChange =
    firstClose !== null && lastClose !== null ? lastClose - firstClose : null;
  const percentChange =
    firstClose && lastClose !== null ? (absoluteChange / firstClose) * 100 : null;

  return {
    rows: history.length,
    firstDate: first.trade_date,
    lastDate: last.trade_date,
    firstClose,
    lastClose,
    absoluteChange,
    percentChange,
    highMax: highs.length ? Math.max(...highs) : null,
    lowMin: lows.length ? Math.min(...lows) : null,
    averageVolume: volumes.length
      ? volumes.reduce((a, b) => a + b, 0) / volumes.length
      : null,
  };
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
