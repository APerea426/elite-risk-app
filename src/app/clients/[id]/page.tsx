import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ClientDetailClient from './client-detail-client';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

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
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('coverages').select('*').eq('client_id', id).order('created_at'),
    supabase.from('premium_loss_history').select('*').eq('client_id', id).order('year', { ascending: false }),
    supabase.from('commissions').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('client_id', id).order('invoice_number', { ascending: false }),
    supabase.from('commission_settings').select('base_commission_rate').eq('client_id', id).maybeSingle(),
    supabase.from('commission_settings').select('base_commission_rate').is('client_id', null).maybeSingle(),
    supabase.from('program_structures').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('profitability_projections').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('broker_fees').select('*').eq('client_id', id).order('fee_date', { ascending: false }),
  ]);

  if (!clientResult.data) redirect('/clients');

  const effectiveRate =
    clientRateResult.data?.base_commission_rate ??
    globalRateResult.data?.base_commission_rate ??
    0.15;

  return (
    <ClientDetailClient
      client={clientResult.data}
      coverages={coveragesResult.data ?? []}
      history={historyResult.data ?? []}
      commissions={commissionsResult.data ?? []}
      invoices={invoicesResult.data ?? []}
      effectiveRate={effectiveRate}
      programStructure={programStructureResult.data ?? null}
      latestProjection={latestProjectionResult.data ?? null}
      brokerFees={brokerFeesResult.data ?? []}
    />
  );
}
