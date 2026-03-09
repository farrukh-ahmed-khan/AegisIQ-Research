const { neon } = require("@neondatabase/serverless");
const { buildHistoryAnalytics } = require("../../lib/reportAnalytics");
const { generateResearchReport } = require("../../lib/generateResearchReport");
const { buildSimpleDcf } = require("../../lib/dcfModel");
const { buildComparableSet } = require("../../lib/compsModel");

exports.handler = async function (event) {
  try {
    const id = event.queryStringParameters?.id;

    if (!id) {
      return response(400, { error: "Missing request id" });
    }

    const sql = neon(process.env.DATABASE_URL);

    const requests = await sql`
      SELECT * FROM report_requests WHERE id = ${id} LIMIT 1
    `;

    if (!requests.length) {
      return response(404, { error: "Request not found" });
    }

    const request = requests[0];

    const history = await sql`
      SELECT trade_date, open, high, low, close, volume
      FROM stock_history_uploads
      WHERE report_request_id = ${id}
      ORDER BY trade_date ASC
    `;

    const analytics = buildHistoryAnalytics(history);

    const dcf = buildSimpleDcf({
      lastClose: analytics.lastClose,
    });

    const comps = buildComparableSet({
      ticker: request.ticker,
      lastClose: analytics.lastClose,
    });

    const aiReport = await generateResearchReport({
      ticker: request.ticker,
      analytics,
      dcf,
      comps,
    });

    const analystRating =
      analytics.percentChange > 15 && analytics.sma20 > analytics.sma50
        ? "Buy"
        : analytics.percentChange >= 0
        ? "Hold"
        : "Reduce";

    const targetLow = analytics.impliedRangeLow;
    const targetBase =
      dcf.impliedValuePerShare && Number.isFinite(Number(dcf.impliedValuePerShare))
        ? Number(dcf.impliedValuePerShare)
        : analytics.impliedRangeBase;
    const targetHigh = analytics.impliedRangeHigh;

    await sql`
      UPDATE report_requests
      SET
        ai_report = ${aiReport},
        analyst_rating = ${analystRating},
        target_low = ${targetLow},
        target_base = ${targetBase},
        target_high = ${targetHigh},
        status = 'report_generated'
      WHERE id = ${id}
    `;

    await sql`DELETE FROM comparable_companies WHERE report_request_id = ${id}`;

    for (const comp of comps.comps) {
      await sql`
        INSERT INTO comparable_companies
          (report_request_id, ticker, company_name, market_cap, ev_revenue, ev_ebitda, pe_ratio)
        VALUES
          (
            ${id},
            ${comp.ticker},
            ${comp.company_name},
            ${comp.market_cap},
            ${comp.ev_revenue},
            ${comp.ev_ebitda},
            ${comp.pe_ratio}
          )
      `;
    }

    return response(200, {
      report: aiReport,
      analytics,
      dcf,
      comps,
      rating: analystRating,
      targetRange: {
        low: targetLow,
        base: targetBase,
        high: targetHigh,
      },
    });
  } catch (error) {
    return response(500, { error: error.message });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
