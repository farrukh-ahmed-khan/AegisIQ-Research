import { neon } from "@neondatabase/serverless";
import { buildHistoryAnalytics } from "../../lib/reportAnalytics";
import { buildPdfReport } from "../../lib/buildPdfReport";
import { generateResearchReport } from "../../lib/generateResearchReport";

export const handler = async function handler(event) {
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
      SELECT id, ticker, period, status, original_filename, row_count, created_at, ai_report, report_title
      FROM report_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!requests.length) {
      return response(404, { error: "Report request not found." });
    }

    const requestData = requests[0];

    const history = await sql`
      SELECT trade_date, open, high, low, close, volume
      FROM stock_history_uploads
      WHERE report_request_id = ${id}
      ORDER BY trade_date ASC
    `;

    const analytics = buildHistoryAnalytics(history);

    const narrative = {
      headline: `${requestData.ticker} preliminary quantitative summary`,
      thesis: analytics.investmentView,
      targetRange: {
        low: analytics.impliedRangeLow,
        base: analytics.impliedRangeBase,
        high: analytics.impliedRangeHigh,
      },
    };

    // AI Report generation
    let aiReport = requestData.ai_report || "";
    if (!aiReport) {
      try {
        aiReport = await generateResearchReport({
          ticker: requestData.ticker,
          analytics,
          dcf: null,
          comps: null,
          valuation: null,
        });
      } catch (err) {
        aiReport =
          "AI narrative was unavailable during PDF export. The quantitative report has still been generated successfully.";
      }
    }

    // Build PDF
    const pdfBufferUnknown = await buildPdfReport({
      request: requestData,
      analytics,
      narrative,
      aiReport,
    });

    const pdfBuffer = pdfBufferUnknown as Buffer;

    const pdfBody = Buffer.isBuffer(pdfBuffer)
      ? pdfBuffer
      : Buffer.from(pdfBuffer);

    const fileName = `${requestData.ticker || "report"}-research-report.pdf`;

    // Update DB after generating PDF
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
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
      body: pdfBody.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Server error.";
    return response(500, { error: message });
  }
};

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
