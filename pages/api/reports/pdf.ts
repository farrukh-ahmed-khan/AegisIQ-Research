import type { NextApiRequest, NextApiResponse } from 'next';
import {
  mapReportToPdfData,
  renderEquityResearchPdf,
  type ExistingReportPayload,
} from '@/lib/pdf/export-report';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};

function buildFilename(payload: ExistingReportPayload) {
  const company =
    String(payload.companyName ?? payload.company ?? 'company')
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'company';

  const ticker =
    String(payload.ticker ?? payload.symbol ?? 'report')
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'report';

  const date =
    String(payload.reportDate ?? payload.asOfDate ?? new Date().toISOString().slice(0, 10))
      .trim()
      .replace(/[^0-9-]+/g, '') || new Date().toISOString().slice(0, 10);

  return `${company}-${ticker}-${date}.pdf`;
}

function sendJsonError(
  res: NextApiResponse,
  status: number,
  message: string,
) {
  res.status(status).json({
    ok: false,
    error: message,
  });
}

function buildGetPayload(req: NextApiRequest): ExistingReportPayload {
  return {
    companyName: String(req.query.companyName ?? req.query.company ?? ''),
    ticker: String(req.query.ticker ?? req.query.symbol ?? ''),
    exchange: req.query.exchange ? String(req.query.exchange) : undefined,
    sector: req.query.sector ? String(req.query.sector) : undefined,
    industry: req.query.industry ? String(req.query.industry) : undefined,
    reportDate: req.query.reportDate ? String(req.query.reportDate) : undefined,
    analystLabel: req.query.analystLabel ? String(req.query.analystLabel) : undefined,
    firmName: req.query.firmName ? String(req.query.firmName) : undefined,
    contactEmail: req.query.contactEmail ? String(req.query.contactEmail) : undefined,
    reportTitle: req.query.reportTitle ? String(req.query.reportTitle) : undefined,
    reportSubtitle: req.query.reportSubtitle ? String(req.query.reportSubtitle) : undefined,
    rating: req.query.rating ? String(req.query.rating) : undefined,
    score: req.query.score ? String(req.query.score) : undefined,
    priceTarget: req.query.priceTarget ? String(req.query.priceTarget) : undefined,
    currentPrice: req.query.currentPrice ? String(req.query.currentPrice) : undefined,
    upside: req.query.upside ? String(req.query.upside) : undefined,
    themeId: req.query.themeId ? String(req.query.themeId) : 'toon-gamma',
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return sendJsonError(res, 405, 'Method not allowed');
  }

  try {
    const payload: ExistingReportPayload =
      req.method === 'POST'
        ? (req.body as ExistingReportPayload)
        : buildGetPayload(req);

    const companyName = String(payload.companyName ?? payload.company ?? '').trim();
    const ticker = String(payload.ticker ?? payload.symbol ?? '').trim();

    if (!companyName) {
      return sendJsonError(res, 400, 'Missing companyName');
    }

    if (!ticker) {
      return sendJsonError(res, 400, 'Missing ticker');
    }

    const pdfBytes = await renderEquityResearchPdf(payload);
    const filename = buildFilename(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader(
      'X-Report-Theme',
      mapReportToPdfData(payload).themeId ?? 'toon-gamma',
    );

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate PDF report';

    return sendJsonError(res, 500, message);
  }
}
