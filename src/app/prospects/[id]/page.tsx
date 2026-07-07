import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProspectFullProfile from './prospect-full-profile';
import ProspectDetailClient from './prospect-detail-client';

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: prospect } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single();

  if (!prospect) redirect('/prospects');

  // If converted, redirect to the client page directly
  if (prospect.status === 'converted' && prospect.converted_to_client_id) {
    redirect(`/clients/${prospect.converted_to_client_id}`);
  }

  // No shadow client yet — show legacy UI (handles old prospects before this feature)
  if (!prospect.linked_client_id) {
    return <ProspectDetailClient prospect={prospect} />;
  }

  // Full profile: load all client data in parallel
  const clientId = prospect.linked_client_id;

  const [
    clientResult,
    coveragesResult,
    historyResult,
    commissionsResult,
    invoicesResult,
    clientRateResult,
    globalRateResult,
    programStructureResult,
    latestProjectionResult,
    brokerFeesResult,
    individualLossesResult,
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('coverages').select('*').eq('client_id', clientId).order('created_at'),
    supabase.from('premium_loss_history').select('*').eq('client_id', clientId).order('year', { ascending: false }),
    supabase.from('commissions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('client_id', clientId).order('invoice_number', { ascending: false }),
    supabase.from('commission_settings').select('base_commission_rate').eq('client_id', clientId).maybeSingle(),
    supabase.from('commission_settings').select('base_commission_rate').is('client_id', null).maybeSingle(),
    supabase.from('program_structures').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('profitability_projections').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('broker_fees').select('*').eq('client_id', clientId).order('fee_date', { ascending: false }),
    supabase.from('individual_losses').select('*').eq('client_id', clientId).order('created_at', { ascending: true }),
  ]);

  if (!clientResult.data) redirect('/prospects');

  const effectiveRate =
    clientRateResult.data?.base_commission_rate ??
    globalRateResult.data?.base_commission_rate ??
    0.15;

  return (
    <ProspectFullProfile
      prospect={prospect}
      client={clientResult.data}
      coverages={coveragesResult.data ?? []}
      history={historyResult.data ?? []}
      commissions={commissionsResult.data ?? []}
      invoices={invoicesResult.data ?? []}
      effectiveRate={effectiveRate}
      programStructure={programStructureResult.data ?? null}
      latestProjection={latestProjectionResult.data ?? null}
      brokerFees={brokerFeesResult.data ?? []}
      individualLosses={individualLossesResult.data ?? []}
    />
  );
}
