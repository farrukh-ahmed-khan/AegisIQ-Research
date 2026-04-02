import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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
  const normalizedLines = lines
    .flatMap((line) => {
      const cleaned = line.replace(/\r\n/g, "\n");
      if (!cleaned.trim()) return [""];

      return cleaned.split("\n").flatMap((segment) => {
        const trimmed = segment.trim();
        if (!trimmed) return [""];

        const chunks: string[] = [];
        let remaining = trimmed;

        while (remaining.length > 140) {
          const breakAt = remaining.lastIndexOf(" ", 140);
          const sliceAt = breakAt > 40 ? breakAt : 140;
          chunks.push(remaining.slice(0, sliceAt).trim());
          remaining = remaining.slice(sliceAt).trim();
        }

        chunks.push(remaining);
        return chunks;
      });
    })
    .slice(0, 240);

  const linesPerPage = 44;
  const pages: string[][] = [];

  for (let index = 0; index < normalizedLines.length; index += linesPerPage) {
    pages.push(normalizedLines.slice(index, index + linesPerPage));
  }

  if (!pages.length) {
    pages.push(["Report content unavailable."]);
  }

  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  let objectNumber = 1;

  const catalogObject = objectNumber++;
  const pagesObject = objectNumber++;

  objects.push(
    `${catalogObject} 0 obj\n<< /Type /Catalog /Pages ${pagesObject} 0 R >>\nendobj\n`,
  );

  objects.push("");

  for (const pageLines of pages) {
    const pageObject = objectNumber++;
    const contentObject = objectNumber++;
    pageObjectNumbers.push(pageObject);

    const textOperators: string[] = [];
    let y = 800;

    for (const line of pageLines) {
      textOperators.push(
        `1 0 0 1 50 ${y} Tm (${escapePdfText(line || " ")}) Tj`,
      );
      y -= 16;
    }

    const streamContent = `BT\n/F1 11 Tf\n${textOperators.join("\n")}\nET`;
    const streamLength = Buffer.byteLength(streamContent, "utf8");

    objects.push(
      `${pageObject} 0 obj\n<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${pagesObject + pages.length * 2 + 1} 0 R >> >> /Contents ${contentObject} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentObject} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    );
  }

  const fontObject = objectNumber++;
  objects[1] =
    `${pagesObject} 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers.map((id) => `${id} 0 R`).join(" ")}] >>\nendobj\n`;
  objects.push(
    `${fontObject} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  );

  for (let index = 0; index < objects.length; index += 1) {
    objects[index] = objects[index].replaceAll(
      `${pagesObject + pages.length * 2 + 1} 0 R`,
      `${fontObject} 0 R`,
    );
  }

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

type StyledTextBlock = {
  type: "title" | "meta" | "section" | "body" | "bullet" | "spacer";
  text?: string;
};

function wrapPdfText(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [""];

  const paragraphs = normalized.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const next = currentLine ? `${currentLine} ${word}` : word;
      if (next.length <= maxChars) {
        currentLine = next;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      if (word.length <= maxChars) {
        currentLine = word;
        continue;
      }

      let remaining = word;
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars - 1) + "-");
        remaining = remaining.slice(maxChars - 1);
      }
      currentLine = remaining;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

function createStyledTextPdf(blocks: StyledTextBlock[]): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 54;
  const right = 54;
  const top = 52;
  const bottom = 48;
  const contentWidth = pageWidth - left - right;
  const bodyMaxChars = Math.max(40, Math.floor(contentWidth / 5.8));
  const metaMaxChars = Math.max(40, Math.floor(contentWidth / 6));
  const titleMaxChars = Math.max(24, Math.floor(contentWidth / 8));

  const pages: string[][] = [];
  let ops: string[] = [];
  let y = pageHeight - top;
  let pageNumber = 1;

  function startPage() {
    ops = [];
    y = pageHeight - top;

    ops.push("0.98 0.99 1 rg");
    ops.push(`0 0 ${pageWidth} ${pageHeight} re f`);

    ops.push("0.09 0.17 0.28 rg");
    ops.push(`${left - 14} ${pageHeight - 126} ${contentWidth + 28} 82 re f`);

    ops.push("BT");
    ops.push("/F2 24 Tf");
    ops.push("1 1 1 rg");
    ops.push(`1 0 0 1 ${left} ${pageHeight - 82} Tm`);
    ops.push(`(${escapePdfText("AegisIQ AI Research Report")}) Tj`);
    ops.push("ET");

    ops.push("BT");
    ops.push("/F1 9 Tf");
    ops.push("0.36 0.46 0.60 rg");
    ops.push(`1 0 0 1 ${left} ${pageHeight - 102} Tm`);
    ops.push(
      `(${escapePdfText("Institutional-style report generated from valuation data and OpenAI narrative output")}) Tj`,
    );
    ops.push("ET");

    y = pageHeight - 152;
  }

  function finalizePage() {
    ops.push("BT");
    ops.push("/F1 9 Tf");
    ops.push("0.40 0.45 0.52 rg");
    ops.push(`1 0 0 1 ${left} 24 Tm`);
    ops.push(`(${escapePdfText(`Page ${pageNumber}`)}) Tj`);
    ops.push("ET");
    pages.push(ops);
    pageNumber += 1;
  }

  function ensureSpace(height: number) {
    if (y - height < bottom) {
      finalizePage();
      startPage();
    }
  }

  function drawLine(
    text: string,
    options: {
      font: "F1" | "F2";
      fontSize: number;
      color: [number, number, number];
      x?: number;
      lineHeight: number;
    },
  ) {
    ensureSpace(options.lineHeight);
    ops.push("BT");
    ops.push(`/${options.font} ${options.fontSize} Tf`);
    ops.push(
      `${options.color[0]} ${options.color[1]} ${options.color[2]} rg`,
    );
    ops.push(`1 0 0 1 ${options.x ?? left} ${y} Tm`);
    ops.push(`(${escapePdfText(text)}) Tj`);
    ops.push("ET");
    y -= options.lineHeight;
  }

  startPage();

  for (const block of blocks) {
    if (block.type === "spacer") {
      y -= 8;
      continue;
    }

    if (block.type === "title") {
      const lines = wrapPdfText(block.text ?? "", titleMaxChars);
      for (const line of lines) {
        drawLine(line, {
          font: "F2",
          fontSize: 17,
          color: [0.06, 0.12, 0.21],
          lineHeight: 21,
        });
      }
      y -= 4;
      continue;
    }

    if (block.type === "meta") {
      const lines = wrapPdfText(block.text ?? "", metaMaxChars);
      for (const line of lines) {
        drawLine(line, {
          font: "F1",
          fontSize: 10,
          color: [0.23, 0.29, 0.37],
          lineHeight: 14,
        });
      }
      continue;
    }

    if (block.type === "section") {
      ensureSpace(28);
      ops.push("0.90 0.94 1 rg");
      ops.push(`${left - 4} ${y - 6} ${contentWidth + 8} 22 re f`);
      drawLine((block.text ?? "").toUpperCase(), {
        font: "F2",
        fontSize: 12,
        color: [0.05, 0.16, 0.36],
        lineHeight: 18,
      });
      y -= 2;
      continue;
    }

    if (block.type === "body") {
      const lines = wrapPdfText(block.text ?? "", bodyMaxChars);
      for (const line of lines) {
        drawLine(line, {
          font: "F1",
          fontSize: 10.5,
          color: [0.09, 0.12, 0.17],
          lineHeight: 14,
        });
      }
      y -= 2;
      continue;
    }

    if (block.type === "bullet") {
      const bulletPrefix = "• ";
      const lines = wrapPdfText(block.text ?? "", bodyMaxChars - 4);
      lines.forEach((line, index) => {
        drawLine(`${index === 0 ? bulletPrefix : "  "}${line}`, {
          font: "F1",
          fontSize: 10.5,
          color: [0.09, 0.12, 0.17],
          x: left + 8,
          lineHeight: 14,
        });
      });
      continue;
    }
  }

  finalizePage();

  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  let objectNumber = 1;

  const catalogObject = objectNumber++;
  const pagesObject = objectNumber++;

  objects.push(
    `${catalogObject} 0 obj\n<< /Type /Catalog /Pages ${pagesObject} 0 R >>\nendobj\n`,
  );
  objects.push("");

  for (const pageOps of pages) {
    const pageObject = objectNumber++;
    const contentObject = objectNumber++;
    pageObjectNumbers.push(pageObject);

    const streamContent = pageOps.join("\n");
    const streamLength = Buffer.byteLength(streamContent, "utf8");

    objects.push(
      `${pageObject} 0 obj\n<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${pagesObject + pages.length * 2 + 1} 0 R /F2 ${pagesObject + pages.length * 2 + 2} 0 R >> >> /Contents ${contentObject} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentObject} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    );
  }

  const helveticaObject = objectNumber++;
  const helveticaBoldObject = objectNumber++;

  objects[1] =
    `${pagesObject} 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers.map((id) => `${id} 0 R`).join(" ")}] >>\nendobj\n`;
  objects.push(
    `${helveticaObject} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  );
  objects.push(
    `${helveticaBoldObject} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`,
  );

  for (let index = 0; index < objects.length; index += 1) {
    objects[index] = objects[index]
      .replaceAll(
        `${pagesObject + pages.length * 2 + 1} 0 R`,
        `${helveticaObject} 0 R`,
      )
      .replaceAll(
        `${pagesObject + pages.length * 2 + 2} 0 R`,
        `${helveticaBoldObject} 0 R`,
      );
  }

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

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObject} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const title = stringifyValue(row.title ?? row.heading ?? row.label);
        const text = stringifyValue(
          row.text ?? row.body ?? row.description ?? row.value,
        );

        if (title && text) return `${title}: ${text}`;
        return title || text;
      }

      return "";
    })
    .filter(Boolean);
}

function parseNarrativeSections(narrative: string): Array<{
  heading: string;
  body: string;
}> {
  const normalized = narrative.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const matches = Array.from(
    normalized.matchAll(/(?:^|\n)(\d+)\.\s+([^\n:]+):\s*/g),
  );

  if (!matches.length) {
    return normalized
      .split(/\n{2,}/)
      .map((chunk, index) => ({
        heading: index === 0 ? "AI Research Narrative" : `Section ${index + 1}`,
        body: chunk.trim(),
      }))
      .filter((item) => item.body);
  }

  return matches
    .map((match, index) => {
      const next = matches[index + 1];
      const start = match.index! + match[0].length;
      const end = next ? next.index : normalized.length;

      return {
        heading: match[2].trim(),
        body: normalized.slice(start, end).trim(),
      };
    })
    .filter((item) => item.body);
}

function buildActualReportPdf(params: {
  symbol: string;
  reportId: string;
  pdfPayloadRaw: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
}): Uint8Array {
  const companyName =
    stringifyValue(params.pdfPayloadRaw.companyName) || params.symbol;
  const ticker = stringifyValue(params.pdfPayloadRaw.ticker) || params.symbol;
  const reportTitle =
    stringifyValue(params.pdfPayloadRaw.reportTitle) ||
    `${ticker} AI Research Report`;
  const reportDate =
    stringifyValue(params.pdfPayloadRaw.reportDate) ||
    new Date().toISOString().slice(0, 10);
  const rating = stringifyValue(params.pdfPayloadRaw.rating) || "n/a";
  const currentPrice = stringifyValue(params.pdfPayloadRaw.currentPrice) || "n/a";
  const priceTarget = stringifyValue(params.pdfPayloadRaw.priceTarget) || "n/a";
  const upside = stringifyValue(params.pdfPayloadRaw.upside) || "n/a";
  const executiveSummary =
    stringifyValue(params.pdfPayloadRaw.executiveSummaryText) ||
    "Executive summary unavailable.";
  const valuationSummary =
    stringifyValue(params.pdfPayloadRaw.valuationSummaryText) ||
    "Valuation summary unavailable.";
  const conclusionText =
    stringifyValue(params.pdfPayloadRaw.conclusionText) ||
    "Conclusion unavailable.";
  const catalysts = toStringArray(
    params.pdfPayloadRaw.growthCatalysts ?? params.pdfPayloadRaw.thesisBullets,
  );
  const risks = toStringArray(params.pdfPayloadRaw.riskFactors);
  const valuationScenarios = toStringArray(
    params.pdfPayloadRaw.valuationScenarios,
  );
  const dashboardMetrics = toStringArray(params.pdfPayloadRaw.dashboardMetrics);
  const valuationMetrics = toStringArray(params.pdfPayloadRaw.valuationMetrics);
  const narrativeText = stringifyValue(params.outputPayload.generatedNarrative);
  const narrativeSections = parseNarrativeSections(narrativeText);

  const blocks: StyledTextBlock[] = [
    { type: "title", text: reportTitle },
    { type: "meta", text: `${companyName} (${ticker})` },
    { type: "meta", text: `Report Date: ${reportDate}` },
    { type: "meta", text: `Report ID: ${params.reportId}` },
    {
      type: "meta",
      text: `Rating: ${rating} | Current Price: ${currentPrice} | Price Target: ${priceTarget} | Upside: ${upside}`,
    },
    { type: "spacer" },
    { type: "section", text: "Executive Summary" },
    { type: "body", text: executiveSummary },
    { type: "section", text: "Valuation Summary" },
    { type: "body", text: valuationSummary },
  ];

  if (dashboardMetrics.length) {
    blocks.push({ type: "section", text: "Dashboard Metrics" });
    dashboardMetrics.forEach((item) =>
      blocks.push({ type: "bullet", text: item }),
    );
    blocks.push({ type: "spacer" });
  }

  if (valuationMetrics.length) {
    blocks.push({ type: "section", text: "Valuation Metrics" });
    valuationMetrics.forEach((item) =>
      blocks.push({ type: "bullet", text: item }),
    );
    blocks.push({ type: "spacer" });
  }

  if (narrativeSections.length) {
    narrativeSections.forEach((section) => {
      blocks.push({ type: "section", text: section.heading });
      blocks.push({ type: "body", text: section.body });
    });
  } else if (narrativeText) {
    blocks.push({ type: "section", text: "AI Research Narrative" });
    blocks.push({ type: "body", text: narrativeText });
  }

  if (catalysts.length) {
    blocks.push({ type: "section", text: "Growth Catalysts" });
    catalysts.forEach((item) => blocks.push({ type: "bullet", text: item }));
    blocks.push({ type: "spacer" });
  }

  if (risks.length) {
    blocks.push({ type: "section", text: "Risk Factors" });
    risks.forEach((item) => blocks.push({ type: "bullet", text: item }));
    blocks.push({ type: "spacer" });
  }

  if (valuationScenarios.length) {
    blocks.push({ type: "section", text: "Valuation Scenarios" });
    valuationScenarios.forEach((item) =>
      blocks.push({ type: "bullet", text: item }),
    );
    blocks.push({ type: "spacer" });
  }

  blocks.push({ type: "section", text: "Analyst Conclusion" });
  blocks.push({ type: "body", text: conclusionText });

  return createStyledTextPdf(blocks);
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
      const robustPdf = buildActualReportPdf({
        symbol,
        reportId,
        pdfPayloadRaw,
        outputPayload,
      });

      return new NextResponse(
        Buffer.from(robustPdf) as unknown as BodyInit,
        {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${buildPdfFilename(symbol, reportId)}"`,
            "Cache-Control": "no-store, max-age=0",
            "X-PDF-Renderer": "internal-openai-fallback",
          },
        },
      );
    } catch (internalRenderError) {
      console.error("Internal PDF render failed", internalRenderError);

      const emergencyPdf = createPlainTextPdf([
        `${symbol} Research Report`,
        `Report ID: ${reportId}`,
        `Generated: ${new Date().toISOString()}`,
        "",
        "The internal PDF renderer failed for this report.",
        "A minimal fallback PDF has been generated so the report remains accessible.",
        "",
        `Company: ${String(pdfPayloadRaw.companyName ?? symbol)}`,
        `Ticker: ${String(pdfPayloadRaw.ticker ?? symbol)}`,
        `Rating: ${String(pdfPayloadRaw.rating ?? "n/a")}`,
        `Title: ${String(pdfPayloadRaw.reportTitle ?? `${symbol} Research Report`)}`,
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to render report PDF.";
    console.error("Workspace report PDF route failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
