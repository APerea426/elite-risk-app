import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ClientsClient from './clients-client';

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();
  if (!profile) redirect('/login');

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('is_prospect', false)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
      </div>
      <ClientsClient clients={clients ?? []} />
    </div>
  );
}
