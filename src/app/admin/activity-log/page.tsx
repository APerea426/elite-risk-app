import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ActivityLogPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', authUser.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const { data: entries } = await supabase
    .from('activity_log')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Activity Log</h1>

      {!entries || entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No activity recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Timestamp</th>
                <th className="px-6 py-3 text-left">User</th>
                <th className="px-6 py-3 text-left">Action</th>
                <th className="px-6 py-3 text-left">Record</th>
                <th className="px-6 py-3 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-slate-700">
                    {(entry.users as { full_name: string } | null)?.full_name ?? '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {entry.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{entry.record_label ?? entry.record_type}</td>
                  <td className="px-6 py-3 text-slate-700">{entry.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
