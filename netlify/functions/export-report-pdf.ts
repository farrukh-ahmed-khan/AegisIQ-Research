import { neon } from "@neondatabase/serverless";
import { buildHistoryAnalytics } from "../../lib/reportAnalytics";
import { buildPdfReport } from "../../lib/buildPdfReport";
import { generateResearchReport } from "../../lib/generateResearchReport";

export const handler = async function handler(event) {
  try {
    if (event.httpMethod !== "GET") {
      return responseJson(405, { error: "Method not allowed." });
    }

    const id = event.queryStringParameters?.id;
    if (!id) {
      return responseJson(400, { error: "Missing report request id." });
    }

    const sql = neon(process.env.DATABASE_URL);

    const requests = await sql`
      SELECT id, ticker, period, status, original_filename, row_count, created_at, ai_report, report_title
      FROM report_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!requests.length) {
      return responseJson(404, { error: "Report request not found." });
    }

    const request = requests[0];

    const history = await sql`
      SELECT trade_date, open, high, low, close, volume
      FROM stock_history_uploads
      WHERE report_request_id = ${id}
      ORDER BY trade_date ASC
    `;

    const analytics = buildHistoryAnalytics(history);

    const narrative = {
      headline: `${request.ticker} preliminary quantitative summary`,
      thesis: analytics.investmentView,
      targetRange: {
        low: analytics.impliedRangeLow,
        base: analytics.impliedRangeBase,
        high: analytics.impliedRangeHigh,
      },
    };

    let aiReport = request.ai_report || "";
    if (!aiReport) {
      try {
        aiReport = await generateResearchReport({
          ticker: request.ticker,
          analytics,
        });
      } catch (err) {
        aiReport =
          "AI narrative was unavailable during PDF export. The quantitative report has still been generated successfully.";
      }
    }

    const pdfBuffer = await buildPdfReport({
      request,
      analytics,
      narrative,
      aiReport,
    });

    const fileName = `${request.ticker || "report"}-research-report.pdf`;

    await sql`
      INSERT INTO report_exports (report_request_id, export_type, file_name)
      VALUES (${id}, 'pdf', ${fileName})
    `;

    await sql`
      UPDATE report_requests
      SET pdf_generated_at = NOW()
      WHERE id = ${id}
    `;

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
      body: pdfBuffer.toString("base64"),
    };
  } catch (error) {
    return responseJson(500, {
      error: error.message || "Server error.",
    });
  }
};

function responseJson(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
