import { neon } from "@neondatabase/serverless";
import { buildHistoryAnalytics } from "../../lib/reportAnalytics";
import { generateResearchReport } from "../../lib/generateResearchReport";
import { buildComparableSet } from "../../lib/compsModel";
import { runValuationEngine } from "../../lib/valuationEngine";

export const handler = async function (event) {
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

    const comps = buildComparableSet({
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
        averages: comps.averages,
      },
    });

    const aiReport = await generateResearchReport({
      ticker: request.ticker,
      analytics,
      dcf: valuation.dcf,
      comps,
      valuation,
    });

    await sql`
      UPDATE report_requests
      SET
        ai_report = ${aiReport},
        analyst_rating = ${valuation.rating},
        target_low = ${valuation.targetRange.low},
        target_base = ${valuation.targetRange.base},
        target_high = ${valuation.targetRange.high},
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
      dcf: valuation.dcf,
      comps,
      valuation,
      rating: valuation.rating,
      targetRange: valuation.targetRange,
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
