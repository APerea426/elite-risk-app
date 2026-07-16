import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import FeasibilityReportPDF, { type FeasibilityReportData, type FeasibilityFactor } from '@/lib/pdf/feasibility-report';
import type { ReactElement, JSXElementConstructor } from 'react';

const $f = (n: number) => {
  const abs = Math.abs(Math.round(n));
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-$' : '$') + s;
};
const pct = (n: number) => (n * 100).toFixed(1) + '%';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const premiumTrend: number = Number(body.premium_trend) || 0;
    const lossTrend: number    = Number(body.loss_trend) || 0;

    // Fetch all needed data in parallel
    const [
      clientResult,
      historyResult,
      individualLossesResult,
      structureResult,
      projectionResult,
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('premium_loss_history').select('*').eq('client_id', clientId).order('year', { ascending: true }),
      supabase.from('individual_losses').select('*, premium_loss_history(line_of_coverage)').eq('client_id', clientId),
      supabase.from('program_structures').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('profitability_projections').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).single(),
    ]);

    const client = clientResult.data;
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const history = historyResult.data ?? [];
    const rawLosses = individualLossesResult.data ?? [];
    const structure = structureResult.data;

    if (!structure) return NextResponse.json({ error: 'No program structure found. Set one up on the Program Structure tab first.' }, { status: 400 });
    if (history.length === 0) return NextResponse.json({ error: 'No history data found. Add premium and loss history first.' }, { status: 400 });

    // Build historical analysis rows
    const histRows = history.map(row => {
      const captive_premium = row.premium * structure.captive_premium_pct;
      const captive_losses  = row.losses; // per-occurrence: captive absorbs all projected losses
      const excess_losses   = Math.max(0, row.losses - structure.captive_retention);
      const loss_ratio      = captive_premium > 0 ? row.losses / captive_premium : 0;
      const client_pl       = captive_premium - captive_losses;
      return { year: row.year, premium: row.premium, losses: row.losses, captive_premium, captive_losses, excess_losses, loss_ratio, client_pl };
    });

    // Individual claims
    const individualClaims = rawLosses.map(l => ({
      year: l.year,
      description: l.description,
      loss_amount: l.loss_amount,
      captive_portion: l.captive_portion ?? Math.min(l.loss_amount, structure.captive_retention),
      excess_portion: l.carrier_portion ?? Math.max(0, l.loss_amount - structure.captive_retention),
      line_of_coverage: (l.premium_loss_history as { line_of_coverage: string | null } | null)?.line_of_coverage ?? null,
    }));

    // Summary stats
    const totalPremium  = history.reduce((s, r) => s + r.premium, 0);
    const totalLosses   = history.reduce((s, r) => s + r.losses, 0);
    const n             = history.length;
    const avgLossRate   = totalPremium > 0 ? totalLosses / totalPremium : 0;
    const avgPremium    = totalPremium / n;
    const avgLosses     = totalLosses / n;
    const claimsAbove   = individualClaims.filter(c => c.loss_amount > structure.captive_retention).length;
    const largestClaim  = individualClaims.length > 0 ? Math.max(...individualClaims.map(c => c.loss_amount)) : 0;

    // Build projection (use stored if available, else compute inline)
    let projectionRows: FeasibilityReportData['projection'] = [];
    let proj5yr = 0;

    const storedProj = projectionResult.data?.projection_data;
    const baseProjRows = storedProj?.projection ?? (() => {
      // Inline computation matching projection-calc.ts
      const projCaptivePremium = structure.new_annual_premium * structure.captive_premium_pct;
      const projected_total_losses = structure.new_annual_premium * avgLossRate;
      let cum = 0;
      return Array.from({ length: 5 }, (_, i) => {
        const net = projCaptivePremium - projected_total_losses - structure.annual_expenses;
        cum += net;
        return { year: i + 1, captive_premium: projCaptivePremium, projected_total_losses, projected_captive_losses: projected_total_losses, expenses: structure.annual_expenses, net_profit: net, cumulative_profit: cum };
      });
    })();

    // Apply trends
    let cumulative = 0;
    projectionRows = baseProjRows.map((row, i) => {
      const yr = i + 1;
      const captive_premium          = row.captive_premium * Math.pow(1 + premiumTrend / 100, yr);
      const projected_total_losses   = row.projected_total_losses * Math.pow(1 + lossTrend / 100, yr);
      const projected_captive_losses = projected_total_losses;
      const net_profit               = captive_premium - projected_captive_losses - row.expenses;
      cumulative += net_profit;
      return { year: row.year, captive_premium, projected_total_losses, projected_captive_losses, expenses: row.expenses, net_profit, cumulative_profit: cumulative };
    });
    proj5yr = cumulative;
    const avgAnnualProjected = proj5yr / 5;

    // ── Feasibility Analysis ──
    const factors: FeasibilityFactor[] = [];

    // 1. Loss rate
    if (avgLossRate < 0.55) {
      factors.push({ label: 'Strong historical loss ratio', favorable: true, detail: `${pct(avgLossRate)} avg loss rate positions this risk favorably — captive is likely to remain profitable under normal loss conditions.` });
    } else if (avgLossRate < 0.75) {
      factors.push({ label: 'Moderate historical loss ratio', favorable: null, detail: `${pct(avgLossRate)} avg loss rate is within an acceptable range for captive viability, though margins may be tighter in adverse loss years.` });
    } else {
      factors.push({ label: 'Elevated historical loss ratio', favorable: false, detail: `${pct(avgLossRate)} avg loss rate may constrain captive profitability. Consider adjusting the retention level, premium allocation, or loss control initiatives before proceeding.` });
    }

    // 2. Premium volume
    if (avgPremium >= 750000) {
      factors.push({ label: 'Strong premium base', favorable: true, detail: `Avg annual premium of ${$f(avgPremium)} provides a solid funding base for the captive structure and supports cost-efficient program administration.` });
    } else if (avgPremium >= 350000) {
      factors.push({ label: 'Adequate premium volume', favorable: null, detail: `Avg annual premium of ${$f(avgPremium)} meets minimum thresholds for captive feasibility. Growth in premium volume would strengthen the program economics.` });
    } else {
      factors.push({ label: 'Limited premium volume', favorable: false, detail: `Avg annual premium of ${$f(avgPremium)} may limit captive economies of scale. Fixed formation and management costs represent a larger share of premium at this volume.` });
    }

    // 3. History depth
    if (n >= 7) {
      factors.push({ label: 'Deep loss history', favorable: true, detail: `${n} years of data provides actuarially credible loss development patterns and supports reliable forward projections.` });
    } else if (n >= 4) {
      factors.push({ label: 'Adequate loss history', favorable: null, detail: `${n} years of history supports a feasibility assessment, though additional years of data would improve projection accuracy.` });
    } else {
      factors.push({ label: 'Limited loss history', favorable: false, detail: `Only ${n} year${n !== 1 ? 's' : ''} of history limits actuarial credibility. Projections carry higher uncertainty — a conservative approach to retention sizing is recommended.` });
    }

    // 4. Loss volatility
    if (n > 1) {
      const lossArr  = history.map(r => r.losses);
      const mean     = avgLosses;
      const variance = lossArr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
      const stdDev   = Math.sqrt(variance);
      const cv       = mean > 0 ? stdDev / mean : 0;
      if (cv < 0.35) {
        factors.push({ label: 'Consistent loss pattern', favorable: true, detail: `Low year-to-year loss volatility (coefficient of variation: ${(cv * 100).toFixed(0)}%) indicates predictable losses and stable captive funding requirements.` });
      } else if (cv < 0.70) {
        factors.push({ label: 'Moderate loss volatility', favorable: null, detail: `Some year-to-year variation in losses (CV: ${(cv * 100).toFixed(0)}%) — adequate captive reserves and a disciplined underwriting approach are recommended.` });
      } else {
        factors.push({ label: 'High loss volatility', favorable: false, detail: `Significant year-to-year variation in losses (CV: ${(cv * 100).toFixed(0)}%) may stress captive reserves in adverse years. Conservative retention sizing and a robust reserve strategy are critical.` });
      }
    }

    // 5. Individual claims analysis
    if (individualClaims.length > 0) {
      const excessPct = claimsAbove / individualClaims.length;
      if (excessPct === 0) {
        factors.push({ label: 'All claims within retention', favorable: true, detail: `All ${individualClaims.length} documented claims fell within the ${$f(structure.captive_retention)} per-occurrence retention. The excess carrier has not been triggered, indicating the retention is well-calibrated to this risk profile.` });
      } else if (excessPct <= 0.10) {
        factors.push({ label: 'Minimal excess layer penetration', favorable: true, detail: `${claimsAbove} of ${individualClaims.length} claims (${pct(excessPct)}) exceeded the ${$f(structure.captive_retention)} captive retention. Excess layer usage is limited and appropriate.` });
      } else if (excessPct <= 0.25) {
        factors.push({ label: 'Some excess layer penetration', favorable: null, detail: `${claimsAbove} of ${individualClaims.length} claims (${pct(excessPct)}) exceeded the captive retention. Consider whether the retention level should be adjusted.` });
      } else {
        factors.push({ label: 'Frequent excess layer penetration', favorable: false, detail: `${claimsAbove} of ${individualClaims.length} claims (${pct(excessPct)}) exceeded the ${$f(structure.captive_retention)} retention. A higher retention may better capture risk, or the insured's loss severity profile warrants further review.` });
      }
    }

    // 6. 5-year projection outcome
    if (proj5yr > 0) {
      factors.push({ label: 'Positive 5-year projection', favorable: true, detail: `Program is projected to generate ${$f(proj5yr)} in cumulative captive profit over 5 years (avg ${$f(avgAnnualProjected)}/yr), supporting long-term program viability.` });
    } else {
      factors.push({ label: 'Negative 5-year projection', favorable: false, detail: `Current structure projects a ${$f(Math.abs(proj5yr))} net loss over 5 years. Premium levels, retention, or expense assumptions should be reviewed before program inception.` });
    }

    // Overall score
    const favorableCount   = factors.filter(f => f.favorable === true).length;
    const unfavorableCount = factors.filter(f => f.favorable === false).length;
    let score: 'favorable' | 'cautious' | 'unfavorable';
    if (unfavorableCount === 0 && favorableCount >= 2) {
      score = 'favorable';
    } else if (unfavorableCount > favorableCount) {
      score = 'unfavorable';
    } else {
      score = 'cautious';
    }

    // Recommendation narrative
    const capturePct = totalLosses > 0 ? histRows.reduce((s, r) => s + r.captive_losses, 0) / totalLosses : 0;
    const recommendation =
      score === 'favorable'
        ? `Based on ${n} years of premium and loss history, ${client.company_name} presents a favorable captive insurance candidate. The ${pct(avgLossRate)} avg historical loss rate, combined with a ${$f(avgPremium)} avg annual premium base, supports a well-funded captive structure. The ${$f(structure.captive_retention)} per-occurrence retention captures approximately ${pct(capturePct)} of total historical losses within the captive layer, providing meaningful risk transfer benefit. The 5-year forward projection indicates ${$f(proj5yr)} in cumulative profit, reinforcing the long-term economic case for the program. Elite Risk recommends proceeding with captive formation.`
        : score === 'cautious'
        ? `${client.company_name} shows potential as a captive candidate, though several factors warrant careful consideration before proceeding. The ${pct(avgLossRate)} avg historical loss rate and ${n} years of history provide a baseline, but ${unfavorableCount > 0 ? 'some risk factors require attention' : 'the program economics are marginal'}. We recommend a detailed actuarial review, conservative retention sizing, and a phased approach to captive formation to manage downside risk. Addressing the flagged concerns above would meaningfully strengthen the feasibility outlook.`
        : `Based on the available data, ${client.company_name} does not currently meet the recommended thresholds for a self-funded captive program. The combination of ${pct(avgLossRate)} historical loss rate${proj5yr < 0 ? ` and a negative 5-year projection of ${$f(proj5yr)}` : ''} creates meaningful profitability risk. Elite Risk recommends focusing on loss control initiatives to reduce frequency and severity before revisiting captive feasibility in 12–24 months. Alternative risk transfer structures may be more appropriate in the near term.`;

    const reportData: FeasibilityReportData = {
      client_name: client.company_name,
      generated_at: new Date().toISOString(),
      premium_trend: premiumTrend,
      loss_trend: lossTrend,
      structure: {
        captive_retention: structure.captive_retention,
        excess_layer: structure.excess_layer,
        carrier: structure.carrier,
        captive_premium_pct: structure.captive_premium_pct,
        new_annual_premium: structure.new_annual_premium,
        annual_expenses: structure.annual_expenses,
      },
      history: histRows,
      individual_claims: individualClaims,
      projection: projectionRows,
      summary: {
        avg_loss_rate: avgLossRate,
        avg_annual_premium: avgPremium,
        avg_annual_losses: avgLosses,
        years_of_history: n,
        total_claims: individualClaims.length,
        claims_above_retention: claimsAbove,
        largest_claim: largestClaim,
        total_5yr_projected_profit: proj5yr,
        avg_annual_projected_profit: avgAnnualProjected,
      },
      feasibility: { score, factors, recommendation },
    };

    const element = React.createElement(FeasibilityReportPDF, { data: reportData }) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>;
    const nodeBuffer = await renderToBuffer(element);
    const buffer = new Uint8Array(nodeBuffer);

    const filename = `captive-feasibility-${client.company_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;

    return new Response(buffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
