import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

function calcSplit(lossAmount: number, captiveRetention: number | null) {
  if (captiveRetention == null || captiveRetention <= 0) return { captive: null, carrier: null };
  const captive = Math.min(lossAmount, captiveRetention);
  const carrier = Math.max(0, lossAmount - captiveRetention);
  return { captive, carrier };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('id, full_name').eq('auth_id', authUser.id).single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const body = await request.json();
    const { history_id, year, description, loss_amount, notes } = body;

    if (!history_id) return NextResponse.json({ error: 'history_id required' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 });
    if (loss_amount == null || isNaN(Number(loss_amount))) return NextResponse.json({ error: 'loss_amount required' }, { status: 400 });

    // Verify history record belongs to this client
    const { data: historyRow } = await supabase
      .from('premium_loss_history')
      .select('id, year')
      .eq('id', history_id)
      .eq('client_id', clientId)
      .single();
    if (!historyRow) return NextResponse.json({ error: 'History record not found' }, { status: 404 });

    // Get captive retention from latest program structure for split calc
    const { data: structure } = await supabase
      .from('program_structures')
      .select('captive_retention')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { captive, carrier } = calcSplit(Number(loss_amount), structure?.captive_retention ?? null);

    const { data: loss, error } = await supabase
      .from('individual_losses')
      .insert({
        client_id: clientId,
        history_id,
        year: year ?? historyRow.year,
        description: description.trim(),
        loss_amount: Number(loss_amount),
        captive_portion: captive,
        carrier_portion: carrier,
        notes: notes?.trim() || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Recalculate total losses for this history record from all individual losses
    const { data: allLosses } = await supabase
      .from('individual_losses')
      .select('loss_amount')
      .eq('history_id', history_id);

    const totalLosses = (allLosses ?? []).reduce((s, l) => s + Number(l.loss_amount), 0);
    await supabase.from('premium_loss_history').update({ losses: totalLosses }).eq('id', history_id);

    const { data: client } = await supabase.from('clients').select('company_name').eq('id', clientId).single();

    await logActivity({
      userId: profile.id,
      actionType: 'individual_loss_added',
      recordType: 'client',
      recordId: clientId,
      recordLabel: client?.company_name ?? null,
      description: `${profile.full_name} added loss "${description.trim()}" (${historyRow.year}) for ${client?.company_name}`,
    });

    return NextResponse.json({ loss, totalLosses }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
