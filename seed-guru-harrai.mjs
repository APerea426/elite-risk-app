/**
 * Seed script: Guru Harrai LLC — Premium & Loss History
 *
 * Run AFTER applying migration.sql in Supabase.
 *
 * Usage:
 *   node --env-file=.env.local seed-guru-harrai.mjs
 *
 * Required env vars (already in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← uses service role to bypass RLS
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Data ──────────────────────────────────────────────────────────────────
// Loss totals extracted from 8 carrier loss run PDFs (July 2026).
// Policy year stored as start year: 2021 = policy year 2021-22, etc.
// Premium = 0 placeholder — update via the app once premiums are confirmed.
// ──────────────────────────────────────────────────────────────────────────

const HISTORY_ROWS = [
  // 2021-22 — Falls Lake National (PKG: FLTRK00000086800)
  { year: 2021, line_of_coverage: 'AL',  premium: 0, losses: 97600.73 },

  // 2022-23 — Berkley Prime (6511883-0) for AL/APD; AGCS (0093089302) for MTC
  { year: 2022, line_of_coverage: 'AL',  premium: 0, losses:  8662.93 },
  { year: 2022, line_of_coverage: 'APD', premium: 0, losses: 209310.18 },
  { year: 2022, line_of_coverage: 'MTC', premium: 0, losses: 15609.00 },

  // 2023-24 — Canal (CT5612253111-1) for AL/APD/MTC; USLI/Devon Park for GL
  { year: 2023, line_of_coverage: 'AL',  premium: 0, losses: 193584.02 },
  { year: 2023, line_of_coverage: 'APD', premium: 0, losses:      0.00 },
  { year: 2023, line_of_coverage: 'MTC', premium: 0, losses: 15694.24 },
  { year: 2023, line_of_coverage: 'GL',  premium: 0, losses:      0.00 },

  // 2024-25 — Canal (CT5612253111-2) for AL/APD/MTC; USLI/Devon Park for GL
  // APD gross $101,962.40 (includes $20,793 subrogation recovery; net = $81,169.40)
  { year: 2024, line_of_coverage: 'AL',  premium: 0, losses:  64382.61 },
  { year: 2024, line_of_coverage: 'APD', premium: 0, losses: 101962.40 },
  { year: 2024, line_of_coverage: 'MTC', premium: 0, losses: 117838.00 },
  { year: 2024, line_of_coverage: 'GL',  premium: 0, losses:      0.00 },

  // 2025-26 — Third Coast (TCCRO001739-25) AL; Great Lakes APD/MTC; USLI GL
  { year: 2025, line_of_coverage: 'AL',  premium: 0, losses:  42228.59 },
  { year: 2025, line_of_coverage: 'APD', premium: 0, losses:  29800.00 },
  { year: 2025, line_of_coverage: 'MTC', premium: 0, losses:  82759.95 },
  { year: 2025, line_of_coverage: 'GL',  premium: 0, losses:      0.00 },
];

// ─── Individual claims ─────────────────────────────────────────────────────
// Key claims from the loss runs; history_id filled in after rows are created.
// Add the rest via the app's "+ Add Claim" button.
// ──────────────────────────────────────────────────────────────────────────

/** @param {string} historyId */
function claimsFor(historyId, year, line) {
  const map = {
    '2021-AL': [
      { description: 'Falls Lake — combined AL losses 2021-22', loss_amount: 97600.73, notes: 'PKG policy FLTRK00000086800' },
    ],
    '2022-AL': [
      { description: 'PR1902219', loss_amount: null, notes: 'Berkley 6511883-0' },
      { description: 'PR1902288', loss_amount: null, notes: 'Berkley 6511883-0' },
      { description: 'PR1902790', loss_amount: null, notes: 'Berkley 6511883-0' },
      { description: 'PR1903573', loss_amount: null, notes: 'Berkley 6511883-0' },
    ],
    '2022-APD': [
      { description: 'PR1902218', loss_amount: null, notes: 'Berkley 6511883-0 — largest APD claim' },
      { description: 'PR1903562', loss_amount: null, notes: 'Berkley 6511883-0' },
    ],
    '2022-MTC': [
      { description: 'AGCS MTC combined losses 2022-23', loss_amount: 15609.00, notes: 'Policy 0093089302' },
    ],
    '2024-APD': [
      { description: 'Canal APD losses 2024-25 (gross)', loss_amount: 101962.40, notes: 'Gross incurred; $20,793 subrogation recovery → net $81,169.40' },
    ],
  };
  return (map[`${year}-${line}`] ?? []).map(c => ({
    history_id: historyId,
    year,
    description: c.description,
    loss_amount: c.loss_amount ?? 0,
    notes: c.notes ?? null,
    captive_portion: null,
    carrier_portion: null,
  }));
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function run() {
  // 1. Find or create the Guru Harrai LLC client
  let { data: existing } = await supabase
    .from('clients')
    .select('id, company_name')
    .ilike('company_name', '%guru harrai%')
    .maybeSingle();

  let clientId = existing?.id;

  if (!clientId) {
    // Find the admin user to set as creator
    const { data: admin } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .single();

    if (!admin) {
      console.error('No admin user found — cannot create client.');
      process.exit(1);
    }

    const { data: newClient, error: cErr } = await supabase
      .from('clients')
      .insert({
        company_name: 'Guru Harrai LLC',
        program_type: 'captive_only',
        carrier: 'none',
        created_by: admin.id,
      })
      .select('id')
      .single();

    if (cErr) { console.error('Failed to create client:', cErr.message); process.exit(1); }
    clientId = newClient.id;
    console.log(`✓ Created client: Guru Harrai LLC (${clientId})`);
  } else {
    console.log(`✓ Found existing client: ${existing.company_name} (${clientId})`);
  }

  // 2. Find admin user id for created_by on individual losses
  const { data: admin } = await supabase.from('users').select('id').eq('role', 'admin').single();
  const adminId = admin?.id;

  // 3. Upsert history rows
  let inserted = 0, skipped = 0;
  for (const row of HISTORY_ROWS) {
    const { data: hr, error } = await supabase
      .from('premium_loss_history')
      .upsert(
        { client_id: clientId, ...row },
        { onConflict: 'client_id,year,line_of_coverage' }
      )
      .select('id')
      .single();

    if (error) {
      console.error(`  ✗ ${row.year} ${row.line_of_coverage}: ${error.message}`);
      skipped++;
      continue;
    }

    console.log(`  ✓ ${row.year} ${row.line_of_coverage ?? 'combined'}  losses=$${row.losses.toLocaleString()}`);
    inserted++;

    // 4. Seed representative individual claims (skips if already exist)
    const claims = claimsFor(hr.id, row.year, row.line_of_coverage);
    for (const claim of claims) {
      if (!claim.loss_amount) continue; // skip placeholder $0 entries
      const { error: clErr } = await supabase
        .from('individual_losses')
        .upsert(
          { ...claim, client_id: clientId, created_by: adminId },
          { onConflict: 'id' }
        );
      if (clErr) console.warn(`    ⚠ claim "${claim.description}": ${clErr.message}`);
      else console.log(`    + claim: ${claim.description}  $${claim.loss_amount.toLocaleString()}`);
    }
  }

  console.log(`\nDone — ${inserted} rows upserted, ${skipped} skipped.`);
  console.log('Open the app and update premium amounts in the History tab for each line.');
}

run().catch(err => { console.error(err); process.exit(1); });
