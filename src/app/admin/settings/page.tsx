import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from './settings-client';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', authUser.id)
    .single();
  if (profile?.role !== 'admin') redirect('/dashboard');

  const { data: globalRate } = await supabase
    .from('commission_settings')
    .select('base_commission_rate, created_at')
    .is('client_id', null)
    .maybeSingle();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>
      <SettingsClient currentRate={globalRate?.base_commission_rate ?? 0.15} />
    </div>
  );
}
