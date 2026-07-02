import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ProjectionData } from '@/types/database';

const NAVY = '#1e3a8a';
const SLATE_50 = '#f8fafc';
const SLATE_100 = '#f1f5f9';
const SLATE_200 = '#e2e8f0';
const SLATE_500 = '#64748b';
const SLATE_800 = '#1e293b';
const GREEN = '#15803d';
const RED = '#dc2626';

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: SLATE_800 },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 },
  reportTitle: { fontSize: 9, color: SLATE_500, marginBottom: 10 },
  metaBar: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, backgroundColor: SLATE_50, padding: 8 },
  metaItem: { marginRight: 22, marginBottom: 2 },
  metaLabel: { fontSize: 7, color: SLATE_500, textTransform: 'uppercase' },
  metaValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: SLATE_800 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: SLATE_800, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: SLATE_200, paddingBottom: 3 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: NAVY },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tableRowAlt: { flexDirection: 'row', backgroundColor: SLATE_50, borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tableSummaryRow: { flexDirection: 'row', backgroundColor: SLATE_100, borderTopWidth: 1, borderTopColor: '#94a3b8' },
  cellHeader: { paddingTop: 4, paddingBottom: 4, paddingLeft: 5, paddingRight: 5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' },
  cell: { paddingTop: 3, paddingBottom: 3, paddingLeft: 5, paddingRight: 5, fontSize: 8 },
  cellBold: { paddingTop: 3, paddingBottom: 3, paddingLeft: 5, paddingRight: 5, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  conclusionBox: { marginTop: 14, padding: 10, backgroundColor: '#eff6ff', borderLeftWidth: 3, borderLeftColor: NAVY },
  conclusionText: { fontSize: 10, color: SLATE_800, lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

const $f = (n: number) => {
  const abs = Math.abs(Math.round(n));
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-$' : '$') + s;
};
const pct = (n: number) => (n * 100).toFixed(1) + '%';
const plColor = (n: number) => ({ color: n >= 0 ? GREEN : RED });

export default function ProfitabilityReportPDF({ data }: { data: ProjectionData }) {
  const { structure, historical, projection, summary, client_name } = data;
  const genDate = new Date(data.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const carrierLabel = structure.carrier.charAt(0).toUpperCase() + structure.carrier.slice(1);

  const histCols = [0.55, 1.15, 1.15, 1.15, 1.15, 1.15, 0.75, 1.15];
  const projCols = [0.6, 1.3, 1.3, 1.3, 1.1, 1.2, 1.3];

  return (
    <Document>
      {/* PAGE 1: Historical Analysis */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.companyName}>{client_name}</Text>
        <Text style={styles.reportTitle}>Captive Insurance Program — Historical Analysis</Text>

        <View style={styles.metaBar}>
          {[
            ['Carrier', carrierLabel],
            ['Deductible Layer', $f(structure.captive_retention)],
            ['Excess Layer', $f(structure.excess_layer)],
            ['Captive Premium Split', pct(structure.captive_premium_pct)],
            ['Years of History', String(summary.years_of_history)],
            ['Avg Historical Loss Rate', pct(summary.avg_historical_loss_rate)],
          ].map(([label, value]) => (
            <View key={label} style={styles.metaItem}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Historical Performance</Text>

        <View>
          <View style={styles.tableHeaderRow}>
            {['Year', 'Total Premium', 'Total Losses', 'Captive Premium', 'Captive Losses', 'Excess Losses', 'Loss Ratio', 'Client P&L'].map((h, i) => (
              <Text key={h} style={[styles.cellHeader, { flex: histCols[i] }]}>{h}</Text>
            ))}
          </View>
          {historical.map((row, idx) => (
            <View key={row.year} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellBold, { flex: histCols[0] }]}>{row.year}</Text>
              <Text style={[styles.cell, { flex: histCols[1] }]}>{$f(row.premium)}</Text>
              <Text style={[styles.cell, { flex: histCols[2] }]}>{$f(row.losses)}</Text>
              <Text style={[styles.cell, { flex: histCols[3] }]}>{$f(row.captive_premium)}</Text>
              <Text style={[styles.cell, { flex: histCols[4] }]}>{$f(row.captive_losses)}</Text>
              <Text style={[styles.cell, { flex: histCols[5] }]}>{$f(row.excess_losses)}</Text>
              <Text style={[styles.cell, { flex: histCols[6] }]}>{pct(row.captive_loss_ratio)}</Text>
              <Text style={[styles.cellBold, plColor(row.client_pl), { flex: histCols[7] }]}>{$f(row.client_pl)}</Text>
            </View>
          ))}
          <View style={styles.tableSummaryRow}>
            <Text style={[styles.cellBold, { flex: histCols[0] }]}>Avg</Text>
            {[
              historical.reduce((s, r) => s + r.premium, 0) / historical.length,
              historical.reduce((s, r) => s + r.losses, 0) / historical.length,
              historical.reduce((s, r) => s + r.captive_premium, 0) / historical.length,
              historical.reduce((s, r) => s + r.captive_losses, 0) / historical.length,
              historical.reduce((s, r) => s + r.excess_losses, 0) / historical.length,
            ].map((v, i) => (
              <Text key={i} style={[styles.cellBold, { flex: histCols[i + 1] }]}>{$f(v)}</Text>
            ))}
            <Text style={[styles.cellBold, { flex: histCols[6] }]}>{pct(summary.avg_historical_loss_rate)}</Text>
            <Text style={[styles.cellBold, plColor(historical.reduce((s, r) => s + r.client_pl, 0) / historical.length), { flex: histCols[7] }]}>
              {$f(historical.reduce((s, r) => s + r.client_pl, 0) / historical.length)}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Elite Risk — Confidential</Text>
          <Text style={styles.footerText}>Generated {genDate} · Page 1 of 2</Text>
        </View>
      </Page>

      {/* PAGE 2: 5-Year Projection */}
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.companyName}>{client_name}</Text>
        <Text style={styles.reportTitle}>Captive Insurance Program — 5-Year Forward Projection</Text>

        <View style={styles.metaBar}>
          {[
            ['New Annual Premium', $f(structure.new_annual_premium)],
            ['Captive Premium / yr', `${$f(structure.new_annual_premium * structure.captive_premium_pct)} (${pct(structure.captive_premium_pct)})`],
            ['Avg Historical Loss Rate', pct(summary.avg_historical_loss_rate)],
            ['Annual Expenses', $f(structure.annual_expenses)],
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
              <Text style={[styles.cellBold, plColor(row.net_profit), { flex: projCols[5] }]}>{$f(row.net_profit)}</Text>
              <Text style={[styles.cellBold, plColor(row.cumulative_profit), { flex: projCols[6] }]}>{$f(row.cumulative_profit)}</Text>
            </View>
          ))}
          <View style={styles.tableSummaryRow}>
            <Text style={[styles.cellBold, { flex: projCols[0] }]}>Total</Text>
            <Text style={[styles.cell, { flex: projCols[1] }]} />
            <Text style={[styles.cell, { flex: projCols[2] }]} />
            <Text style={[styles.cell, { flex: projCols[3] }]} />
            <Text style={[styles.cellBold, { flex: projCols[4] }]}>{$f(structure.annual_expenses * 5)}</Text>
            <Text style={[styles.cellBold, plColor(summary.total_5yr_projected_profit), { flex: projCols[5] }]}>{$f(summary.total_5yr_projected_profit)}</Text>
            <Text style={[styles.cell, { flex: projCols[6] }]} />
          </View>
        </View>

        <View style={styles.conclusionBox}>
          <Text style={styles.conclusionText}>
            {'Based on '}
            {summary.years_of_history}
            {summary.years_of_history !== 1 ? ' years' : ' year'}
            {' of historical data, this program structure is projected to generate '}
            {$f(summary.total_5yr_projected_profit)}
            {' in cumulative profit over 5 years, with an average annual profit of '}
            {$f(summary.avg_annual_projected_profit)}
            {'.'}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Elite Risk — Confidential</Text>
          <Text style={styles.footerText}>Generated {genDate} · Page 2 of 2</Text>
        </View>
      </Page>
    </Document>
  );
}
