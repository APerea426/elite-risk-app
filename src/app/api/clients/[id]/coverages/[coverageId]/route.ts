import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; coverageId: string }> }
) {
  try {
    const { id, coverageId } = await params;
    const supabase = await createSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_id', authUser.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const { data: coverage } = await supabase
      .from('coverages')
      .select('coverage_type, client_id')
      .eq('id', coverageId)
      .single();

    const { data: clientRecord } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('coverages')
      .delete()
      .eq('id', coverageId)
      .eq('client_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const clientName = clientRecord?.company_name ?? 'client';
    const coverageType = coverage?.coverage_type ?? 'coverage';

    await logActivity({
      userId: profile.id,
      actionType: 'coverage_removed',
      recordType: 'client',
      recordId: id,
      recordLabel: clientName,
      description: `${profile.full_name} removed ${coverageType} coverage from ${clientName}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
