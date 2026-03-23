import { neon } from "@neondatabase/serverless";
import { buildHistoryAnalytics } from "../../lib/reportAnalytics";
import { assertReportOwner } from "../../lib/accessControl";

export const handler = async function handler(event) {
  try {
    if (event.httpMethod !== "GET") {
      return response(405, { error: "Method not allowed." });
    }

    const id = event.queryStringParameters?.id;
    const userId = event.queryStringParameters?.userId;

    if (!id) {
      return response(400, { error: "Missing report request id." });
    }

    const ownership = await assertReportOwner({ reportId: id, userId });
    if (!ownership.allowed) {
      return response(403, { error: ownership.reason || "Access denied." });
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
        ai_thesis,
        ai_risks,
        ai_catalysts,
        ai_recommendation_summary,
        ai_generated_at,
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
        market_data_updated_at,
        user_id
      FROM report_requests
      WHERE id = ${id}
      LIMIT 1
    `;

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
      request: {
        ...request,
        ai_risks: parseJsonArray(request.ai_risks),
        ai_catalysts: parseJsonArray(request.ai_catalysts),
      },
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

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
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
