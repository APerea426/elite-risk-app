import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { data: clientRecord } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', id)
      .single();
    if (!clientRecord) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const body = await request.json();
    const { premium_amount, base_commission_rate, mga_fee = 0, policy_period, due_date, notes } = body;

    if (!premium_amount || premium_amount <= 0) {
      return NextResponse.json({ error: 'Premium amount is required' }, { status: 400 });
    }
    if (base_commission_rate == null || base_commission_rate < 0) {
      return NextResponse.json({ error: 'Commission rate is required' }, { status: 400 });
    }

    const base_commission_amount = premium_amount * base_commission_rate;
    const total_commission = base_commission_amount + mga_fee;

    const { data: commission, error: commError } = await supabase
      .from('commissions')
      .insert({
        client_id: id,
        premium_amount,
        base_commission_rate,
        base_commission_amount,
        mga_fee,
        total_commission,
        policy_period: policy_period || null,
        notes: notes || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (commError) return NextResponse.json({ error: commError.message }, { status: 500 });
    if (!commission) return NextResponse.json({ error: 'Commission insert returned no data' }, { status: 500 });

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        client_id: id,
        commission_id: commission.id,
        amount_due: total_commission,
        due_date: due_date || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (invError) return NextResponse.json({ error: invError.message }, { status: 500 });
    if (!invoice) return NextResponse.json({ error: 'Invoice insert returned no data' }, { status: 500 });

    const label = policy_period
      ? `Invoice #${invoice.invoice_number} — ${clientRecord.company_name} (${policy_period})`
      : `Invoice #${invoice.invoice_number} — ${clientRecord.company_name}`;

    await logActivity({
      userId: profile.id,
      actionType: 'invoice_generated',
      recordType: 'invoice',
      recordId: invoice.id,
      recordLabel: label,
      description: `${profile.full_name} generated ${label}`,
    });

    return NextResponse.json({ commission, invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
