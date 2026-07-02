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

    const { year, premium, losses } = await request.json();

    if (!year || premium == null || losses == null) {
      return NextResponse.json({ error: 'Year, premium, and losses are required' }, { status: 400 });
    }

    const { data: clientRecord } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', id)
      .single();

    const { data: row, error } = await supabase
      .from('premium_loss_history')
      .upsert({ client_id: id, year, premium, losses }, { onConflict: 'client_id,year' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: 'Upsert returned no data' }, { status: 500 });

    const clientName = clientRecord?.company_name ?? 'client';
    await logActivity({
      userId: profile.id,
      actionType: 'history_saved',
      recordType: 'client',
      recordId: id,
      recordLabel: clientName,
      description: `${profile.full_name} saved ${year} premium/loss data for ${clientName}`,
    });

    return NextResponse.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
