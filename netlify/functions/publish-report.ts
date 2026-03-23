import { neon } from "@neondatabase/serverless";

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
      SELECT id, ticker, period, analyst_rating
      FROM report_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!rows.length) {
      return response(404, { error: "Report request not found." });
    }

    const row = rows[0];
    const title = `${row.ticker} Equity Research Report (${row.period})`;

    await sql`
      UPDATE report_requests
      SET
        published_at = NOW(),
        report_title = ${title},
        status = 'published'
      WHERE id = ${id}
    `;

    return response(200, {
      success: true,
      id,
      title,
      message: "Report published successfully.",
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
