import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('auth_id', authUser.id)
    .single();

  const [{ count: prospectCount }, { count: clientCount }] = await Promise.all([
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
  ]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good Morning, ${firstName}` :
    hour < 18 ? `Good Afternoon, ${firstName}` :
    `Good Evening, ${firstName}`;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">{greeting}</h1>
      <p className="text-slate-500 mb-8">Welcome to Elite Risk.</p>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-2xl font-bold text-indigo-900">{clientCount ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Clients</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-2xl font-bold text-indigo-900">{prospectCount ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Active Prospects</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-2xl font-bold text-indigo-900">—</p>
          <p className="text-sm text-slate-500 mt-1">Outstanding Invoices</p>
        </div>
      </div>
    </div>
  );
}
