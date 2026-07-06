import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('id, full_name').eq('auth_id', authUser.id).single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const body = await request.json();
    const { description, amount, fee_date, amount_received, date_received, notes } = body;

    if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 });
    if (!amount || isNaN(Number(amount))) return NextResponse.json({ error: 'Amount required' }, { status: 400 });

    const { data: client } = await supabase.from('clients').select('company_name').eq('id', clientId).single();
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const { data: fee, error } = await supabase
      .from('broker_fees')
      .insert({
        client_id: clientId,
        description: description.trim(),
        amount: Number(amount),
        fee_date: fee_date || null,
        amount_received: amount_received != null && amount_received !== '' ? Number(amount_received) : null,
        date_received: date_received || null,
        notes: notes?.trim() || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      userId: profile.id,
      actionType: 'broker_fee_added',
      recordType: 'client',
      recordId: clientId,
      recordLabel: client.company_name,
      description: `${profile.full_name} added broker fee "${description.trim()}" for ${client.company_name}`,
    });

    return NextResponse.json(fee, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
