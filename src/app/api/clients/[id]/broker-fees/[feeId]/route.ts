import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; feeId: string }> }) {
  try {
    const { id: clientId, feeId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('id, full_name').eq('auth_id', authUser.id).single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const body = await request.json();
    const { description, amount, fee_date, amount_received, date_received, notes } = body;

    const updates: Record<string, unknown> = {};
    if (description !== undefined) updates.description = description.trim();
    if (amount !== undefined) updates.amount = Number(amount);
    if (fee_date !== undefined) updates.fee_date = fee_date || null;
    if (amount_received !== undefined) updates.amount_received = amount_received !== '' && amount_received != null ? Number(amount_received) : null;
    if (date_received !== undefined) updates.date_received = date_received || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    const { data: fee, error } = await supabase
      .from('broker_fees')
      .update(updates)
      .eq('id', feeId)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!fee) return NextResponse.json({ error: 'Fee not found' }, { status: 404 });

    const { data: client } = await supabase.from('clients').select('company_name').eq('id', clientId).single();

    await logActivity({
      userId: profile.id,
      actionType: 'broker_fee_updated',
      recordType: 'client',
      recordId: clientId,
      recordLabel: client?.company_name ?? null,
      description: `${profile.full_name} updated broker fee "${fee.description}"`,
    });

    return NextResponse.json(fee);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; feeId: string }> }) {
  try {
    const { id: clientId, feeId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('id, full_name').eq('auth_id', authUser.id).single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const { data: existing } = await supabase.from('broker_fees').select('description').eq('id', feeId).eq('client_id', clientId).single();
    if (!existing) return NextResponse.json({ error: 'Fee not found' }, { status: 404 });

    const { error } = await supabase.from('broker_fees').delete().eq('id', feeId).eq('client_id', clientId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: client } = await supabase.from('clients').select('company_name').eq('id', clientId).single();

    await logActivity({
      userId: profile.id,
      actionType: 'broker_fee_deleted',
      recordType: 'client',
      recordId: clientId,
      recordLabel: client?.company_name ?? null,
      description: `${profile.full_name} deleted broker fee "${existing.description}"`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
