import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; historyId: string }> }
) {
  try {
    const { id, historyId } = await params;
    const supabase = await createSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('id, full_name').eq('auth_id', authUser.id).single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.premium !== undefined) updates.premium = Number(body.premium);
    if (body.losses !== undefined) updates.losses = Number(body.losses);
    if (body.year !== undefined) updates.year = Number(body.year);
    if (body.line_of_coverage !== undefined) updates.line_of_coverage = body.line_of_coverage || null;

    const { data: row, error } = await supabase
      .from('premium_loss_history')
      .update(updates)
      .eq('id', historyId)
      .eq('client_id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    const { data: client } = await supabase.from('clients').select('company_name').eq('id', id).single();
    await logActivity({
      userId: profile.id,
      actionType: 'history_updated',
      recordType: 'client',
      recordId: id,
      recordLabel: client?.company_name ?? null,
      description: `${profile.full_name} updated ${row.year} history for ${client?.company_name}`,
    });

    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; historyId: string }> }
) {
  try {
    const { id, historyId } = await params;
    const supabase = await createSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('premium_loss_history')
      .delete()
      .eq('id', historyId)
      .eq('client_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
