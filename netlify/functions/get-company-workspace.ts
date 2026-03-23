import { neon } from "@neondatabase/serverless";

export const handler = async function(event) {

  const ticker = event.queryStringParameters.ticker;

  const sql = neon(process.env.DATABASE_URL);

  const company = await sql`
    SELECT *
    FROM companies
    WHERE ticker = ${ticker}
    LIMIT 1
  `;

  const latestReport = await sql`
    SELECT *
    FROM report_requests
    WHERE ticker = ${ticker}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return {
    statusCode: 200,
    body: JSON.stringify({

      profile: {
        name: company[0]?.name || ticker,
        description: company[0]?.description || ""
      },

      market: {
        price: latestReport[0]?.live_price,
        market_cap: latestReport[0]?.market_cap
      },

      valuation: {
        rating: latestReport[0]?.analyst_rating,
        target_base: latestReport[0]?.target_base
      },

      ai: {
        thesis: latestReport[0]?.ai_thesis,
        catalysts: JSON.parse(latestReport[0]?.ai_catalysts || "[]")
      }

    })
  };
};
