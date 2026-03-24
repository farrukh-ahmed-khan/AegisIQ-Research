import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { buildHistoryAnalytics } from "../../lib/reportAnalytics";
import { buildPdfReport } from "../../lib/buildPdfReport";
import { generateResearchReport } from "../../lib/generateResearchReport";

export const runtime = "nodejs"; // ensure Node runtime
export const dynamic = "force-dynamic"; // disable caching

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing report request id." },
        { status: 400 },
      );
    }

    const sql = neon(process.env.DATABASE_URL);

    const requests = await sql`
      SELECT id, ticker, period, status, original_filename, row_count, created_at, ai_report, report_title
      FROM report_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!requests.length) {
      return NextResponse.json(
        { error: "Report request not found." },
        { status: 404 },
      );
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

    // Ensure it's a proper Buffer for NextResponse
    const pdfBody = Buffer.isBuffer(pdfBuffer)
      ? pdfBuffer
      : Buffer.from(pdfBuffer);

    const pdfBytes = new Uint8Array(pdfBody.byteLength);
    pdfBytes.set(pdfBody);

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

    // ✅ Return PDF
    return new NextResponse(pdfBytes.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Server error." },
      { status: 500 },
    );
  }
}
