import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

function calcSplit(lossAmount: number, captiveRetention: number | null) {
  if (captiveRetention == null || captiveRetention <= 0) return { captive: null, carrier: null };
  const captive = Math.min(lossAmount, captiveRetention);
  const carrier = Math.max(0, lossAmount - captiveRetention);
  return { captive, carrier };
}

async function recalcHistoryTotal(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, historyId: string) {
  const { data: allLosses } = await supabase
    .from('individual_losses')
    .select('loss_amount')
    .eq('history_id', historyId);
  const total = (allLosses ?? []).reduce((s, l) => s + Number(l.loss_amount), 0);
  await supabase.from('premium_loss_history').update({ losses: total }).eq('id', historyId);
  return total;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; lossId: string }> }) {
  try {
    const { id: clientId, lossId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('id, full_name').eq('auth_id', authUser.id).single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const body = await request.json();
    const { description, loss_amount, notes } = body;

    // Fetch existing to get history_id
    const { data: existing } = await supabase
      .from('individual_losses')
      .select('history_id, description')
      .eq('id', lossId)
      .eq('client_id', clientId)
      .single();
    if (!existing) return NextResponse.json({ error: 'Loss not found' }, { status: 404 });

    // Get captive retention for split recalc
    const { data: structure } = await supabase
      .from('program_structures')
      .select('captive_retention')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newAmount = Number(loss_amount);
    const { captive, carrier } = calcSplit(newAmount, structure?.captive_retention ?? null);

    const updates: Record<string, unknown> = {};
    if (description !== undefined) updates.description = description.trim();
    if (loss_amount !== undefined) {
      updates.loss_amount = newAmount;
      updates.captive_portion = captive;
      updates.carrier_portion = carrier;
    }
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    const { data: loss, error } = await supabase
      .from('individual_losses')
      .update(updates)
      .eq('id', lossId)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const totalLosses = await recalcHistoryTotal(supabase, existing.history_id);

    const { data: client } = await supabase.from('clients').select('company_name').eq('id', clientId).single();
    await logActivity({
      userId: profile.id,
      actionType: 'individual_loss_updated',
      recordType: 'client',
      recordId: clientId,
      recordLabel: client?.company_name ?? null,
      description: `${profile.full_name} updated loss "${loss.description}"`,
    });

    return NextResponse.json({ loss, totalLosses });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; lossId: string }> }) {
  try {
    const { id: clientId, lossId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('id, full_name').eq('auth_id', authUser.id).single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const { data: existing } = await supabase
      .from('individual_losses')
      .select('history_id, description')
      .eq('id', lossId)
      .eq('client_id', clientId)
      .single();
    if (!existing) return NextResponse.json({ error: 'Loss not found' }, { status: 404 });

    const { error } = await supabase.from('individual_losses').delete().eq('id', lossId).eq('client_id', clientId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const totalLosses = await recalcHistoryTotal(supabase, existing.history_id);

    const { data: client } = await supabase.from('clients').select('company_name').eq('id', clientId).single();
    await logActivity({
      userId: profile.id,
      actionType: 'individual_loss_deleted',
      recordType: 'client',
      recordId: clientId,
      recordLabel: client?.company_name ?? null,
      description: `${profile.full_name} deleted loss "${existing.description}"`,
    });

    return NextResponse.json({ success: true, totalLosses });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
