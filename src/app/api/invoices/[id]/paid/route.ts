import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_id', authUser.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const { data: existing } = await supabase
      .from('invoices')
      .select('status, invoice_number, client_id')
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (existing.status === 'paid') return NextResponse.json({ error: 'Invoice already marked paid' }, { status: 400 });

    const paidAt = new Date().toISOString();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: paidAt, paid_by: profile.id })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!invoice) return NextResponse.json({ error: 'Update returned no data' }, { status: 500 });

    const { data: clientRecord } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', existing.client_id)
      .single();

    const label = `Invoice #${existing.invoice_number} — ${clientRecord?.company_name ?? 'client'}`;

    await logActivity({
      userId: profile.id,
      actionType: 'invoice_marked_paid',
      recordType: 'invoice',
      recordId: id,
      recordLabel: label,
      description: `${profile.full_name} marked ${label} as paid`,
    });

    return NextResponse.json(invoice);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
