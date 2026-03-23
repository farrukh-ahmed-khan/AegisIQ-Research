import { neon } from "@neondatabase/serverless";
import { buildHistoryAnalytics } from "../../lib/reportAnalytics";
import { buildComparableSet } from "../../lib/compsModel";
import { runValuationEngine } from "../../lib/valuationEngine";

export const handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
      return response(405, { error: "Method not allowed." });
    }

    const id =
      event.httpMethod === "GET"
        ? event.queryStringParameters?.id
        : JSON.parse(event.body || "{}").id;

    if (!id) {
      return response(400, { error: "Missing report request id." });
    }

    const sql = neon(process.env.DATABASE_URL);

    const requests = await sql`
      SELECT
        id, ticker, live_price, market_cap, analyst_rating,
        target_low, target_base, target_high
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

    const analytics = buildHistoryAnalytics(history);

    const peerRows = await sql`
      SELECT peer_ticker, peer_name
      FROM peer_selections
      WHERE report_request_id = ${id}
      ORDER BY created_at DESC
    `;

    const placeholderComps = buildComparableSet({
      ticker: request.ticker,
      lastClose: analytics.lastClose,
    });

    const financials = {
      revenue: request.market_cap ? Number(request.market_cap) / 5 : null,
      shares_outstanding:
        request.market_cap && (request.live_price || analytics.lastClose)
          ? Number(request.market_cap) / Number(request.live_price || analytics.lastClose)
          : null,
      net_debt: 0,
      revenue_growth_rate: 0.08,
      ebit_margin: 0.22,
      tax_rate: 0.21,
      da_percent: 0.04,
      capex_percent: 0.05,
      nwc_percent: 0.02,
      discount_rate: 0.1,
      terminal_growth_rate: 0.025,
    };

    const valuation = runValuationEngine({
      ticker: request.ticker,
      analytics,
      marketData: {
        live_price: request.live_price,
        market_cap: request.market_cap,
      },
      financials,
      compsData: {
        averages: placeholderComps.averages,
        peers: peerRows,
      },
    });

    await sql`
      UPDATE report_requests
      SET
        analyst_rating = ${valuation.rating},
        target_low = ${valuation.targetRange.low},
        target_base = ${valuation.targetRange.base},
        target_high = ${valuation.targetRange.high},
        status = 'valued'
      WHERE id = ${id}
    `;

    return response(200, {
      valuation,
    });
  } catch (error) {
    return response(500, { error: error.message || "Server error." });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
