import React from 'react';
import { pdf } from '@react-pdf/renderer';
import EquityResearchPdfDocument, {
  type EquityResearchPdfData,
} from './report-document';

type Primitive = string | number | boolean | null | undefined;

type UnknownRecord = Record<string, unknown>;

export type ExistingReportPayload = {
  themeId?: string | null;

  companyName?: string | null;
  company?: string | null;
  ticker?: string | null;
  symbol?: string | null;
  exchange?: string | null;
  sector?: string | null;
  industry?: string | null;
  reportDate?: string | null;
  asOfDate?: string | null;

  analystLabel?: string | null;
  analyst?: string | null;
  firmName?: string | null;
  publisher?: string | null;
  contactEmail?: string | null;
  email?: string | null;
  socialHandle?: string | null;
  jurisdiction?: string | null;

  reportTitle?: string | null;
  reportSubtitle?: string | null;
  rating?: string | null;
  recommendation?: string | null;
  score?: number | string | null;
  aiScore?: number | string | null;
  priceTarget?: string | number | null;
  targetPrice?: string | number | null;
  currentPrice?: string | number | null;
  price?: string | number | null;
  upside?: string | number | null;
  upsidePercent?: string | number | null;
  riskRating?: string | null;
  distributionLabel?: string | null;
  horizon?: string | null;

  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  logoImageUrl?: string | null;

  executiveSummaryText?: string | null;
  summary?: string | null;
  executiveSummaryBlocks?: Array<{ heading?: string; body?: string }> | null;

  overviewDescription?: string | null;
  companyOverview?: string | null;
  investmentThesisText?: string | null;
  thesis?: string | null;
  valuationSummaryText?: string | null;
  technicalSummaryText?: string | null;
  conclusionText?: string | null;

  dashboardMetrics?: Array<{ label?: string; value?: Primitive }> | null;
  companyMetrics?: Array<{ label?: string; value?: Primitive }> | null;
  valuationMetrics?: Array<{ label?: string; value?: Primitive }> | null;
  technicalMetrics?: Array<{ label?: string; value?: Primitive }> | null;
  modelMetrics?: Array<{ label?: string; value?: Primitive }> | null;

  thesisBullets?: Array<string | { title?: string; text?: string }> | null;
  growthCatalysts?: Array<string | { title?: string; text?: string }> | null;
  catalysts?: Array<string | { title?: string; text?: string }> | null;
  riskFactors?: Array<string | { title?: string; text?: string }> | null;
  risks?: Array<string | { title?: string; text?: string }> | null;
  tamBullets?: Array<string | { title?: string; text?: string }> | null;

  financialModelNarrative?: string | null;
  modelNarrative?: string | null;
  valuationNarrative?: string | null;
  technicalNarrative?: string | null;
  disclaimerText?: string | null;
  disclosureText?: string | null;
  analystCertificationText?: string | null;

  dashboardTable?: Array<Record<string, Primitive>> | null;
  businessSegmentsTable?: Array<Record<string, Primitive>> | null;
  forecastTable?: Array<Record<string, Primitive>> | null;
  peerTable?: Array<Record<string, Primitive>> | null;
  modelTable?: Array<Record<string, Primitive>> | null;
  valuationTable?: Array<Record<string, Primitive>> | null;
  disclosuresTable?: Array<Record<string, Primitive>> | null;

  valuationScenarios?:
    | Array<{ name?: string; value?: Primitive; description?: string }>
    | null;

  sentimentItems?:
    | Array<{ label?: string; score?: Primitive; description?: string }>
    | null;

  dashboardImage?: { src?: string | null } | string | null;
  thesisImage?: { src?: string | null } | string | null;
  technicalImage?: { src?: string | null } | string | null;
  tamImage?: { src?: string | null } | string | null;
  valuationImage?: { src?: string | null } | string | null;
  conclusionImage?: { src?: string | null } | string | null;

  appendixImages?:
    | Array<{ title?: string; subtitle?: string; src?: string | null }>
    | null;

  metrics?: {
    dashboard?: Array<{ label?: string; value?: Primitive }> | null;
    company?: Array<{ label?: string; value?: Primitive }> | null;
    valuation?: Array<{ label?: string; value?: Primitive }> | null;
    technical?: Array<{ label?: string; value?: Primitive }> | null;
    model?: Array<{ label?: string; value?: Primitive }> | null;
  } | null;

  tables?: {
    dashboard?: Array<Record<string, Primitive>> | null;
    businessSegments?: Array<Record<string, Primitive>> | null;
    forecast?: Array<Record<string, Primitive>> | null;
    peers?: Array<Record<string, Primitive>> | null;
    model?: Array<Record<string, Primitive>> | null;
    valuation?: Array<Record<string, Primitive>> | null;
    disclosures?: Array<Record<string, Primitive>> | null;
  } | null;

  images?: {
    dashboard?: string | null;
    thesis?: string | null;
    technical?: string | null;
    tam?: string | null;
    valuation?: string | null;
    conclusion?: string | null;
    cover?: string | null;
    hero?: string | null;
    logo?: string | null;
  } | null;

  sections?: UnknownRecord | null;
  [key: string]: unknown;
};

function asString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  const result = String(value).trim();
  return result || fallback;
}

function asNullableString(value: unknown): string | null {
  const result = asString(value);
  return result || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asMetricValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  const text = String(value).trim();
  return text || '—';
}

function toCurrencyString(value: unknown): string | null {
  const raw = asString(value);
  if (raw) return raw;
  const num = asNumber(value);
  if (num === null) return null;
  return `$${num.toFixed(2)}`;
}

function toPercentString(value: unknown): string | null {
  const raw = asString(value);
  if (raw) return raw;
  const num = asNumber(value);
  if (num === null) return null;
  return `${num}%`;
}

function normalizeMetricArray(
  input: unknown,
): Array<{ label: string; value: string }> {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const label = asString(row.label ?? row.name ?? row.title);
      const value = asMetricValue(row.value ?? row.amount ?? row.metric ?? row.score);
      if (!label) return null;
      return { label, value };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

function normalizeBulletArray(
  input: unknown,
): Array<{ title?: string; text: string }> {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === 'string') {
        const text = asString(item);
        return text ? { text } : null;
      }

      if (!item || typeof item !== 'object') return null;

      const row = item as Record<string, unknown>;
      const title = asNullableString(row.title ?? row.heading ?? row.label);
      const text = asString(row.text ?? row.body ?? row.description ?? row.value);

      if (!text) return null;
      return title ? { title, text } : { text };
    })
    .filter((item): item is { title?: string; text: string } => Boolean(item));
}

function normalizeTableArray(
  input: unknown,
): Array<Record<string, Primitive>> {
  if (!Array.isArray(input)) return [];

  return input
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const record = row as Record<string, unknown>;
      const entries = Object.entries(record).reduce<Record<string, Primitive>>(
        (acc, [key, value]) => {
          if (!key) return acc;
          if (
            value === null ||
            value === undefined ||
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            acc[key] = value as Primitive;
          } else {
            acc[key] = JSON.stringify(value);
          }
          return acc;
        },
        {},
      );

      return Object.keys(entries).length ? entries : null;
    })
    .filter((row): row is Record<string, Primitive> => Boolean(row));
}

function normalizeScenarioArray(
  input: unknown,
): Array<{ name: string; value?: string; description?: string }> {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = asString(row.name ?? row.label ?? row.title);
      if (!name) return null;

      const value = asNullableString(row.value ?? row.priceTarget ?? row.target);
      const description = asNullableString(
        row.description ?? row.body ?? row.text,
      );

      return {
        name,
        ...(value ? { value } : {}),
        ...(description ? { description } : {}),
      };
    })
    .filter(
      (
        item,
      ): item is { name: string; value?: string; description?: string } =>
        Boolean(item),
    );
}

function normalizeSentimentArray(
  input: unknown,
): Array<{ label: string; score: string; description?: string }> {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const label = asString(row.label ?? row.name ?? row.title);
      const score = asMetricValue(row.score ?? row.value);
      if (!label) return null;

      const description = asNullableString(
        row.description ?? row.body ?? row.text,
      );

      return {
        label,
        score,
        ...(description ? { description } : {}),
      };
    })
    .filter(
      (
        item,
      ): item is { label: string; score: string; description?: string } =>
        Boolean(item),
    );
}

function normalizeImage(
  input: unknown,
): { src?: string | null } | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const src = asNullableString(input);
    return src ? { src } : null;
  }
  if (typeof input === 'object') {
    const row = input as Record<string, unknown>;
    const src = asNullableString(row.src ?? row.url ?? row.imageUrl);
    return src ? { src } : null;
  }
  return null;
}

function normalizeAppendixImages(
  input: unknown,
): Array<{ title?: string; subtitle?: string; src?: string | null }> {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const src = asNullableString(row.src ?? row.url ?? row.imageUrl);
      if (!src) return null;

      const title = asNullableString(row.title ?? row.name);
      const subtitle = asNullableString(row.subtitle ?? row.caption);

      return {
        ...(title ? { title } : {}),
        ...(subtitle ? { subtitle } : {}),
        src,
      };
    })
    .filter(
      (
        item,
      ): item is { title?: string; subtitle?: string; src?: string | null } =>
        Boolean(item),
    );
}

export function mapReportToPdfData(
  payload: ExistingReportPayload,
): EquityResearchPdfData {
  const companyName = asString(payload.companyName ?? payload.company, 'Unknown Company');
  const ticker = asString(payload.ticker ?? payload.symbol, 'N/A');
  const exchange = asNullableString(payload.exchange);
  const reportDate = asString(
    payload.reportDate ?? payload.asOfDate,
    new Date().toISOString().slice(0, 10),
  );

  return {
    themeId: asNullableString(payload.themeId) ?? 'toon-gamma',

    companyName,
    ticker,
    exchange,
    sector: asNullableString(payload.sector),
    industry: asNullableString(payload.industry),
    reportDate,

    analystLabel: asNullableString(payload.analystLabel ?? payload.analyst),
    firmName: asNullableString(payload.firmName ?? payload.publisher) ?? 'AegisIQ Limited',
    contactEmail:
      asNullableString(payload.contactEmail ?? payload.email) ??
      'analysis@aegisiqfintech.com',
    socialHandle: asNullableString(payload.socialHandle),
    jurisdiction: asNullableString(payload.jurisdiction),

    reportTitle: asNullableString(payload.reportTitle),
    reportSubtitle: asNullableString(payload.reportSubtitle),
    rating: asNullableString(payload.rating ?? payload.recommendation),
    score: asNumber(payload.score ?? payload.aiScore),
    priceTarget: toCurrencyString(payload.priceTarget ?? payload.targetPrice),
    currentPrice: toCurrencyString(payload.currentPrice ?? payload.price),
    upside: toPercentString(payload.upside ?? payload.upsidePercent),
    riskRating: asNullableString(payload.riskRating),
    distributionLabel: asNullableString(payload.distributionLabel),
    horizon: asNullableString(payload.horizon),

    heroImageUrl: asNullableString(payload.heroImageUrl ?? payload.images?.hero),
    coverImageUrl: asNullableString(payload.coverImageUrl ?? payload.images?.cover),
    logoImageUrl: asNullableString(payload.logoImageUrl ?? payload.images?.logo),

    executiveSummaryText: asNullableString(
      payload.executiveSummaryText ?? payload.summary,
    ),
    executiveSummaryBlocks:
      payload.executiveSummaryBlocks?.map((item) => ({
        heading: asString(item.heading, 'Summary'),
        body: asString(item.body),
      })) ?? [],

    overviewDescription: asNullableString(
      payload.overviewDescription ?? payload.companyOverview,
    ),
    investmentThesisText: asNullableString(
      payload.investmentThesisText ?? payload.thesis,
    ),
    valuationSummaryText: asNullableString(payload.valuationSummaryText),
    technicalSummaryText: asNullableString(payload.technicalSummaryText),
    conclusionText: asNullableString(payload.conclusionText),

    dashboardMetrics: normalizeMetricArray(
      payload.dashboardMetrics ?? payload.metrics?.dashboard,
    ),
    companyMetrics: normalizeMetricArray(
      payload.companyMetrics ?? payload.metrics?.company,
    ),
    valuationMetrics: normalizeMetricArray(
      payload.valuationMetrics ?? payload.metrics?.valuation,
    ),
    technicalMetrics: normalizeMetricArray(
      payload.technicalMetrics ?? payload.metrics?.technical,
    ),
    modelMetrics: normalizeMetricArray(
      payload.modelMetrics ?? payload.metrics?.model,
    ),

    thesisBullets: normalizeBulletArray(payload.thesisBullets),
    growthCatalysts: normalizeBulletArray(
      payload.growthCatalysts ?? payload.catalysts,
    ),
    riskFactors: normalizeBulletArray(payload.riskFactors ?? payload.risks),
    tamBullets: normalizeBulletArray(payload.tamBullets),

    financialModelNarrative: asNullableString(
      payload.financialModelNarrative ?? payload.modelNarrative,
    ),
    valuationNarrative: asNullableString(payload.valuationNarrative),
    technicalNarrative: asNullableString(payload.technicalNarrative),
    disclaimerText: asNullableString(payload.disclaimerText),
    disclosureText: asNullableString(payload.disclosureText),
    analystCertificationText: asNullableString(payload.analystCertificationText),

    dashboardTable: normalizeTableArray(
      payload.dashboardTable ?? payload.tables?.dashboard,
    ),
    businessSegmentsTable: normalizeTableArray(
      payload.businessSegmentsTable ?? payload.tables?.businessSegments,
    ),
    forecastTable: normalizeTableArray(
      payload.forecastTable ?? payload.tables?.forecast,
    ),
    peerTable: normalizeTableArray(
      payload.peerTable ?? payload.tables?.peers,
    ),
    modelTable: normalizeTableArray(
      payload.modelTable ?? payload.tables?.model,
    ),
    valuationTable: normalizeTableArray(
      payload.valuationTable ?? payload.tables?.valuation,
    ),
    disclosuresTable: normalizeTableArray(
      payload.disclosuresTable ?? payload.tables?.disclosures,
    ),

    valuationScenarios: normalizeScenarioArray(payload.valuationScenarios),
    sentimentItems: normalizeSentimentArray(payload.sentimentItems),

    dashboardImage: normalizeImage(
      payload.dashboardImage ?? payload.images?.dashboard,
    ),
    thesisImage: normalizeImage(payload.thesisImage ?? payload.images?.thesis),
    technicalImage: normalizeImage(
      payload.technicalImage ?? payload.images?.technical,
    ),
    tamImage: normalizeImage(payload.tamImage ?? payload.images?.tam),
    valuationImage: normalizeImage(
      payload.valuationImage ?? payload.images?.valuation,
    ),
    conclusionImage: normalizeImage(
      payload.conclusionImage ?? payload.images?.conclusion,
    ),

    appendixImages: normalizeAppendixImages(payload.appendixImages),
  };
}

export async function renderEquityResearchPdf(
  payload: ExistingReportPayload,
): Promise<Uint8Array> {
  const data = mapReportToPdfData(payload);
  const instance = pdf(<EquityResearchPdfDocument data={data} />);
  return instance.toBuffer();
}

export async function renderEquityResearchPdfBlob(
  payload: ExistingReportPayload,
): Promise<Blob> {
  const data = mapReportToPdfData(payload);
  const instance = pdf(<EquityResearchPdfDocument data={data} />);
  return instance.toBlob();
}

export async function renderEquityResearchPdfString(
  payload: ExistingReportPayload,
): Promise<string> {
  const bytes = await renderEquityResearchPdf(payload);
  return Buffer.from(bytes).toString('base64');
}

export async function renderEquityResearchPdfStream(
  payload: ExistingReportPayload,
): Promise<Uint8Array> {
  const data = mapReportToPdfData(payload);
  const instance = pdf(<EquityResearchPdfDocument data={data} />);
  return instance.toBuffer();
}

export default renderEquityResearchPdf;
