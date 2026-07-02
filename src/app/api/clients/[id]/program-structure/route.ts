import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await params;
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
    const { captive_retention, excess_layer, carrier, captive_premium_pct, new_annual_premium, annual_expenses, notes } = body;

    if (!captive_retention || !excess_layer || !carrier || captive_premium_pct == null || !new_annual_premium || annual_expenses == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: client } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', clientId)
      .single();
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const { data: structure, error } = await supabase
      .from('program_structures')
      .insert({
        client_id: clientId,
        captive_retention,
        excess_layer,
        carrier,
        captive_premium_pct,
        new_annual_premium,
        annual_expenses,
        notes: notes ?? null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      userId: profile.id,
      actionType: 'program_structure_saved',
      recordType: 'client',
      recordId: clientId,
      recordLabel: client.company_name,
      description: `${profile.full_name} saved program structure for ${client.company_name}`,
    });

    return NextResponse.json(structure, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
