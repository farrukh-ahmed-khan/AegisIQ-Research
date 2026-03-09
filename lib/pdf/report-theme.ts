import {
  buildPdfStyles,
  defaultPdfThemePack,
  getScoreTone,
  getToneColors,
  type PdfThemePack,
  type PdfTone,
} from './theme-pack';
import { toonGammaThemePack } from './theme-packs/toon-gamma';

export type ReportThemeId = 'aegis-classic' | 'toon-gamma';

const THEMES: Record<ReportThemeId, PdfThemePack> = {
  'aegis-classic': defaultPdfThemePack,
  'toon-gamma': toonGammaThemePack,
};

export function getReportTheme(themeId?: string | null): PdfThemePack {
  if (!themeId) return THEMES['toon-gamma'];
  return THEMES[themeId as ReportThemeId] ?? THEMES['toon-gamma'];
}

export function getReportPdfStyles(themeId?: string | null) {
  return buildPdfStyles(getReportTheme(themeId));
}

export function getInvestmentSignalBadge(score: number, themeId?: string | null) {
  const theme = getReportTheme(themeId);
  const tone = getScoreTone(score, theme);
  const colors = getToneColors(tone, theme);

  const label =
    tone === 'positive'
      ? 'Buy'
      : tone === 'negative'
        ? 'Sell'
        : tone === 'warning'
          ? 'Mixed'
          : 'Neutral';

  return {
    tone,
    label,
    colors,
  };
}

export function getRatingDisplay(
  rating: string | null | undefined,
  score: number | null | undefined,
  themeId?: string | null,
): {
  label: string;
  tone: PdfTone;
  colors: { text: string; bg: string; border: string };
} {
  const theme = getReportTheme(themeId);

  if (rating) {
    const normalized = rating.trim().toLowerCase();

    if (normalized.includes('strong buy') || normalized === 'buy') {
      return {
        label: rating,
        tone: 'positive',
        colors: getToneColors('positive', theme),
      };
    }

    if (normalized.includes('speculative buy')) {
      return {
        label: rating,
        tone: 'warning',
        colors: {
          text: theme.palette.heading,
          bg: theme.palette.goldSoft,
          border: theme.palette.gold,
        },
      };
    }

    if (normalized.includes('hold') || normalized.includes('neutral')) {
      return {
        label: rating,
        tone: 'neutral',
        colors: getToneColors('neutral', theme),
      };
    }

    if (normalized.includes('sell')) {
      return {
        label: rating,
        tone: 'negative',
        colors: getToneColors('negative', theme),
      };
    }
  }

  if (typeof score === 'number') {
    const tone = getScoreTone(score, theme);
    return {
      label:
        tone === 'positive'
          ? 'Buy'
          : tone === 'negative'
            ? 'Sell'
            : tone === 'warning'
              ? 'Mixed'
              : 'Neutral',
      tone,
      colors: getToneColors(tone, theme),
    };
  }

  return {
    label: 'Unrated',
    tone: 'neutral',
    colors: getToneColors('neutral', theme),
  };
}

export function buildThemeAwareReportMeta(input: {
  companyName: string;
  ticker: string;
  exchange?: string | null;
  asOfDate: string;
  analystLabel?: string | null;
  reportTitle?: string | null;
  reportSubtitle?: string | null;
  themeId?: string | null;
  score?: number | null;
  rating?: string | null;
  priceTarget?: string | null;
  currentPrice?: string | null;
  upside?: string | null;
}) {
  const theme = getReportTheme(input.themeId);
  const displayRating = getRatingDisplay(input.rating, input.score, input.themeId);

  return {
    theme,
    title:
      input.reportTitle?.trim() ||
      `${input.companyName}${input.ticker ? ` (${input.ticker.toUpperCase()})` : ''}`,
    subtitle:
      input.reportSubtitle?.trim() ||
      `An institutional-grade equity research report on ${input.companyName}${
        input.exchange ? ` (${input.exchange}: ${input.ticker.toUpperCase()})` : ''
      }.`,
    tickerLabel: input.exchange
      ? `${input.exchange}: ${input.ticker.toUpperCase()}`
      : input.ticker.toUpperCase(),
    rating: displayRating,
    coverTags: [
      'Institutional Research Report',
      input.exchange ? `${input.exchange}: ${input.ticker.toUpperCase()}` : input.ticker.toUpperCase(),
    ],
    coverMeta: [
      { label: 'Company', value: input.companyName },
      { label: 'Ticker', value: input.ticker.toUpperCase() },
      { label: 'Date', value: input.asOfDate },
      { label: 'Analyst', value: input.analystLabel || 'AegisIQ Research Team' },
      ...(input.priceTarget ? [{ label: 'Price Target', value: input.priceTarget }] : []),
      ...(input.currentPrice ? [{ label: 'Current Price', value: input.currentPrice }] : []),
      ...(input.upside ? [{ label: 'Upside', value: input.upside }] : []),
    ],
  };
}

export function getStandardFooterMeta(input: {
  companyTicker: string;
  asOfDate: string;
  contactEmail?: string | null;
  firmName?: string | null;
}) {
  return {
    left: `© 2026 ${input.firmName || 'AegisIQ Limited'}`,
    center: input.companyTicker.toUpperCase(),
    right: `${input.asOfDate} | ${input.contactEmail || 'analysis@aegisiqfintech.com'}`,
  };
}
