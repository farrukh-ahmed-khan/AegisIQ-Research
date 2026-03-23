import { neon } from "@neondatabase/serverless";
import {
  getCompanyProfile,
  getLiveQuote,
  getPeerProfiles,
} from "../../lib/marketDataProvider";

export const handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed." });
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const id = body.id;

    if (!id) {
      return response(400, { error: "Missing report request id." });
    }

    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT id, ticker
      FROM report_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!rows.length) {
      return response(404, { error: "Report request not found." });
    }

    const request = rows[0];
    const ticker = String(request.ticker).toUpperCase();

    const [profile, quote, peers] = await Promise.all([
      getCompanyProfile(ticker),
      getLiveQuote(ticker),
      getPeerProfiles(ticker),
    ]);

    await sql`
      UPDATE report_requests
      SET
        company_name = ${profile.company_name},
        sector = ${profile.sector},
        industry = ${profile.industry},
        exchange = ${profile.exchange},
        currency = ${profile.currency},
        market_cap = ${profile.market_cap},
        live_price = ${quote.price},
        price_change_pct = ${quote.change_pct},
        market_data_updated_at = NOW()
      WHERE id = ${id}
    `;

    await sql`DELETE FROM peer_selections WHERE report_request_id = ${id}`;

    for (const peer of peers) {
      await sql`
        INSERT INTO peer_selections
          (report_request_id, peer_ticker, peer_name, peer_sector, peer_industry, peer_market_cap)
        VALUES
          (
            ${id},
            ${peer.peer_ticker},
            ${peer.peer_name},
            ${peer.peer_sector},
            ${peer.peer_industry},
            ${peer.peer_market_cap}
          )
      `;
    }

    return response(200, {
      success: true,
      profile,
      quote,
      peers,
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
