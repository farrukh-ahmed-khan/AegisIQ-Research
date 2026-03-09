export type PdfTone = 'positive' | 'negative' | 'warning' | 'neutral';

export type PdfPalette = {
  pageBg: string;
  pageAltBg: string;
  heroBg: string;
  heroText: string;
  cardBg: string;
  cardAltBg: string;
  softPanelBg: string;
  footerBg: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSoft: string;
  heading: string;
  accent: string;
  accentSoft: string;
  gold: string;
  goldSoft: string;
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
  warning: string;
  warningSoft: string;
  neutral: string;
  neutralSoft: string;
};

export type PdfTypography = {
  fontFamily: string;
  headingFamily: string;
  boldFamily: string;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  body: number;
  bodySmall: number;
  label: number;
  caption: number;
  lineHeight: number;
};

export type PdfSpacing = {
  pagePaddingX: number;
  pagePaddingY: number;
  sectionGap: number;
  blockGap: number;
  cardPadding: number;
  tableCellX: number;
  tableCellY: number;
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
};

export type PdfThemePack = {
  id: string;
  name: string;
  description: string;
  palette: PdfPalette;
  typography: PdfTypography;
  spacing: PdfSpacing;
  cover: {
    align: 'left' | 'center';
    titleCase: 'normal' | 'upper';
    titleTracking: number;
    useSplitHero: boolean;
    useMetaCards: boolean;
  };
  table: {
    striped: boolean;
    dense: boolean;
    headerUppercase: boolean;
  };
  score: {
    bullishThreshold: number;
    bearishThreshold: number;
  };
};

export const defaultPdfThemePack: PdfThemePack = {
  id: 'aegis-classic',
  name: 'Aegis Classic',
  description: 'Default institutional light theme for AegisIQ research reports.',
  palette: {
    pageBg: '#F5F5F4',
    pageAltBg: '#FFFFFF',
    heroBg: '#0D2447',
    heroText: '#F8FAFC',
    cardBg: '#FFFFFF',
    cardAltBg: '#F8FAFC',
    softPanelBg: '#E8DFC7',
    footerBg: '#E8DFC7',
    border: '#D7DCE4',
    borderStrong: '#BDC6D4',
    text: '#142033',
    textMuted: '#334155',
    textSoft: '#64748B',
    heading: '#10233F',
    accent: '#0D2447',
    accentSoft: '#E8EEF8',
    gold: '#AF8B35',
    goldSoft: '#F2E8CA',
    positive: '#0F766E',
    positiveSoft: '#CCFBF1',
    negative: '#B42318',
    negativeSoft: '#FEE4E2',
    warning: '#B54708',
    warningSoft: '#FEF0C7',
    neutral: '#475467',
    neutralSoft: '#EAECF0',
  },
  typography: {
    fontFamily: 'Helvetica',
    headingFamily: 'Helvetica-Bold',
    boldFamily: 'Helvetica-Bold',
    h1: 28,
    h2: 20,
    h3: 14,
    h4: 11,
    body: 10,
    bodySmall: 9,
    label: 8,
    caption: 7,
    lineHeight: 1.45,
  },
  spacing: {
    pagePaddingX: 32,
    pagePaddingY: 28,
    sectionGap: 16,
    blockGap: 10,
    cardPadding: 12,
    tableCellX: 8,
    tableCellY: 6,
    radiusSm: 4,
    radiusMd: 10,
    radiusLg: 14,
  },
  cover: {
    align: 'left',
    titleCase: 'normal',
    titleTracking: 0.2,
    useSplitHero: true,
    useMetaCards: true,
  },
  table: {
    striped: true,
    dense: false,
    headerUppercase: true,
  },
  score: {
    bullishThreshold: 70,
    bearishThreshold: 40,
  },
};

export function getScoreTone(score: number, theme: PdfThemePack): PdfTone {
  if (score >= theme.score.bullishThreshold) return 'positive';
  if (score <= theme.score.bearishThreshold) return 'negative';
  if (score >= 50) return 'warning';
  return 'neutral';
}

export function getToneColors(tone: PdfTone, theme: PdfThemePack) {
  switch (tone) {
    case 'positive':
      return {
        text: theme.palette.positive,
        bg: theme.palette.positiveSoft,
        border: theme.palette.positive,
      };
    case 'negative':
      return {
        text: theme.palette.negative,
        bg: theme.palette.negativeSoft,
        border: theme.palette.negative,
      };
    case 'warning':
      return {
        text: theme.palette.warning,
        bg: theme.palette.warningSoft,
        border: theme.palette.warning,
      };
    default:
      return {
        text: theme.palette.neutral,
        bg: theme.palette.neutralSoft,
        border: theme.palette.neutral,
      };
  }
}

export function buildPdfStyles(theme: PdfThemePack) {
  const { palette, typography, spacing } = theme;

  return {
    page: {
      backgroundColor: palette.pageBg,
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: typography.body,
      paddingHorizontal: spacing.pagePaddingX,
      paddingVertical: spacing.pagePaddingY,
    },

    pageWhite: {
      backgroundColor: palette.pageAltBg,
      color: palette.text,
      fontFamily: typography.fontFamily,
      fontSize: typography.body,
      paddingHorizontal: spacing.pagePaddingX,
      paddingVertical: spacing.pagePaddingY,
    },

    coverPage: {
      backgroundColor: palette.pageBg,
      minHeight: '100%',
      paddingHorizontal: spacing.pagePaddingX,
      paddingVertical: spacing.pagePaddingY,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    },

    coverSplitRow: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: 650,
      gap: 0,
    },

    coverImagePane: {
      width: '41%',
      backgroundColor: palette.heroBg,
      borderTopLeftRadius: spacing.radiusLg,
      borderBottomLeftRadius: spacing.radiusLg,
    },

    coverContentPane: {
      width: '59%',
      backgroundColor: palette.pageBg,
      paddingTop: 56,
      paddingBottom: 32,
      paddingHorizontal: 32,
      borderTopRightRadius: spacing.radiusLg,
      borderBottomRightRadius: spacing.radiusLg,
      justifyContent: 'flex-start',
    },

    coverEyebrow: {
      fontSize: typography.label,
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      marginBottom: 12,
      fontFamily: typography.boldFamily,
    },

    coverTitle: {
      fontSize: typography.h1 + 2,
      color: palette.heading,
      fontFamily: typography.headingFamily,
      marginBottom: 10,
      lineHeight: 1.15,
      letterSpacing: theme.cover.titleTracking,
      textTransform: theme.cover.titleCase === 'upper' ? 'uppercase' : 'none',
    },

    coverSubtitle: {
      fontSize: typography.h4,
      color: palette.textMuted,
      lineHeight: typography.lineHeight,
      marginBottom: 16,
      maxWidth: 360,
    },

    tagRow: {
      display: 'flex',
      flexDirection: 'row',
      gap: 8,
      marginBottom: 18,
      flexWrap: 'wrap',
    },

    tag: {
      fontSize: typography.caption,
      color: palette.textMuted,
      backgroundColor: palette.goldSoft,
      border: `1 solid ${palette.gold}`,
      borderRadius: spacing.radiusSm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      textTransform: 'uppercase',
    },

    heroCard: {
      backgroundColor: palette.heroBg,
      color: palette.heroText,
      borderRadius: spacing.radiusMd,
      padding: 18,
      marginBottom: 14,
    },

    heroCardTitle: {
      fontSize: typography.h2 + 1,
      color: palette.heroText,
      fontFamily: typography.headingFamily,
      marginBottom: 8,
    },

    heroCardText: {
      fontSize: typography.body,
      color: palette.heroText,
      lineHeight: typography.lineHeight,
    },

    sidebarTitle: {
      fontSize: typography.h2 - 1,
      color: palette.heading,
      fontFamily: typography.headingFamily,
      marginBottom: 8,
    },

    sidebarText: {
      fontSize: typography.body,
      color: palette.textMuted,
      lineHeight: typography.lineHeight,
      marginBottom: 8,
    },

    disclosureBox: {
      marginTop: 16,
      backgroundColor: palette.softPanelBg,
      borderRadius: spacing.radiusMd,
      padding: 12,
    },

    disclosureText: {
      fontSize: typography.body,
      color: palette.text,
      lineHeight: typography.lineHeight,
    },

    footerBand: {
      marginTop: 14,
      backgroundColor: palette.footerBg,
      borderRadius: spacing.radiusMd,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },

    footerBandText: {
      fontSize: typography.bodySmall,
      color: palette.text,
    },

    section: {
      marginBottom: spacing.sectionGap,
    },

    sectionHeaderRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 12,
    },

    sectionTitle: {
      fontSize: typography.h1,
      color: palette.heading,
      fontFamily: typography.headingFamily,
      lineHeight: 1.1,
    },

    sectionKicker: {
      alignSelf: 'flex-start',
      fontSize: typography.caption,
      color: palette.textMuted,
      backgroundColor: palette.goldSoft,
      border: `1 solid ${palette.gold}`,
      borderRadius: spacing.radiusSm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      textTransform: 'uppercase',
    },

    subheading: {
      fontSize: typography.h2,
      color: palette.heading,
      fontFamily: typography.headingFamily,
      marginBottom: 8,
    },

    h3: {
      fontSize: typography.h3,
      color: palette.heading,
      fontFamily: typography.headingFamily,
      marginBottom: 6,
    },

    h4: {
      fontSize: typography.h4,
      color: palette.heading,
      fontFamily: typography.headingFamily,
      marginBottom: 4,
    },

    body: {
      fontSize: typography.body,
      color: palette.text,
      lineHeight: typography.lineHeight,
    },

    bodyMuted: {
      fontSize: typography.body,
      color: palette.textMuted,
      lineHeight: typography.lineHeight,
    },

    small: {
      fontSize: typography.bodySmall,
      color: palette.textMuted,
      lineHeight: typography.lineHeight,
    },

    caption: {
      fontSize: typography.caption,
      color: palette.textSoft,
      lineHeight: typography.lineHeight,
    },

    label: {
      fontSize: typography.label,
      color: palette.textSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
      fontFamily: typography.boldFamily,
    },

    splitRow: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      gap: 14,
    },

    splitCol: {
      flexGrow: 1,
      flexBasis: 0,
    },

    card: {
      backgroundColor: palette.cardBg,
      border: `1 solid ${palette.border}`,
      borderRadius: spacing.radiusMd,
      padding: spacing.cardPadding,
      marginBottom: spacing.blockGap,
    },

    mutedCard: {
      backgroundColor: palette.cardAltBg,
      border: `1 solid ${palette.border}`,
      borderRadius: spacing.radiusMd,
      padding: spacing.cardPadding,
      marginBottom: spacing.blockGap,
    },

    softPanel: {
      backgroundColor: palette.softPanelBg,
      borderRadius: spacing.radiusMd,
      padding: spacing.cardPadding,
      marginBottom: spacing.blockGap,
    },

    metricGrid: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    metricCard: {
      width: '31%',
      backgroundColor: palette.cardBg,
      border: `1 solid ${palette.border}`,
      borderRadius: spacing.radiusMd,
      padding: 10,
    },

    metricValue: {
      fontSize: typography.h2,
      color: palette.heading,
      fontFamily: typography.headingFamily,
      marginBottom: 4,
    },

    metricLabel: {
      fontSize: typography.caption,
      color: palette.textSoft,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    tonePill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: spacing.radiusSm,
      fontSize: typography.caption,
      textTransform: 'uppercase',
      alignSelf: 'flex-start',
      fontFamily: typography.boldFamily,
    },

    bulletList: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
    },

    bulletRow: {
      display: 'flex',
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },

    bulletDot: {
      width: 4,
      height: 4,
      borderRadius: 999,
      backgroundColor: palette.heading,
      marginTop: 5,
      flexShrink: 0,
    },

    bulletText: {
      flexGrow: 1,
      fontSize: typography.body,
      color: palette.text,
      lineHeight: typography.lineHeight,
    },

    table: {
      width: '100%',
      border: `1 solid ${palette.borderStrong}`,
      borderRadius: spacing.radiusMd,
      overflow: 'hidden',
      marginBottom: spacing.blockGap,
    },

    tableHeader: {
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: palette.heroBg,
      borderBottom: `1 solid ${palette.borderStrong}`,
    },

    tableHeaderCell: {
      flexGrow: 1,
      flexBasis: 0,
      paddingHorizontal: spacing.tableCellX,
      paddingVertical: spacing.tableCellY + 1,
      fontSize: typography.caption,
      color: palette.heroText,
      textTransform: theme.table.headerUppercase ? 'uppercase' : 'none',
      letterSpacing: 0.7,
      fontFamily: typography.boldFamily,
    },

    tableRow: {
      display: 'flex',
      flexDirection: 'row',
      borderBottom: `1 solid ${palette.border}`,
      backgroundColor: palette.cardBg,
    },

    tableRowAlt: {
      display: 'flex',
      flexDirection: 'row',
      borderBottom: `1 solid ${palette.border}`,
      backgroundColor: theme.table.striped ? palette.cardAltBg : palette.cardBg,
    },

    tableCell: {
      flexGrow: 1,
      flexBasis: 0,
      paddingHorizontal: spacing.tableCellX,
      paddingVertical: spacing.tableCellY,
      fontSize: typography.bodySmall,
      color: palette.text,
      lineHeight: 1.35,
    },

    statBox: {
      backgroundColor: palette.heroBg,
      borderRadius: spacing.radiusMd,
      padding: 12,
      marginBottom: spacing.blockGap,
    },

    statBoxTitle: {
      fontSize: typography.h3,
      color: palette.heroText,
      fontFamily: typography.headingFamily,
      marginBottom: 8,
    },

    statBoxText: {
      fontSize: typography.bodySmall,
      color: palette.heroText,
      lineHeight: typography.lineHeight,
    },

    divider: {
      width: '100%',
      height: 1,
      backgroundColor: palette.borderStrong,
      marginVertical: 8,
    },

    pageFooter: {
      position: 'absolute',
      left: spacing.pagePaddingX,
      right: spacing.pagePaddingX,
      bottom: 12,
      backgroundColor: palette.footerBg,
      borderRadius: spacing.radiusSm,
      paddingHorizontal: 10,
      paddingVertical: 6,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    pageFooterText: {
      fontSize: typography.caption,
      color: palette.text,
    },
  };
}
