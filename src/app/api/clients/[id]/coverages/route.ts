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

    const body = await request.json();
    const { coverage_type, policy_limit, notes } = body;

    if (!coverage_type?.trim()) return NextResponse.json({ error: 'Coverage type is required' }, { status: 400 });

    const { data: clientRecord } = await supabase
      .from('clients')
      .select('company_name')
      .eq('id', id)
      .single();

    const { data: coverage, error } = await supabase
      .from('coverages')
      .insert({
        client_id: id,
        coverage_type: coverage_type.trim(),
        policy_limit: policy_limit || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!coverage) return NextResponse.json({ error: 'Insert returned no data' }, { status: 500 });

    const clientName = clientRecord?.company_name ?? 'client';
    await logActivity({
      userId: profile.id,
      actionType: 'coverage_added',
      recordType: 'client',
      recordId: id,
      recordLabel: clientName,
      description: `${profile.full_name} added ${coverage_type.trim()} coverage to ${clientName}`,
    });

    return NextResponse.json(coverage);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
