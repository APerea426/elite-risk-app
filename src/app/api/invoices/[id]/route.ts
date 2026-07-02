import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    const { date_sent, base_commission_received, mga_fee_received, date_received } = body;

    const { data: existing } = await supabase
      .from('invoices')
      .select('invoice_number, client_id')
      .eq('id', id)
      .single();
    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const updates: Record<string, unknown> = {};
    if (date_sent !== undefined) updates.date_sent = date_sent || null;
    if (base_commission_received !== undefined) updates.base_commission_received = base_commission_received ?? null;
    if (mga_fee_received !== undefined) updates.mga_fee_received = mga_fee_received ?? null;
    if (date_received !== undefined) updates.date_received = date_received || null;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: clientRecord } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', existing.client_id)
      .single();

    await logActivity({
      userId: profile.id,
      actionType: 'invoice_updated',
      recordType: 'invoice',
      recordId: id,
      recordLabel: `Invoice #${existing.invoice_number} — ${clientRecord?.company_name ?? 'client'}`,
      description: `${profile.full_name} updated tracking info for Invoice #${existing.invoice_number}`,
    });

    return NextResponse.json(invoice);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
