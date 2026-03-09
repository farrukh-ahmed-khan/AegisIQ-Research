import { NextRequest, NextResponse } from 'next/server';
import {
  mapReportToPdfData,
  renderEquityResearchPdf,
  type ExistingReportPayload,
} from '@/lib/pdf/export-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExistingReportPayload;

    const companyName = String(body.companyName ?? body.company ?? '').trim();
    const ticker = String(body.ticker ?? body.symbol ?? '').trim();

    if (!companyName) {
      return jsonError('Missing companyName');
    }

    if (!ticker) {
      return jsonError('Missing ticker');
    }

    const pdfBytes = await renderEquityResearchPdf(body);
    const filename = buildFilename(body);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-Report-Theme': mapReportToPdfData(body).themeId ?? 'toon-gamma',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate PDF report';

    return jsonError(message, 500);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyName = searchParams.get('companyName') ?? searchParams.get('company') ?? '';
  const ticker = searchParams.get('ticker') ?? searchParams.get('symbol') ?? '';

  if (!companyName || !ticker) {
    return jsonError('Provide companyName and ticker, or use POST with the full report payload.');
  }

  const payload: ExistingReportPayload = {
    companyName,
    ticker,
    exchange: searchParams.get('exchange'),
    sector: searchParams.get('sector'),
    industry: searchParams.get('industry'),
    reportDate: searchParams.get('reportDate') ?? undefined,
    analystLabel: searchParams.get('analystLabel') ?? undefined,
    firmName: searchParams.get('firmName') ?? undefined,
    contactEmail: searchParams.get('contactEmail') ?? undefined,
    reportTitle: searchParams.get('reportTitle') ?? undefined,
    reportSubtitle: searchParams.get('reportSubtitle') ?? undefined,
    rating: searchParams.get('rating') ?? undefined,
    score: searchParams.get('score') ?? undefined,
    priceTarget: searchParams.get('priceTarget') ?? undefined,
    currentPrice: searchParams.get('currentPrice') ?? undefined,
    upside: searchParams.get('upside') ?? undefined,
    themeId: searchParams.get('themeId') ?? 'toon-gamma',
  };

  try {
    const pdfBytes = await renderEquityResearchPdf(payload);
    const filename = buildFilename(payload);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate PDF report';

    return jsonError(message, 500);
  }
}
