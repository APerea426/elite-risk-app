import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ClientDetailClient from './client-detail-client';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const [clientResult, coveragesResult, historyResult] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('coverages').select('*').eq('client_id', id).order('created_at'),
    supabase.from('premium_loss_history').select('*').eq('client_id', id).order('year', { ascending: false }),
  ]);

  if (!clientResult.data) redirect('/clients');

  return (
    <ClientDetailClient
      client={clientResult.data}
      coverages={coveragesResult.data ?? []}
      history={historyResult.data ?? []}
    />
  );
}
