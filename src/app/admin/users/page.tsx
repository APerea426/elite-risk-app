import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UsersClient from './users-client';

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Users</h1>
      </div>
      <UsersClient users={users ?? []} currentUserId={profile.id} />
    </div>
  );
}
