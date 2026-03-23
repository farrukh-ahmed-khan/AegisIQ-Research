import { neon } from "@neondatabase/serverless";

export const handler = async function handler(event) {
  try {
    if (event.httpMethod !== "GET") {
      return response(405, { error: "Method not allowed." });
    }

    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT
        id,
        ticker,
        period,
        report_title,
        analyst_rating,
        target_low,
        target_base,
        target_high,
        published_at,
        pdf_generated_at
      FROM report_requests
      WHERE published_at IS NOT NULL
      ORDER BY published_at DESC
      LIMIT 50
    `;

    return response(200, { reports: rows });
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
