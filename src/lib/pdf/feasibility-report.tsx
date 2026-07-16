import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const NAVY   = '#1e3a8a';
const GREEN  = '#15803d';
const AMBER  = '#b45309';
const RED    = '#dc2626';
const SLATE_50  = '#f8fafc';
const SLATE_100 = '#f1f5f9';
const SLATE_200 = '#e2e8f0';
const SLATE_500 = '#64748b';
const SLATE_800 = '#1e293b';

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: SLATE_800 },
  pageHeader: { marginBottom: 12 },
  companyName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 1 },
  reportTitle: { fontSize: 9, color: SLATE_500 },
  divider: { borderBottomWidth: 1, borderBottomColor: SLATE_200, marginVertical: 10 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: SLATE_800, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: SLATE_200, paddingBottom: 3, marginTop: 10 },
  metaBar: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: SLATE_50, padding: 8, marginBottom: 10 },
  metaItem: { marginRight: 20, marginBottom: 2 },
  metaLabel: { fontSize: 7, color: SLATE_500, textTransform: 'uppercase' },
  metaValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: SLATE_800 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: NAVY },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tableRowAlt: { flexDirection: 'row', backgroundColor: SLATE_50, borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tableSummaryRow: { flexDirection: 'row', backgroundColor: SLATE_100, borderTopWidth: 1, borderTopColor: '#94a3b8' },
  cellHeader: { paddingTop: 4, paddingBottom: 4, paddingLeft: 5, paddingRight: 5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' },
  cell: { paddingTop: 3, paddingBottom: 3, paddingLeft: 5, paddingRight: 5, fontSize: 8 },
  cellBold: { paddingTop: 3, paddingBottom: 3, paddingLeft: 5, paddingRight: 5, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94a3b8' },
  // Executive summary
  verdictBox: { padding: 12, marginBottom: 10, borderLeftWidth: 4 },
  verdictTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  verdictSub: { fontSize: 9, lineHeight: 1.5 },
  // Factor rows
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  factorDot: { width: 12, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  factorLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  factorDetail: { fontSize: 8, color: SLATE_500, lineHeight: 1.4 },
  // Narrative box
  narrativeBox: { padding: 10, backgroundColor: '#eff6ff', borderLeftWidth: 3, borderLeftColor: NAVY, marginTop: 10 },
  narrativeText: { fontSize: 9, lineHeight: 1.6, color: SLATE_800 },
  // KPI cards
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpiCard: { flex: 1, backgroundColor: SLATE_50, padding: 8 },
  kpiLabel: { fontSize: 7, color: SLATE_500, textTransform: 'uppercase', marginBottom: 2 },
  kpiValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: SLATE_800 },
  kpiSub: { fontSize: 7, color: SLATE_500, marginTop: 1 },
});

const $f = (n: number) => {
  const abs = Math.abs(Math.round(n));
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-$' : '$') + s;
};
const pct = (n: number) => (n * 100).toFixed(1) + '%';

export interface FeasibilityFactor {
  label: string;
  detail: string;
  favorable: boolean | null; // null = neutral
}

export interface FeasibilityReportData {
  client_name: string;
  generated_at: string;
  premium_trend: number;
  loss_trend: number;
  structure: {
    captive_retention: number;
    excess_layer: number;
    carrier: string;
    captive_premium_pct: number;
    new_annual_premium: number;
    annual_expenses: number;
  };
  history: {
    year: number;
    premium: number;
    losses: number;
    captive_premium: number;
    captive_losses: number;
    excess_losses: number;
    loss_ratio: number;
    client_pl: number;
  }[];
  individual_claims: {
    year: number;
    description: string;
    loss_amount: number;
    captive_portion: number;
    excess_portion: number;
    line_of_coverage: string | null;
  }[];
  projection: {
    year: number;
    captive_premium: number;
    projected_total_losses: number;
    projected_captive_losses: number;
    expenses: number;
    net_profit: number;
    cumulative_profit: number;
  }[];
  summary: {
    avg_loss_rate: number;
    avg_annual_premium: number;
    avg_annual_losses: number;
    years_of_history: number;
    total_claims: number;
    claims_above_retention: number;
    largest_claim: number;
    total_5yr_projected_profit: number;
    avg_annual_projected_profit: number;
  };
  feasibility: {
    score: 'favorable' | 'cautious' | 'unfavorable';
    factors: FeasibilityFactor[];
    recommendation: string;
  };
}

export default function FeasibilityReportPDF({ data }: { data: FeasibilityReportData }) {
  const { client_name, generated_at, structure, history, individual_claims, projection, summary, feasibility, premium_trend, loss_trend } = data;
  const genDate = new Date(generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const hasTrend = premium_trend !== 0 || loss_trend !== 0;

  const scoreColor = feasibility.score === 'favorable' ? GREEN : feasibility.score === 'cautious' ? AMBER : RED;
  const scoreLabel = feasibility.score === 'favorable' ? 'Favorable — Recommended' : feasibility.score === 'cautious' ? 'Cautious — Conditional' : 'Unfavorable — Not Recommended';

  const histCols  = [0.5, 1.1, 1.1, 1.1, 1.1, 1.0, 0.7, 1.1];
  const claimCols = [0.5, 2.5, 0.8, 1.1, 1.1, 1.1];
  const projCols  = [0.6, 1.25, 1.25, 1.25, 1.0, 1.15, 1.25];

  return (
    <Document>

      {/* ── PAGE 1: Executive Summary ── */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.companyName}>{client_name}</Text>
          <Text style={styles.reportTitle}>Captive Insurance Feasibility Report · {genDate}</Text>
        </View>

        {/* Verdict */}
        <View style={[styles.verdictBox, { backgroundColor: feasibility.score === 'favorable' ? '#f0fdf4' : feasibility.score === 'cautious' ? '#fffbeb' : '#fef2f2', borderLeftColor: scoreColor }]}>
          <Text style={[styles.verdictTitle, { color: scoreColor }]}>{scoreLabel}</Text>
          <Text style={styles.verdictSub}>{feasibility.recommendation}</Text>
        </View>

        {/* KPI cards */}
        <View style={styles.kpiRow}>
          {[
            { label: 'Avg Historical Loss Rate', value: pct(summary.avg_loss_rate), sub: `${summary.years_of_history} year${summary.years_of_history !== 1 ? 's' : ''} of history` },
            { label: 'Avg Annual Premium', value: $f(summary.avg_annual_premium), sub: `Captive portion: ${$f(summary.avg_annual_premium * structure.captive_premium_pct)}` },
            { label: '5-Year Projected Profit', value: $f(summary.total_5yr_projected_profit), sub: `Avg ${$f(summary.avg_annual_projected_profit)}/yr` },
            { label: 'Individual Claims', value: String(summary.total_claims), sub: summary.total_claims > 0 ? `${summary.claims_above_retention} above ${$f(structure.captive_retention)} retention` : 'No claim detail on file' },
          ].map(k => (
            <View key={k.label} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={[styles.kpiValue, { color: k.label === '5-Year Projected Profit' ? (summary.total_5yr_projected_profit >= 0 ? GREEN : RED) : SLATE_800 }]}>{k.value}</Text>
              <Text style={styles.kpiSub}>{k.sub}</Text>
            </View>
          ))}
        </View>

        {/* Program Structure summary */}
        <View style={styles.metaBar}>
          {[
            ['Carrier', structure.carrier.charAt(0).toUpperCase() + structure.carrier.slice(1)],
            ['Captive Retention', $f(structure.captive_retention)],
            ['Excess Layer', $f(structure.excess_layer)],
            ['Captive Premium Split', pct(structure.captive_premium_pct)],
            ['New Annual Premium', $f(structure.new_annual_premium)],
            ['Annual Expenses', $f(structure.annual_expenses)],
          ].map(([label, value]) => (
            <View key={label} style={styles.metaItem}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Feasibility Factors */}
        <Text style={styles.sectionTitle}>Feasibility Assessment</Text>
        {feasibility.factors.map((f, i) => (
          <View key={i} style={styles.factorRow}>
            <Text style={[styles.factorDot, { color: f.favorable === true ? GREEN : f.favorable === false ? RED : AMBER }]}>
              {f.favorable === true ? '✓' : f.favorable === false ? '✗' : '~'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.factorLabel, { color: f.favorable === true ? GREEN : f.favorable === false ? RED : AMBER }]}>{f.label}</Text>
              <Text style={styles.factorDetail}>{f.detail}</Text>
            </View>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Elite Risk — Confidential · Prepared for {client_name}</Text>
          <Text style={styles.footerText}>{genDate} · Page 1 of {individual_claims.length > 0 ? '4' : '3'}</Text>
        </View>
      </Page>

      {/* ── PAGE 2: Historical Analysis ── */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.companyName}>{client_name}</Text>
          <Text style={styles.reportTitle}>Captive Insurance Feasibility Report · Historical Premium & Loss Analysis</Text>
        </View>

        <Text style={styles.sectionTitle}>Year-by-Year Performance</Text>
        <View>
          <View style={styles.tableHeaderRow}>
            {['Year', 'Total Premium', 'Total Losses', 'Captive Premium', 'Captive Losses', 'Excess Losses', 'Loss Ratio', 'Client P&L'].map((h, i) => (
              <Text key={h} style={[styles.cellHeader, { flex: histCols[i] }]}>{h}</Text>
            ))}
          </View>
          {history.map((row, idx) => (
            <View key={row.year} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellBold, { flex: histCols[0] }]}>{row.year}</Text>
              <Text style={[styles.cell, { flex: histCols[1] }]}>{$f(row.premium)}</Text>
              <Text style={[styles.cell, { flex: histCols[2] }]}>{$f(row.losses)}</Text>
              <Text style={[styles.cell, { flex: histCols[3] }]}>{$f(row.captive_premium)}</Text>
              <Text style={[styles.cell, { flex: histCols[4] }]}>{$f(row.captive_losses)}</Text>
              <Text style={[styles.cell, { flex: histCols[5] }]}>{$f(row.excess_losses)}</Text>
              <Text style={[styles.cell, { flex: histCols[6] }]}>{pct(row.loss_ratio)}</Text>
              <Text style={[styles.cellBold, { color: row.client_pl >= 0 ? GREEN : RED, flex: histCols[7] }]}>{$f(row.client_pl)}</Text>
            </View>
          ))}
          {/* Summary row */}
          <View style={styles.tableSummaryRow}>
            <Text style={[styles.cellBold, { flex: histCols[0] }]}>Avg</Text>
            <Text style={[styles.cellBold, { flex: histCols[1] }]}>{$f(summary.avg_annual_premium)}</Text>
            <Text style={[styles.cellBold, { flex: histCols[2] }]}>{$f(summary.avg_annual_losses)}</Text>
            <Text style={[styles.cellBold, { flex: histCols[3] }]}>{$f(summary.avg_annual_premium * structure.captive_premium_pct)}</Text>
            <Text style={[styles.cellBold, { flex: histCols[4] }]}>{$f(history.reduce((s, r) => s + r.captive_losses, 0) / history.length)}</Text>
            <Text style={[styles.cellBold, { flex: histCols[5] }]}>{$f(history.reduce((s, r) => s + r.excess_losses, 0) / history.length)}</Text>
            <Text style={[styles.cellBold, { flex: histCols[6] }]}>{pct(summary.avg_loss_rate)}</Text>
            <Text style={[styles.cellBold, { color: (history.reduce((s, r) => s + r.client_pl, 0) / history.length) >= 0 ? GREEN : RED, flex: histCols[7] }]}>
              {$f(history.reduce((s, r) => s + r.client_pl, 0) / history.length)}
            </Text>
          </View>
        </View>

        {/* Loss analysis narrative */}
        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Loss Analysis Commentary</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: SLATE_50, padding: 8 }}>
            <Text style={{ fontSize: 7, color: SLATE_500, textTransform: 'uppercase', marginBottom: 3 }}>Best Year</Text>
            {(() => {
              const best = history.reduce((a, b) => a.loss_ratio < b.loss_ratio ? a : b);
              return (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{best.year} — {pct(best.loss_ratio)}</Text>
                  <Text style={{ fontSize: 8, color: SLATE_500, marginTop: 2 }}>Losses: {$f(best.losses)} · P&L: {$f(best.client_pl)}</Text>
                </>
              );
            })()}
          </View>
          <View style={{ flex: 1, backgroundColor: SLATE_50, padding: 8 }}>
            <Text style={{ fontSize: 7, color: SLATE_500, textTransform: 'uppercase', marginBottom: 3 }}>Worst Year</Text>
            {(() => {
              const worst = history.reduce((a, b) => a.loss_ratio > b.loss_ratio ? a : b);
              return (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{worst.year} — {pct(worst.loss_ratio)}</Text>
                  <Text style={{ fontSize: 8, color: SLATE_500, marginTop: 2 }}>Losses: {$f(worst.losses)} · P&L: {$f(worst.client_pl)}</Text>
                </>
              );
            })()}
          </View>
          <View style={{ flex: 1, backgroundColor: SLATE_50, padding: 8 }}>
            <Text style={{ fontSize: 7, color: SLATE_500, textTransform: 'uppercase', marginBottom: 3 }}>Loss Spread</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{$f(Math.max(...history.map(r => r.losses)) - Math.min(...history.map(r => r.losses)))}</Text>
            <Text style={{ fontSize: 8, color: SLATE_500, marginTop: 2 }}>High: {$f(Math.max(...history.map(r => r.losses)))} · Low: {$f(Math.min(...history.map(r => r.losses)))}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: SLATE_50, padding: 8 }}>
            <Text style={{ fontSize: 7, color: SLATE_500, textTransform: 'uppercase', marginBottom: 3 }}>Captive Efficiency</Text>
            {(() => {
              const captiveTotal = history.reduce((s, r) => s + r.captive_losses, 0);
              const totalLoss    = history.reduce((s, r) => s + r.losses, 0);
              const capturePct   = totalLoss > 0 ? captiveTotal / totalLoss : 0;
              return (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{pct(capturePct)} in captive</Text>
                  <Text style={{ fontSize: 8, color: SLATE_500, marginTop: 2 }}>{pct(1 - capturePct)} transferred to excess carrier</Text>
                </>
              );
            })()}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Elite Risk — Confidential · Prepared for {client_name}</Text>
          <Text style={styles.footerText}>{genDate} · Page 2 of {individual_claims.length > 0 ? '4' : '3'}</Text>
        </View>
      </Page>

      {/* ── PAGE 3 (conditional): Individual Claims ── */}
      {individual_claims.length > 0 && (
        <Page size="LETTER" orientation="landscape" style={styles.page}>
          <View style={styles.pageHeader}>
            <Text style={styles.companyName}>{client_name}</Text>
            <Text style={styles.reportTitle}>Captive Insurance Feasibility Report · Individual Loss Detail</Text>
          </View>

          <View style={styles.metaBar}>
            {[
              ['Total Claims', String(summary.total_claims)],
              ['Largest Claim', $f(summary.largest_claim)],
              ['Claims ≤ Retention', `${summary.total_claims - summary.claims_above_retention} (${pct((summary.total_claims - summary.claims_above_retention) / summary.total_claims)})`],
              ['Claims > Retention', `${summary.claims_above_retention} (${pct(summary.claims_above_retention / summary.total_claims)})`],
              ['Total Captive Exposure', $f(individual_claims.reduce((s, c) => s + c.captive_portion, 0))],
              ['Total Excess Transfer', $f(individual_claims.reduce((s, c) => s + c.excess_portion, 0))],
            ].map(([label, value]) => (
              <View key={label} style={styles.metaItem}>
                <Text style={styles.metaLabel}>{label}</Text>
                <Text style={styles.metaValue}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Claims by Size (Largest First)</Text>
          <View>
            <View style={styles.tableHeaderRow}>
              {['Year', 'Description', 'Line', 'Total Loss', 'Captive Portion', 'Excess Portion'].map((h, i) => (
                <Text key={h} style={[styles.cellHeader, { flex: claimCols[i] }]}>{h}</Text>
              ))}
            </View>
            {[...individual_claims].sort((a, b) => b.loss_amount - a.loss_amount).slice(0, 30).map((c, idx) => (
              <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.cellBold, { flex: claimCols[0] }]}>{c.year}</Text>
                <Text style={[styles.cell, { flex: claimCols[1] }]}>{c.description}</Text>
                <Text style={[styles.cell, { flex: claimCols[2] }]}>{c.line_of_coverage ?? '—'}</Text>
                <Text style={[styles.cellBold, { flex: claimCols[3] }]}>{$f(c.loss_amount)}</Text>
                <Text style={[styles.cell, { color: '#1d4ed8', flex: claimCols[4] }]}>{$f(c.captive_portion)}</Text>
                <Text style={[styles.cell, { color: c.excess_portion > 0 ? AMBER : SLATE_500, flex: claimCols[5] }]}>{$f(c.excess_portion)}</Text>
              </View>
            ))}
            {individual_claims.length > 30 && (
              <View style={[styles.tableRow, { padding: 5 }]}>
                <Text style={{ fontSize: 8, color: SLATE_500 }}>… and {individual_claims.length - 30} additional claims not shown</Text>
              </View>
            )}
            <View style={styles.tableSummaryRow}>
              <Text style={[styles.cellBold, { flex: claimCols[0] }]}></Text>
              <Text style={[styles.cellBold, { flex: claimCols[1] }]}>Total ({individual_claims.length} claims)</Text>
              <Text style={[styles.cell, { flex: claimCols[2] }]}></Text>
              <Text style={[styles.cellBold, { flex: claimCols[3] }]}>{$f(individual_claims.reduce((s, c) => s + c.loss_amount, 0))}</Text>
              <Text style={[styles.cellBold, { color: '#1d4ed8', flex: claimCols[4] }]}>{$f(individual_claims.reduce((s, c) => s + c.captive_portion, 0))}</Text>
              <Text style={[styles.cellBold, { color: AMBER, flex: claimCols[5] }]}>{$f(individual_claims.reduce((s, c) => s + c.excess_portion, 0))}</Text>
            </View>
          </View>

          <View style={[styles.narrativeBox, { marginTop: 12 }]}>
            <Text style={styles.narrativeText}>
              {`Of the ${summary.total_claims} documented claims, ${summary.total_claims - summary.claims_above_retention} (${pct((summary.total_claims - summary.claims_above_retention) / Math.max(summary.total_claims, 1))}) fell entirely within the $${structure.captive_retention.toLocaleString()} per-occurrence captive retention. `}
              {summary.claims_above_retention > 0
                ? `The remaining ${summary.claims_above_retention} claim${summary.claims_above_retention !== 1 ? 's' : ''} penetrated the excess layer, transferring ${$f(individual_claims.reduce((s, c) => s + c.excess_portion, 0))} to the carrier. The largest single claim was ${$f(summary.largest_claim)}.`
                : 'No claims penetrated the excess layer — all losses were retained within the captive structure.'}
            </Text>
          </View>

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>Elite Risk — Confidential · Prepared for {client_name}</Text>
            <Text style={styles.footerText}>{genDate} · Page 3 of 4</Text>
          </View>
        </Page>
      )}

      {/* ── PAGE 4 (or 3): 5-Year Projection & Recommendation ── */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.companyName}>{client_name}</Text>
          <Text style={styles.reportTitle}>Captive Insurance Feasibility Report · 5-Year Forward Projection</Text>
        </View>

        <View style={styles.metaBar}>
          {[
            ['New Annual Premium', $f(structure.new_annual_premium)],
            ['Captive Premium / yr', `${$f(structure.new_annual_premium * structure.captive_premium_pct)} (${pct(structure.captive_premium_pct)})`],
            ['Avg Historical Loss Rate', pct(summary.avg_loss_rate)],
            ['Annual Expenses', $f(structure.annual_expenses)],
            ...(hasTrend ? [
              ['Premium Trend Applied', (premium_trend >= 0 ? '+' : '') + premium_trend.toFixed(1) + '%/yr'],
              ['Loss Trend Applied', (loss_trend >= 0 ? '+' : '') + loss_trend.toFixed(1) + '%/yr'],
            ] : []),
          ].map(([label, value]) => (
            <View key={label} style={styles.metaItem}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>5-Year Projection</Text>
        <View>
          <View style={styles.tableHeaderRow}>
            {['Year', 'Captive Premium', 'Projected Losses', 'Captive Losses', 'Expenses', 'Net Profit', 'Cumulative Profit'].map((h, i) => (
              <Text key={h} style={[styles.cellHeader, { flex: projCols[i] }]}>{h}</Text>
            ))}
          </View>
          {projection.map((row, idx) => (
            <View key={row.year} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellBold, { flex: projCols[0] }]}>Year {row.year}</Text>
              <Text style={[styles.cell, { flex: projCols[1] }]}>{$f(row.captive_premium)}</Text>
              <Text style={[styles.cell, { flex: projCols[2] }]}>{$f(row.projected_total_losses)}</Text>
              <Text style={[styles.cell, { flex: projCols[3] }]}>{$f(row.projected_captive_losses)}</Text>
              <Text style={[styles.cell, { flex: projCols[4] }]}>{$f(row.expenses)}</Text>
              <Text style={[styles.cellBold, { color: row.net_profit >= 0 ? GREEN : RED, flex: projCols[5] }]}>{$f(row.net_profit)}</Text>
              <Text style={[styles.cellBold, { color: row.cumulative_profit >= 0 ? GREEN : RED, flex: projCols[6] }]}>{$f(row.cumulative_profit)}</Text>
            </View>
          ))}
          <View style={styles.tableSummaryRow}>
            <Text style={[styles.cellBold, { flex: projCols[0] }]}>5-Yr Total</Text>
            <Text style={[styles.cell, { flex: projCols[1] }]}>{$f(projection.reduce((s, r) => s + r.captive_premium, 0))}</Text>
            <Text style={[styles.cell, { flex: projCols[2] }]}>{$f(projection.reduce((s, r) => s + r.projected_total_losses, 0))}</Text>
            <Text style={[styles.cell, { flex: projCols[3] }]}>{$f(projection.reduce((s, r) => s + r.projected_captive_losses, 0))}</Text>
            <Text style={[styles.cellBold, { flex: projCols[4] }]}>{$f(structure.annual_expenses * 5)}</Text>
            <Text style={[styles.cellBold, { color: summary.total_5yr_projected_profit >= 0 ? GREEN : RED, flex: projCols[5] }]}>{$f(summary.total_5yr_projected_profit)}</Text>
            <Text style={[styles.cell, { flex: projCols[6] }]}></Text>
          </View>
        </View>

        {/* Final Recommendation */}
        <View style={[styles.narrativeBox, { marginTop: 14, borderLeftColor: scoreColor, backgroundColor: feasibility.score === 'favorable' ? '#f0fdf4' : feasibility.score === 'cautious' ? '#fffbeb' : '#fef2f2' }]}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: scoreColor, marginBottom: 4 }}>
            Recommendation: {scoreLabel}
          </Text>
          <Text style={styles.narrativeText}>{feasibility.recommendation}</Text>
          {hasTrend && (
            <Text style={[styles.narrativeText, { marginTop: 6, color: SLATE_500 }]}>
              {`* Projection reflects applied trends: premium ${(premium_trend >= 0 ? '+' : '') + premium_trend.toFixed(1)}%/yr, losses ${(loss_trend >= 0 ? '+' : '') + loss_trend.toFixed(1)}%/yr.`}
            </Text>
          )}
        </View>

        <View style={[styles.footer, { borderTopWidth: 0.5, borderTopColor: SLATE_200, paddingTop: 6 }]} fixed>
          <Text style={styles.footerText}>Elite Risk — Confidential · Prepared for {client_name}</Text>
          <Text style={styles.footerText}>{genDate} · Page {individual_claims.length > 0 ? '4' : '3'} of {individual_claims.length > 0 ? '4' : '3'}</Text>
        </View>
      </Page>

    </Document>
  );
}
