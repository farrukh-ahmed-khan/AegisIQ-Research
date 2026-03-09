const { neon } = require("@neondatabase/serverless");
const { buildHistoryAnalytics } = require("../../lib/reportAnalytics");

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
        created_at,
        ai_report,
        analyst_rating,
        target_low,
        target_base,
        target_high,
        pdf_generated_at,
        published_at,
        report_title,
        company_name,
        sector,
        industry,
        exchange,
        currency,
        market_cap,
        live_price,
        price_change_pct,
        market_data_updated_at
      FROM report_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!requests.length) {
      return response(404, { error: "Report request not found." });
    }

    const request = requests[0];

    const history = await sql`
      SELECT trade_date, open, high, low, close, volume
      FROM stock_history_uploads
      WHERE report_request_id = ${id}
      ORDER BY trade_date ASC
    `;

    const exportsList = await sql`
      SELECT id, export_type, file_name, created_at
      FROM report_exports
      WHERE report_request_id = ${id}
      ORDER BY created_at DESC
    `;

    const peers = await sql`
      SELECT
        id,
        peer_ticker,
        peer_name,
        peer_sector,
        peer_industry,
        peer_market_cap,
        created_at
      FROM peer_selections
      WHERE report_request_id = ${id}
      ORDER BY created_at DESC, peer_ticker ASC
    `;

    const analytics = buildHistoryAnalytics(history);

    return response(200, {
      request,
      analytics,
      narrative: {
        headline: `${request.ticker} preliminary quantitative summary`,
        thesis: analytics.investmentView,
        targetRange: {
          low: request.target_low ?? analytics.impliedRangeLow,
          base: request.target_base ?? analytics.impliedRangeBase,
          high: request.target_high ?? analytics.impliedRangeHigh,
        },
      },
      savedReport: request.ai_report || "",
      exports: exportsList,
      peers,
    });
  } catch (error) {
    return response(500, { error: error.message || "Server error." });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
