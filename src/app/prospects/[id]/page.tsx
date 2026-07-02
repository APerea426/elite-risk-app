import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
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

  return <ProspectDetailClient prospect={prospect} />;
}
