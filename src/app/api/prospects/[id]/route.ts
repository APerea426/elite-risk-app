import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('auth_id', authUser.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

  const body = await request.json();
  const isStatusChange = 'status' in body && Object.keys(body).length === 1;

  const { data: prospect, error } = await supabase
    .from('prospects')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity({
    userId: profile.id,
    actionType: isStatusChange ? 'prospect_status_changed' : 'prospect_updated',
    recordType: 'prospect',
    recordId: id,
    recordLabel: prospect.company_name,
    description: isStatusChange
      ? `${profile.full_name} marked ${prospect.company_name} as ${body.status}`
      : `${profile.full_name} updated ${prospect.company_name}`,
  });

  return NextResponse.json(prospect);
}
