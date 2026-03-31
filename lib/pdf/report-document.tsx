import React from 'react';
import {
  Document,
  Image,
  Page,
  Text,
  View,
} from '@react-pdf/renderer';
import {
  buildThemeAwareReportMeta,
  getInvestmentSignalBadge,
  getReportPdfStyles,
  getReportTheme,
  getStandardFooterMeta,
} from './report-theme';

type Primitive = string | number | boolean | null | undefined;

type TableRow = Record<string, Primitive>;

type MetricItem = {
  label: string;
  value: string;
};

type BulletItem = {
  title?: string;
  text: string;
};

type ScenarioItem = {
  name: string;
  value?: string;
  description?: string;
};

type SentimentItem = {
  label: string;
  score: string;
  description?: string;
};

type ReportSectionImage = {
  src?: string | null;
};

export type EquityResearchPdfData = {
  themeId?: string | null;

  companyName: string;
  ticker: string;
  exchange?: string | null;
  sector?: string | null;
  industry?: string | null;
  reportDate: string;

  analystLabel?: string | null;
  firmName?: string | null;
  contactEmail?: string | null;
  socialHandle?: string | null;
  jurisdiction?: string | null;

  reportTitle?: string | null;
  reportSubtitle?: string | null;
  rating?: string | null;
  score?: number | null;
  priceTarget?: string | null;
  currentPrice?: string | null;
  upside?: string | null;
  riskRating?: string | null;
  distributionLabel?: string | null;
  horizon?: string | null;

  heroImageUrl?: string | null;
  coverImageUrl?: string | null;
  logoImageUrl?: string | null;

  executiveSummaryText?: string | null;
  executiveSummaryBlocks?: Array<{
    heading: string;
    body: string;
  }> | null;

  overviewDescription?: string | null;
  investmentThesisText?: string | null;
  valuationSummaryText?: string | null;
  technicalSummaryText?: string | null;
  conclusionText?: string | null;

  dashboardMetrics?: MetricItem[] | null;
  companyMetrics?: MetricItem[] | null;
  valuationMetrics?: MetricItem[] | null;
  technicalMetrics?: MetricItem[] | null;
  modelMetrics?: MetricItem[] | null;

  thesisBullets?: BulletItem[] | null;
  growthCatalysts?: BulletItem[] | null;
  riskFactors?: BulletItem[] | null;
  tamBullets?: BulletItem[] | null;

  financialModelNarrative?: string | null;
  valuationNarrative?: string | null;
  technicalNarrative?: string | null;
  disclaimerText?: string | null;
  disclosureText?: string | null;
  analystCertificationText?: string | null;

  dashboardTable?: TableRow[] | null;
  businessSegmentsTable?: TableRow[] | null;
  forecastTable?: TableRow[] | null;
  peerTable?: TableRow[] | null;
  modelTable?: TableRow[] | null;
  valuationTable?: TableRow[] | null;
  disclosuresTable?: TableRow[] | null;

  valuationScenarios?: ScenarioItem[] | null;
  sentimentItems?: SentimentItem[] | null;

  dashboardImage?: ReportSectionImage | null;
  thesisImage?: ReportSectionImage | null;
  technicalImage?: ReportSectionImage | null;
  tamImage?: ReportSectionImage | null;
  valuationImage?: ReportSectionImage | null;
  conclusionImage?: ReportSectionImage | null;

  appendixImages?: Array<{
    title?: string;
    subtitle?: string;
    src?: string | null;
  }> | null;
};

type Props = {
  data: EquityResearchPdfData;
};

const PAGE_SIZE: 'A4' = 'A4';

function safeArray<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : [];
}

function safeText(value?: Primitive, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : fallback;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function inferColumns(rows: TableRow[]): string[] {
  if (!rows.length) return [];
  const first = rows[0];
  return Object.keys(first);
}

function shouldUseAltRow(index: number): boolean {
  return index % 2 === 1;
}

function TableBlock({
  styles,
  title,
  subtitle,
  rows,
}: {
  styles: ReturnType<typeof getReportPdfStyles>;
  title?: string;
  subtitle?: string;
  rows: TableRow[];
}) {
  if (!rows.length) return null;

  const columns = inferColumns(rows);

  return (
    <View style={styles.section}>
      {title ? <Text style={styles.h3}>{title}</Text> : null}
      {subtitle ? <Text style={styles.bodyMuted}>{subtitle}</Text> : null}

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          {columns.map((column) => (
            <Text key={column} style={styles.tableHeaderCell}>
              {column.replace(/_/g, ' ')}
            </Text>
          ))}
        </View>

        {rows.map((row, rowIndex) => (
          <View
            key={`row-${rowIndex}`}
            style={shouldUseAltRow(rowIndex) ? styles.tableRowAlt : styles.tableRow}
          >
            {columns.map((column) => (
              <Text key={`${rowIndex}-${column}`} style={styles.tableCell}>
                {safeText(row[column])}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function BulletListBlock({
  styles,
  items,
}: {
  styles: ReturnType<typeof getReportPdfStyles>;
  items: BulletItem[];
}) {
  if (!items.length) return null;

  return (
    <View style={styles.bulletList}>
      {items.map((item, index) => (
        <View key={`bullet-${index}`} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>
            {item.title ? `${item.title} — ${item.text}` : item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MetricGridBlock({
  styles,
  items,
}: {
  styles: ReturnType<typeof getReportPdfStyles>;
  items: MetricItem[];
}) {
  if (!items.length) return null;

  return (
    <View style={styles.metricGrid}>
      {items.map((item, index) => (
        <View key={`metric-${index}`} style={styles.metricCard}>
          <Text style={styles.metricValue}>{safeText(item.value)}</Text>
          <Text style={styles.metricLabel}>{safeText(item.label)}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer({
  styles,
  ticker,
  reportDate,
  contactEmail,
  firmName,
}: {
  styles: ReturnType<typeof getReportPdfStyles>;
  ticker: string;
  reportDate: string;
  contactEmail?: string | null;
  firmName?: string | null;
}) {
  const meta = getStandardFooterMeta({
    companyTicker: ticker,
    asOfDate: reportDate,
    contactEmail: contactEmail || undefined,
    firmName: firmName || undefined,
  });

  return (
    <View fixed style={styles.pageFooter}>
      <Text style={styles.pageFooterText}>{meta.left}</Text>
      <Text style={styles.pageFooterText}>{meta.center}</Text>
      <Text style={styles.pageFooterText}>{meta.right}</Text>
    </View>
  );
}

function SectionHeader({
  styles,
  title,
  kicker,
}: {
  styles: ReturnType<typeof getReportPdfStyles>;
  title: string;
  kicker?: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {kicker ? <Text style={styles.sectionKicker}>{kicker}</Text> : null}
    </View>
  );
}

function SignalPill({
  styles,
  label,
  colors,
}: {
  styles: ReturnType<typeof getReportPdfStyles>;
  label: string;
  colors: { text: string; bg: string; border: string };
}) {
  return (
    <Text
      style={{
        ...styles.tonePill,
        color: colors.text,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.border,
      }}
    >
      {label}
    </Text>
  );
}

function ImagePanel({
  src,
  styles,
  minHeight = 260,
}: {
  src?: string | null;
  styles: ReturnType<typeof getReportPdfStyles>;
  minHeight?: number;
}) {
  if (!src) {
    return (
      <View
        style={{
          ...styles.mutedCard,
          minHeight,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={styles.caption}>Dynamic chart / image placeholder</Text>
      </View>
    );
  }

  return (
    <Image
      src={src}
      style={{
        width: '100%',
        minHeight,
        objectFit: 'cover',
        borderRadius: 8,
      }}
    />
  );
}

export default function EquityResearchPdfDocument({ data }: Props) {
  const theme = getReportTheme(data.themeId);
  const styles = getReportPdfStyles(data.themeId);
  const meta = buildThemeAwareReportMeta({
    companyName: data.companyName,
    ticker: data.ticker,
    exchange: data.exchange,
    asOfDate: data.reportDate,
    analystLabel: data.analystLabel,
    reportTitle: data.reportTitle,
    reportSubtitle: data.reportSubtitle,
    themeId: data.themeId,
    score: data.score,
    rating: data.rating,
    priceTarget: data.priceTarget,
    currentPrice: data.currentPrice,
    upside: data.upside,
  });

  const scoreBadge =
    typeof data.score === 'number'
      ? getInvestmentSignalBadge(data.score, data.themeId)
      : null;

  const executiveBlocks = safeArray(data.executiveSummaryBlocks);
  const dashboardMetrics = safeArray(data.dashboardMetrics);
  const companyMetrics = safeArray(data.companyMetrics);
  const valuationMetrics = safeArray(data.valuationMetrics);
  const technicalMetrics = safeArray(data.technicalMetrics);
  const modelMetrics = safeArray(data.modelMetrics);

  const thesisBullets = safeArray(data.thesisBullets);
  const growthCatalysts = safeArray(data.growthCatalysts);
  const riskFactors = safeArray(data.riskFactors);
  const tamBullets = safeArray(data.tamBullets);
  const valuationScenarios = safeArray(data.valuationScenarios);
  const sentimentItems = safeArray(data.sentimentItems);

  const dashboardTable = safeArray(data.dashboardTable);
  const businessSegmentsTable = safeArray(data.businessSegmentsTable);
  const forecastTable = safeArray(data.forecastTable);
  const peerTable = safeArray(data.peerTable);
  const modelTable = safeArray(data.modelTable);
  const valuationTable = safeArray(data.valuationTable);
  const disclosuresTable = safeArray(data.disclosuresTable);

  const appendixImages = safeArray(data.appendixImages);

  const executiveChunks = chunk(executiveBlocks, 3);
  const thesisChunks = chunk(thesisBullets, 4);
  const catalystChunks = chunk(growthCatalysts, 4);
  const riskChunks = chunk(riskFactors, 4);
  const sentimentChunks = chunk(sentimentItems, 4);

  return (
    <Document
      title={meta.title}
      author={safeText(data.firmName, 'AegisIQ Research')}
      subject={meta.subtitle}
      creator="AegisIQ-Research"
      producer="AegisIQ-Research PDF Engine"
    >
      <Page size={PAGE_SIZE} style={styles.coverPage}>
        <View style={styles.coverSplitRow}>
          <View style={styles.coverImagePane}>
            {data.coverImageUrl || data.heroImageUrl || data.logoImageUrl ? (
              <Image
                src={data.coverImageUrl || data.heroImageUrl || data.logoImageUrl || ''}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderTopLeftRadius: theme.spacing.radiusLg,
                  borderBottomLeftRadius: theme.spacing.radiusLg,
                }}
              />
            ) : null}
          </View>

          <View style={styles.coverContentPane}>
            <Text style={styles.coverEyebrow}>Institutional Research Report</Text>
            <Text style={styles.coverTitle}>{meta.title}</Text>
            <Text style={styles.coverSubtitle}>{meta.subtitle}</Text>

            <View style={styles.tagRow}>
              {meta.coverTags.map((tag) => (
                <Text key={tag} style={styles.tag}>
                  {tag}
                </Text>
              ))}
            </View>

            <View style={styles.heroCard}>
              <Text style={styles.heroCardTitle}>{safeText(data.companyName)}</Text>
              <Text style={styles.heroCardText}>{safeText(meta.tickerLabel)}</Text>
              <Text style={styles.heroCardText}>
                {[
                  safeText(data.sector, ''),
                  safeText(data.industry, ''),
                ]
                  .filter(Boolean)
                  .join(' | ') || 'Equity Analysis | Institutional Research'}
              </Text>

              <View style={{ height: 16 }} />

              <Text style={styles.heroCardText}>
                Rating: {safeText(meta.rating.label)}
              </Text>
              <Text style={styles.heroCardText}>
                Price Target: {safeText(data.priceTarget)}
              </Text>
              <Text style={styles.heroCardText}>
                Current Price: {safeText(data.currentPrice)}
              </Text>
              <Text style={styles.heroCardText}>
                Upside Potential: {safeText(data.upside)}
              </Text>
              <Text style={styles.heroCardText}>
                Report Date: {safeText(data.reportDate)}
              </Text>
            </View>

            <Text style={styles.sidebarTitle}>{safeText(data.firmName, 'AegisIQ Limited')}</Text>
            <Text style={styles.sidebarText}>Equity Analysis & Institutional Research</Text>
            {data.jurisdiction ? (
              <Text style={styles.sidebarText}>({data.jurisdiction})</Text>
            ) : null}
            <Text style={styles.sidebarText}>{safeText(data.contactEmail)}</Text>
            {data.socialHandle ? <Text style={styles.sidebarText}>X: {data.socialHandle}</Text> : null}

            <View style={styles.disclosureBox}>
              <Text style={styles.disclosureText}>
                {safeText(
                  data.distributionLabel,
                  'This report is prepared for institutional distribution only. Not for retail redistribution. Please refer to important disclosures on the final page.',
                )}
              </Text>
            </View>

            <View style={styles.footerBand}>
              <Text style={styles.footerBandText}>
                © 2026 {safeText(data.firmName, 'AegisIQ Limited')} | {safeText(meta.tickerLabel)} | {safeText(data.reportDate)} | {safeText(data.contactEmail)}
              </Text>
            </View>
          </View>
        </View>
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <SectionHeader styles={styles} title="Executive Summary" kicker={meta.tickerLabel} />
        <Text style={styles.bodyMuted}>
          {safeText(
            data.executiveSummaryText,
            `${safeText(data.companyName)} is evaluated through an institutional lens using a combined fundamental, valuation, and technical framework.`,
          )}
        </Text>

        <View style={{ height: 12 }} />

        {executiveChunks.length ? (
          executiveChunks.map((row, rowIndex) => (
            <View key={`exec-row-${rowIndex}`} style={styles.splitRow}>
              {row.map((block, blockIndex) => (
                <View key={`exec-block-${blockIndex}`} style={styles.card}>
                  <Text style={styles.h3}>{safeText(block.heading)}</Text>
                  <Text style={styles.body}>{safeText(block.body)}</Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.splitRow}>
            <View style={styles.card}>
              <Text style={styles.h3}>Financial Performance</Text>
              <Text style={styles.body}>
                Recent operating trends, funding activity, and margin progression support the current research setup.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.h3}>Growth Drivers</Text>
              <Text style={styles.body}>
                The thesis centers on backlog conversion, margin improvement, and monetization of strategic assets.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.h3}>Catalysts</Text>
              <Text style={styles.body}>
                Near- and medium-term catalysts include execution, re-rating potential, and expanded institutional visibility.
              </Text>
            </View>
          </View>
        )}

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <SectionHeader styles={styles} title="AegisIQ Equity Analysis & Research" kicker="Institutional Research Report" />

        <View style={styles.splitRow}>
          <View style={{ ...styles.splitCol, flexBasis: '38%' }}>
            <ImagePanel
              src={data.logoImageUrl || data.heroImageUrl || data.coverImageUrl}
              styles={styles}
              minHeight={560}
            />
          </View>

          <View style={{ ...styles.splitCol, flexBasis: '62%' }}>
            <View style={styles.heroCard}>
              <Text style={styles.heroCardTitle}>{safeText(data.companyName)}</Text>
              <Text style={styles.heroCardText}>{safeText(meta.tickerLabel)}</Text>
              <Text style={styles.heroCardText}>
                {[
                  safeText(data.sector, ''),
                  safeText(data.industry, ''),
                ]
                  .filter(Boolean)
                  .join(' | ') || 'Equity Analysis | Institutional Research'}
              </Text>

              <View style={{ height: 16 }} />

              <Text style={styles.heroCardText}>Rating: {safeText(meta.rating.label)}</Text>
              <Text style={styles.heroCardText}>Price Target: {safeText(data.priceTarget)}</Text>
              <Text style={styles.heroCardText}>Current Price: {safeText(data.currentPrice)}</Text>
              <Text style={styles.heroCardText}>Upside Potential: {safeText(data.upside)}</Text>
              <Text style={styles.heroCardText}>Report Date: {safeText(data.reportDate)}</Text>
            </View>

            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <Text style={styles.sidebarTitle}>{safeText(data.firmName, 'AegisIQ Limited')}</Text>
                <Text style={styles.sidebarText}>Equity Analysis & Institutional Research</Text>
                {data.jurisdiction ? (
                  <Text style={styles.sidebarText}>({data.jurisdiction})</Text>
                ) : null}
                <Text style={styles.sidebarText}>{safeText(data.contactEmail)}</Text>
                {data.socialHandle ? (
                  <Text style={styles.sidebarText}>X: {data.socialHandle}</Text>
                ) : null}
              </View>

              <View style={styles.splitCol}>
                <View style={styles.softPanel}>
                  <Text style={styles.body}>
                    {safeText(
                      data.distributionLabel,
                      'This report is prepared for institutional distribution only. Not for retail redistribution. Please refer to important disclosures on the final page.',
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.footerBand}>
              <Text style={styles.footerBandText}>
                © 2026 {safeText(data.firmName, 'AegisIQ Limited')} | {safeText(meta.tickerLabel)} | {safeText(data.reportDate)} | {safeText(data.contactEmail)}
              </Text>
            </View>
          </View>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <SectionHeader styles={styles} title="Investor Dashboard" kicker={`${meta.tickerLabel} — Key Metrics`} />

        {dashboardMetrics.length ? <MetricGridBlock styles={styles} items={dashboardMetrics} /> : null}

        <View style={{ height: 12 }} />

        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <TableBlock
              styles={styles}
              title="Stock Metrics Table"
              rows={
                dashboardTable.length
                  ? dashboardTable
                  : dashboardMetrics.map((item) => ({
                      Metric: item.label,
                      Value: item.value,
                    }))
              }
            />
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.h3}>Dashboard Charts</Text>
            <ImagePanel src={data.dashboardImage?.src} styles={styles} minHeight={260} />
          </View>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <SectionHeader styles={styles} title="Investment Thesis" kicker={`${safeText(meta.rating.label)} | PT: ${safeText(data.priceTarget)}`} />

        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <Text style={styles.subheading}>Why We're Bullish on {safeText(data.ticker)}</Text>
            <Text style={styles.bodyMuted}>
              {safeText(
                data.investmentThesisText,
                'The investment thesis section presents the core qualitative rationale for the position.',
              )}
            </Text>

            <View style={{ height: 12 }} />
            <BulletListBlock
              styles={styles}
              items={
                thesisBullets.length
                  ? thesisBullets
                  : [
                      { text: 'Production services growth and backlog conversion.' },
                      { text: 'Monetization of strategic intellectual property.' },
                      { text: 'AI-driven cost reduction and production velocity improvements.' },
                      { text: 'Expanded distribution and platform partnerships.' },
                    ]
              }
            />
          </View>

          <View style={styles.splitCol}>
            <Text style={styles.subheading}>Revenue Impact by Growth Driver</Text>
            <ImagePanel src={data.thesisImage?.src} styles={styles} minHeight={300} />
          </View>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Company Overview" kicker="Business Segments" />

        <Text style={styles.bodyMuted}>
          {safeText(
            data.overviewDescription,
            'Business description, segment structure, and strategic positioning.',
          )}
        </Text>

        <View style={{ height: 12 }} />
        {companyMetrics.length ? <MetricGridBlock styles={styles} items={companyMetrics} /> : null}
        <View style={{ height: 10 }} />
        <TableBlock
          styles={styles}
          rows={businessSegmentsTable}
          title="Business Description"
        />

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Revenue Forecast" kicker="2025E–2027E Projections" />

        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <ImagePanel src={data.dashboardImage?.src} styles={styles} minHeight={240} />
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.h3}>Forecast Assumptions</Text>
            <Text style={styles.body}>
              {safeText(
                data.financialModelNarrative,
                'The forecast assumes backlog conversion, margin improvement, and incremental monetization from strategic catalysts.',
              )}
            </Text>
          </View>
        </View>

        <View style={{ height: 10 }} />
        <TableBlock styles={styles} rows={forecastTable} />

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Peer Comparison" kicker="Relative Valuation" />

        <TableBlock styles={styles} rows={peerTable} title="EV / Revenue Multiples" />

        <Text style={styles.bodyMuted}>
          {safeText(
            data.valuationSummaryText,
            'Relative valuation frames current trading levels against comparable companies and sector medians.',
          )}
        </Text>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Valuation Scenarios" kicker="Bear / Base / Bull" />

        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <ImagePanel src={data.valuationImage?.src} styles={styles} minHeight={250} />
          </View>
          <View style={styles.splitCol}>
            {valuationScenarios.length ? (
              valuationScenarios.map((scenario, index) => (
                <View key={`scenario-${index}`} style={styles.card}>
                  <Text style={styles.h3}>
                    {safeText(scenario.name)}
                    {scenario.value ? ` — ${scenario.value}` : ''}
                  </Text>
                  {scenario.description ? (
                    <Text style={styles.body}>{safeText(scenario.description)}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <View>
                <View style={styles.card}>
                  <Text style={styles.h3}>Bear Case</Text>
                  <Text style={styles.body}>Execution delays and muted monetization outcomes.</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.h3}>Base Case</Text>
                  <Text style={styles.body}>Steady operational execution and moderate re-rating.</Text>
                </View>
                <View style={styles.card}>
                  <Text style={styles.h3}>Bull Case</Text>
                  <Text style={styles.body}>Full catalyst realization and stronger multiple expansion.</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <SectionHeader styles={styles} title="Technical Indicators" kicker="RSI | MACD | Moving Averages" />

        <Text style={styles.bodyMuted}>
          {safeText(
            data.technicalSummaryText,
            'The technical overlay highlights trend, momentum, support, and reversal signals.',
          )}
        </Text>

        <View style={{ height: 10 }} />

        <View style={styles.splitRow}>
          <View style={{ ...styles.splitCol, flexBasis: '42%' }}>
            <TableBlock
              styles={styles}
              title="Key Technical Levels"
              rows={
                technicalMetrics.length
                  ? technicalMetrics.map((item) => ({
                      Metric: item.label,
                      Value: item.value,
                    }))
                  : technicalMetrics
              }
            />
          </View>

          <View style={{ ...styles.splitCol, flexBasis: '58%' }}>
            <Text style={styles.h3}>RSI Trend (6-Month)</Text>
            <ImagePanel src={data.technicalImage?.src} styles={styles} minHeight={300} />
          </View>
        </View>

        <View style={{ height: 10 }} />

        <View style={styles.card}>
          <Text style={styles.h3}>RSI Signal</Text>
          <Text style={styles.body}>
            {safeText(data.technicalNarrative, 'Momentum is approaching a potentially more constructive setup, subject to confirmation.')}
          </Text>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Price Trend & Levels" kicker="Support & Resistance" />

        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <ImagePanel src={data.technicalImage?.src} styles={styles} minHeight={220} />
          </View>
          <View style={styles.splitCol}>
            <View style={styles.card}>
              <Text style={styles.h3}>Key Price Levels</Text>
              <Text style={styles.body}>
                Primary support, secondary support, and resistance zones should be rendered from live ticker data.
              </Text>
            </View>
          </View>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="TAM Analysis" kicker="Total Addressable Market" />

        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <ImagePanel src={data.tamImage?.src} styles={styles} minHeight={250} />
          </View>
          <View style={styles.splitCol}>
            <Text style={styles.h3}>Market Opportunity</Text>
            <BulletListBlock styles={styles} items={tamBullets} />
          </View>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Growth Catalysts" kicker="Key Value Drivers" />

        {catalystChunks.length ? (
          catalystChunks.map((group, groupIndex) => (
            <View key={`catalyst-${groupIndex}`} style={styles.splitRow}>
              {group.map((item, itemIndex) => (
                <View key={`catalyst-item-${itemIndex}`} style={styles.card}>
                  <Text style={styles.h3}>{safeText(item.title, `Catalyst ${itemIndex + 1}`)}</Text>
                  <Text style={styles.body}>{safeText(item.text)}</Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <BulletListBlock styles={styles} items={growthCatalysts} />
        )}

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Risk Factors" kicker="Material Risks" />

        {riskChunks.length ? (
          riskChunks.map((group, groupIndex) => (
            <View key={`risk-${groupIndex}`} style={styles.splitRow}>
              {group.map((item, itemIndex) => (
                <View key={`risk-item-${itemIndex}`} style={styles.card}>
                  <Text style={styles.h3}>{safeText(item.title, `Risk ${itemIndex + 1}`)}</Text>
                  <Text style={styles.body}>{safeText(item.text)}</Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <BulletListBlock styles={styles} items={riskFactors} />
        )}

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="AI Sentiment Dashboard" kicker="Composite Sentiment Score" />

        <Text style={styles.bodyMuted}>
          Quantitative overlay built from market, momentum, volume, and news signals.
        </Text>

        <View style={{ height: 12 }} />

        {sentimentChunks.length ? (
          sentimentChunks.map((group, groupIndex) => (
            <View key={`sentiment-group-${groupIndex}`} style={styles.splitRow}>
              {group.map((item, itemIndex) => (
                <View key={`sentiment-item-${itemIndex}`} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{safeText(item.score)}</Text>
                  <Text style={styles.h4}>{safeText(item.label)}</Text>
                  {item.description ? (
                    <Text style={styles.small}>{safeText(item.description)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ))
        ) : null}

        {scoreBadge ? (
          <View style={styles.softPanel}>
            <Text style={styles.h3}>Aggregate AI Sentiment Score</Text>
            <SignalPill
              styles={styles}
              label={`${safeText(data.score)}/100 — ${scoreBadge.label}`}
              colors={scoreBadge.colors}
            />
          </View>
        ) : null}

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Financial Model Summary" kicker="2024A – 2027E" />

        <Text style={styles.bodyMuted}>
          {safeText(
            data.financialModelNarrative,
            'The financial model projects operating improvement, better cash efficiency, and progressive narrowing of losses.',
          )}
        </Text>

        <View style={{ height: 12 }} />
        {modelMetrics.length ? <MetricGridBlock styles={styles} items={modelMetrics} /> : null}
        <View style={{ height: 10 }} />
        <TableBlock styles={styles} rows={modelTable} />

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="AegisIQ Valuation Model" kicker={`Price Target: ${safeText(data.priceTarget)}`} />

        {valuationMetrics.length ? <MetricGridBlock styles={styles} items={valuationMetrics} /> : null}
        <View style={{ height: 10 }} />
        <TableBlock styles={styles} rows={valuationTable} title="Valuation Summary Table" />
        <View style={{ height: 8 }} />
        <Text style={styles.bodyMuted}>
          {safeText(
            data.valuationNarrative,
            'The valuation framework applies a conservative multiple relative to peers to derive the base case price target.',
          )}
        </Text>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Analyst Certification" kicker="Regulatory Disclosure" />

        <View style={styles.card}>
          <Text style={styles.h3}>Analyst Certification Statement</Text>
          <Text style={styles.body}>
            {safeText(
              data.analystCertificationText,
              'The analyst(s) responsible for the preparation of this report certify that the views expressed accurately reflect their personal views about the subject company and its securities.',
            )}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Conflicts of Interest</Text>
          <Text style={styles.body}>
            {safeText(
              data.disclosureText,
              'The publisher may seek to provide research, advisory, or consulting services to companies referenced in this report. This report is intended for informational purposes only.',
            )}
          </Text>
        </View>

        {disclosuresTable.length ? (
          <TableBlock styles={styles} rows={disclosuresTable} title="Report Details" />
        ) : null}

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.pageWhite}>
        <SectionHeader styles={styles} title="Important Disclosures" kicker="Institutional Disclaimer" />

        <View style={styles.card}>
          <Text style={styles.h3}>General Disclaimer</Text>
          <Text style={styles.body}>
            {safeText(
              data.disclaimerText,
              'This report is prepared for informational purposes only. It does not constitute investment advice, a solicitation, or an offer to buy or sell any security.',
            )}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Data & Sources</Text>
          <Text style={styles.body}>
            Data may include company filings, market data providers, press releases, consensus materials, and proprietary AegisIQ models.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Distribution</Text>
          <Text style={styles.body}>
            {safeText(
              data.distributionLabel,
              'This report is intended for institutional investors and qualified professional clients only. Redistribution without prior written consent is prohibited.',
            )}
          </Text>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        <SectionHeader styles={styles} title="Analyst Conclusion" kicker={`${safeText(meta.rating.label)} Price Target: ${safeText(data.priceTarget)}`} />

        <View style={styles.splitRow}>
          <View style={{ ...styles.splitCol, flexBasis: '58%' }}>
            <View style={styles.softPanel}>
              <View style={styles.splitRow}>
                <View style={styles.splitCol}>
                  <Text style={styles.h3}>Rating</Text>
                  <Text style={styles.body}>
                    {safeText(data.rating, meta.rating.label)}
                  </Text>
                  <Text style={styles.bodyMuted}>
                    {safeText(
                      data.horizon,
                      'Appropriate for risk-tolerant investors with a 12–18 month investment horizon.',
                    )}
                  </Text>
                </View>
                <View style={styles.splitCol}>
                  <Text style={styles.h3}>Price Target</Text>
                  <Text style={styles.body}>{safeText(data.priceTarget)}</Text>
                  <Text style={styles.bodyMuted}>
                    Based on the valuation framework used in this report.
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.h3}>Upside Potential</Text>
              <Text style={styles.body}>
                {safeText(data.upside)} upside from current price of {safeText(data.currentPrice)}.
              </Text>
            </View>

            <Text style={styles.body}>
              {safeText(
                data.conclusionText,
                `${safeText(data.companyName)} represents an asymmetric risk/reward setup supported by operating leverage, strategic catalysts, and valuation re-rating potential.`,
              )}
            </Text>

            <View style={styles.footerBand}>
              <Text style={styles.footerBandText}>
                © 2026 {safeText(data.firmName, 'AegisIQ Limited')} | {safeText(meta.tickerLabel)} | {safeText(data.reportDate)} | {safeText(data.contactEmail)}
              </Text>
            </View>
          </View>

          <View style={{ ...styles.splitCol, flexBasis: '42%' }}>
            <ImagePanel src={data.conclusionImage?.src} styles={styles} minHeight={520} />
          </View>
        </View>

        <Footer
          styles={styles}
          ticker={data.ticker}
          reportDate={data.reportDate}
          contactEmail={data.contactEmail}
          firmName={data.firmName}
        />
      </Page>

      {appendixImages.map((item, index) => (
        <Page key={`appendix-${index}`} size={PAGE_SIZE} style={styles.pageWhite}>
          <SectionHeader
            styles={styles}
            title={safeText(item.title, `Appendix ${index + 1}`)}
            kicker={safeText(item.subtitle, 'Supporting Exhibit')}
          />
          <ImagePanel src={item.src} styles={styles} minHeight={680} />
          <Footer
            styles={styles}
            ticker={data.ticker}
            reportDate={data.reportDate}
            contactEmail={data.contactEmail}
            firmName={data.firmName}
          />
        </Page>
      ))}
    </Document>
  );
}
