import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { renderEquityResearchPdf } from "@/lib/pdf/export-report";
import { getWorkspaceReportRunById } from "@/lib/workspace-repository";

interface RouteContext {
  params: Promise<{
    symbol: string;
    reportId: string;
  }>;
}

function escapePdfText(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createPlainTextPdf(lines: string[]): Uint8Array {
  const safeLines = lines.slice(0, 40).map((line) =>
    line
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 140),
  );

  const textOperators: string[] = [];
  let y = 800;

  for (const line of safeLines) {
    textOperators.push(`1 0 0 1 50 ${y} Tm (${escapePdfText(line || " ")}) Tj`);
    y -= 16;
    if (y < 60) break;
  }

  const streamContent = `BT\n/F1 12 Tf\n${textOperators.join("\n")}\nET`;
  const streamLength = Buffer.byteLength(streamContent, "utf8");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function isValidSymbol(symbol: string): boolean {
  return /^[A-Z0-9.\-]{1,12}$/.test(symbol);
}

function buildPdfFilename(symbol: string, reportId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${symbol}-${reportId.slice(0, 8)}-${date}.pdf`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, context: RouteContext) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { symbol: rawSymbol, reportId } = await context.params;
    const symbol = normalizeSymbol(rawSymbol);

    if (!isValidSymbol(symbol)) {
      return NextResponse.json({ error: "Invalid symbol." }, { status: 400 });
    }

    if (!reportId) {
      return NextResponse.json(
        { error: "Report id is required." },
        { status: 400 },
      );
    }

    const report = await getWorkspaceReportRunById(userId, symbol, reportId);

    if (!report) {
      return NextResponse.json(
        { error: "Report run not found." },
        { status: 404 },
      );
    }

    const outputPayload =
      report.outputPayload && typeof report.outputPayload === "object"
        ? (report.outputPayload as Record<string, unknown>)
        : {};

    const pdfPayloadRaw =
      outputPayload.pdfPayload && typeof outputPayload.pdfPayload === "object"
        ? (outputPayload.pdfPayload as Record<string, unknown>)
        : null;

    if (!pdfPayloadRaw) {
      return NextResponse.json(
        { error: "PDF payload unavailable for this report run." },
        { status: 400 },
      );
    }

    try {
      const pdfBytes = await renderEquityResearchPdf(pdfPayloadRaw);

      const primaryBody = Buffer.from(pdfBytes) as unknown as BodyInit;

      return new NextResponse(primaryBody, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${buildPdfFilename(symbol, reportId)}"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    } catch (renderError) {
      console.error(
        "React-PDF render failed, retrying with safe payload",
        renderError,
      );

      const safePdfPayload = {
        companyName:
          (pdfPayloadRaw.companyName as string | undefined) ?? symbol,
        ticker: (pdfPayloadRaw.ticker as string | undefined) ?? symbol,
        reportDate:
          (pdfPayloadRaw.reportDate as string | undefined) ??
          new Date().toISOString().slice(0, 10),
        reportTitle:
          (pdfPayloadRaw.reportTitle as string | undefined) ??
          `${symbol} Research Report`,
        reportSubtitle:
          "Fallback PDF payload rendered due data-shape mismatch in primary payload",
        rating: (pdfPayloadRaw.rating as string | undefined) ?? "n/a",
        executiveSummaryText:
          (pdfPayloadRaw.executiveSummaryText as string | undefined) ??
          "Summary unavailable.",
        valuationSummaryText:
          (pdfPayloadRaw.valuationSummaryText as string | undefined) ??
          "Valuation summary unavailable.",
        conclusionText:
          (pdfPayloadRaw.conclusionText as string | undefined) ??
          "Conclusion unavailable.",
      };

      try {
        const retryBytes = await renderEquityResearchPdf(safePdfPayload);
        const retryBody = Buffer.from(retryBytes) as unknown as BodyInit;

        return new NextResponse(retryBody, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${buildPdfFilename(symbol, reportId)}"`,
            "Cache-Control": "no-store, max-age=0",
            "X-PDF-Renderer": "react-pdf-safe-fallback",
          },
        });
      } catch (retryError) {
        console.error("Safe payload PDF render also failed", retryError);

        const emergencyPdf = createPlainTextPdf([
          `${symbol} Research Report`,
          `Report ID: ${reportId}`,
          `Generated: ${new Date().toISOString()}`,
          "",
          "The full styled PDF renderer failed for this stored payload.",
          "A fallback PDF has been generated so the report remains accessible.",
          "",
          `Company: ${String(pdfPayloadRaw.companyName ?? symbol)}`,
          `Ticker: ${String(pdfPayloadRaw.ticker ?? symbol)}`,
          `Rating: ${String(pdfPayloadRaw.rating ?? "n/a")}`,
          `Title: ${String(pdfPayloadRaw.reportTitle ?? `${symbol} Research Report`)}`,
          "",
          "To restore styled PDF output, regenerate this report from /reports/new.",
        ]);

        return new NextResponse(
          Buffer.from(emergencyPdf) as unknown as BodyInit,
          {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${buildPdfFilename(symbol, reportId)}"`,
              "Cache-Control": "no-store, max-age=0",
              "X-PDF-Renderer": "plain-text-fallback",
            },
          },
        );
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to render report PDF.";
    console.error("Workspace report PDF route failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
