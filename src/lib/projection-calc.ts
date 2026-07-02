import type { PremiumLossHistory, ProgramStructure, ProjectionData } from '@/types/database';

export function calculateProjection(
  clientName: string,
  structure: ProgramStructure,
  history: PremiumLossHistory[]
): ProjectionData {
  const sorted = [...history].sort((a, b) => a.year - b.year);

  const historical = sorted.map(row => {
    const captive_premium = row.premium * structure.captive_premium_pct;
    const excess_premium = row.premium * (1 - structure.captive_premium_pct);
    const captive_losses = Math.min(row.losses, structure.captive_retention);
    const excess_losses = Math.max(0, row.losses - structure.captive_retention);
    const captive_loss_ratio = captive_premium > 0 ? captive_losses / captive_premium : 0;
    const client_pl = captive_premium - captive_losses;
    return { year: row.year, premium: row.premium, losses: row.losses, captive_premium, excess_premium, captive_losses, excess_losses, captive_loss_ratio, client_pl };
  });

  const totalPremium = sorted.reduce((s, r) => s + r.premium, 0);
  const totalLosses = sorted.reduce((s, r) => s + r.losses, 0);
  const avg_historical_loss_rate = totalPremium > 0 ? totalLosses / totalPremium : 0;

  const projCaptivePremium = structure.new_annual_premium * structure.captive_premium_pct;
  let cumulative = 0;
  const projection = Array.from({ length: 5 }, (_, i) => {
    const projected_total_losses = structure.new_annual_premium * avg_historical_loss_rate;
    const projected_captive_losses = Math.min(projected_total_losses, structure.captive_retention);
    const net_profit = projCaptivePremium - projected_captive_losses - structure.annual_expenses;
    cumulative += net_profit;
    return { year: i + 1, captive_premium: projCaptivePremium, projected_total_losses, projected_captive_losses, expenses: structure.annual_expenses, net_profit, cumulative_profit: cumulative };
  });

  return {
    client_name: clientName,
    generated_at: new Date().toISOString(),
    structure: {
      captive_retention: structure.captive_retention,
      excess_layer: structure.excess_layer,
      carrier: structure.carrier,
      captive_premium_pct: structure.captive_premium_pct,
      new_annual_premium: structure.new_annual_premium,
      annual_expenses: structure.annual_expenses,
    },
    historical,
    projection,
    summary: {
      avg_historical_loss_rate,
      total_5yr_projected_profit: cumulative,
      avg_annual_projected_profit: cumulative / 5,
      years_of_history: sorted.length,
    },
  };
}
