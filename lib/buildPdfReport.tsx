import PDFDocument from "pdfkit";

async function buildPdfReport({ request, analytics, narrative, aiReport }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
    });

    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const colors = {
      navy: "#0B1F3B",
      blue: "#0B3D91",
      lightBlue: "#EAF1FF",
      text: "#1F2937",
      muted: "#6B7280",
      border: "#D6DFEE",
      green: "#14804A",
      red: "#B42318",
    };

    const rating = deriveRating(analytics);
    const targetRange = narrative?.targetRange || {};
    const thesisText =
      narrative?.thesis || "Preliminary quantitative thesis unavailable.";
    const aiText =
      aiReport ||
      "AI narrative has not yet been generated for this request. Use the AI research generator first, then export the PDF again.";

    drawHeader(doc, colors, request, rating);
    drawSummaryBand(doc, colors, analytics, targetRange);
    drawSectionTitle(doc, colors, "Investment Thesis");
    drawParagraph(doc, thesisText, colors);

    drawSectionTitle(doc, colors, "AI Research Narrative");
    drawParagraph(doc, aiText, colors);

    drawSectionTitle(doc, colors, "Quantitative Snapshot");
    drawMetricsTable(doc, colors, [
      ["Rows Saved", safeString(analytics.rows)],
      ["Period Return", formatPercent(analytics.percentChange)],
      ["Annualized Volatility", formatPercent(analytics.volatilityAnnualized)],
      ["Trend Signal", safeString(analytics.trend)],
      ["First Close", formatMoney(analytics.firstClose)],
      ["Last Close", formatMoney(analytics.lastClose)],
      ["SMA 20", formatMoney(analytics.sma20)],
      ["SMA 50", formatMoney(analytics.sma50)],
      ["Highest High", formatMoney(analytics.highMax)],
      ["Lowest Low", formatMoney(analytics.lowMin)],
      ["Average Volume", formatWhole(analytics.averageVolume)],
      ["Range Position", formatPercent(analytics.pricePosition)],
    ]);

    drawSectionTitle(doc, colors, "Risk Flags");
    const risks = buildRiskFlags(analytics);
    risks.forEach((risk) => drawBullet(doc, risk, colors));

    drawSectionTitle(doc, colors, "Catalyst Framework");
    const catalysts = buildCatalysts(analytics);
    catalysts.forEach((item) => drawBullet(doc, item, colors));

    drawSectionTitle(doc, colors, "Target Range");
    drawParagraph(
      doc,
      `AegisIQ preliminary target framework suggests a low case of ${formatMoney(
        targetRange.low
      )}, a base case of ${formatMoney(
        targetRange.base
      )}, and a high case of ${formatMoney(
        targetRange.high
      )}. This is a rules-based placeholder range built from uploaded price history and should later be replaced or validated with DCF and comparable-company analysis.`,
      colors
    );

    drawFooter(doc, colors, request);
    doc.end();
  });
}

function drawHeader(doc, colors, request, rating) {
  doc
    .roundedRect(40, 35, 515, 105, 16)
    .fill(colors.navy);

  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("AegisIQ Equity Research", 60, 58);

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#D9E4FF")
    .text("Automated Institutional Research Report", 60, 88);

  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(28)
    .text(request.ticker || "—", 395, 58, { width: 120, align: "right" });

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#D9E4FF")
    .text(`Period: ${request.period || "—"}`, 395, 92, { width: 120, align: "right" });

  doc
    .roundedRect(60, 155, 150, 54, 12)
    .fill("#F8FBFF")
    .stroke(colors.border);

  doc
    .fillColor(colors.muted)
    .font("Helvetica")
    .fontSize(10)
    .text("Analyst Rating", 74, 170);

  doc
    .fillColor(rating.color)
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(rating.label, 74, 183);

  doc
    .fillColor(colors.text)
    .font("Helvetica")
    .fontSize(10)
    .text(
      `Request ID: ${request.id || "—"}    Uploaded: ${formatDateTime(request.created_at)}`,
      250,
      173,
      { width: 250, align: "right" }
    );

  doc
    .fillColor(colors.text)
    .font("Helvetica")
    .fontSize(10)
    .text(
      `Source file: ${request.original_filename || "—"}`,
      250,
      189,
      { width: 250, align: "right" }
    );

  doc.moveDown(2);
  doc.y = 235;
}

function drawSummaryBand(doc, colors, analytics, targetRange) {
  const top = doc.y;
  const left = 50;
  const width = 495;
  const boxW = 155;
  const gap = 15;

  const items = [
    ["Last Close", formatMoney(analytics.lastClose)],
    ["Period Return", formatPercent(analytics.percentChange)],
    ["Base Target", formatMoney(targetRange.base)],
  ];

  items.forEach((item, idx) => {
    const x = left + idx * (boxW + gap);
    doc.roundedRect(x, top, boxW, 68, 12).fillAndStroke("#FFFFFF", colors.border);

    doc
      .fillColor(colors.muted)
      .font("Helvetica")
      .fontSize(10)
      .text(item[0], x + 14, top + 13);

    doc
      .fillColor(colors.blue)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(item[1], x + 14, top + 30, { width: boxW - 28 });
  });

  doc.y = top + 90;
}

function drawSectionTitle(doc, colors, title) {
  ensurePageSpace(doc, 80);
  doc
    .fillColor(colors.navy)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(title, 50, doc.y);

  doc
    .strokeColor(colors.border)
    .lineWidth(1)
    .moveTo(50, doc.y + 20)
    .lineTo(545, doc.y + 20)
    .stroke();

  doc.moveDown(1.4);
}

function drawParagraph(doc, text, colors) {
  doc
    .fillColor(colors.text)
    .font("Helvetica")
    .fontSize(10.5)
    .text(text || "—", 50, doc.y, {
      width: 495,
      align: "justify",
      lineGap: 3,
    });
  doc.moveDown(1.2);
}

function drawBullet(doc, text, colors) {
  ensurePageSpace(doc, 30);
  const y = doc.y;
  doc.circle(56, y + 7, 2.2).fill(colors.blue);
  doc
    .fillColor(colors.text)
    .font("Helvetica")
    .fontSize(10.5)
    .text(text, 66, y, {
      width: 475,
      lineGap: 3,
    });
  doc.moveDown(0.8);
}

function drawMetricsTable(doc, colors, rows) {
  const startX = 50;
  const tableW = 495;
  const col1 = 210;
  const col2 = tableW - col1;
  const rowH = 24;

  rows.forEach((row, idx) => {
    ensurePageSpace(doc, 28);
    const y = doc.y;

    doc
      .rect(startX, y, col1, rowH)
      .fillAndStroke(idx % 2 === 0 ? "#F8FBFF" : "#FFFFFF", colors.border);

    doc
      .rect(startX + col1, y, col2, rowH)
      .fillAndStroke(idx % 2 === 0 ? "#F8FBFF" : "#FFFFFF", colors.border);

    doc
      .fillColor(colors.text)
      .font("Helvetica")
      .fontSize(10)
      .text(row[0], startX + 10, y + 7, { width: col1 - 20 });

    doc
      .fillColor(colors.blue)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(row[1], startX + col1 + 10, y + 7, { width: col2 - 20 });

    doc.y = y + rowH;
  });

  doc.moveDown(1);
}

function drawFooter(doc, colors, request) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(colors.muted)
      .text(
        `AegisIQ Research · ${request.ticker || "—"} · Generated ${new Date().toLocaleString("en-US")}`,
        50,
        790,
        { width: 320, align: "left" }
      );

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(colors.muted)
      .text(`Page ${i + 1} of ${range.count}`, 420, 790, {
        width: 120,
        align: "right",
      });
  }
}

function buildRiskFlags(analytics) {
  const risks = [];

  if (num(analytics.volatilityAnnualized) > 45) {
    risks.push("Elevated annualized volatility suggests a high-risk trading profile.");
  } else if (num(analytics.volatilityAnnualized) > 25) {
    risks.push("Moderate volatility implies meaningful price dispersion risk.");
  } else {
    risks.push("Observed volatility is relatively contained versus a highly speculative profile.");
  }

  if (num(analytics.percentChange) < 0) {
    risks.push("Negative observed return period indicates recent price weakness and sentiment pressure.");
  }

  if (num(analytics.sma20) < num(analytics.sma50)) {
    risks.push("Short-term moving average below medium-term moving average implies technical softness.");
  }

  if (num(analytics.pricePosition) > 80) {
    risks.push("Price is near the upper end of the observed range, which may limit near-term upside.");
  }

  if (risks.length === 0) {
    risks.push("No dominant price-based risk flag detected from uploaded history alone.");
  }

  return risks;
}

function buildCatalysts(analytics) {
  const catalysts = [];

  if (num(analytics.sma20) > num(analytics.sma50)) {
    catalysts.push("Positive moving-average structure may support continued technical momentum.");
  }

  if (num(analytics.percentChange) > 10) {
    catalysts.push("Strong trailing price appreciation may attract incremental investor attention.");
  }

  if (num(analytics.pricePosition) < 30) {
    catalysts.push("Lower range positioning may create recovery upside if fundamentals improve.");
  }

  catalysts.push("Next upgrade should incorporate financial statements, estimates, and peer comparables.");
  return catalysts;
}

function deriveRating(analytics) {
  const ret = num(analytics.percentChange);
  const s20 = num(analytics.sma20);
  const s50 = num(analytics.sma50);

  if (ret > 15 && s20 > s50) return { label: "Buy", color: "#14804A" };
  if (ret >= 0) return { label: "Hold", color: "#0B3D91" };
  return { label: "Reduce", color: "#B42318" };
}

function ensurePageSpace(doc, needed) {
  if (doc.y + needed > 740) {
    doc.addPage();
    doc.y = 50;
  }
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeString(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatWhole(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US");
}

export {
  buildPdfReport,
};
