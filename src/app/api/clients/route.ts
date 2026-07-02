import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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
    const { company_name, contact_name, contact_email, contact_phone, program_type, carrier, engagement_letter_date, notes } = body;

    if (!company_name?.trim()) return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    if (!program_type) return NextResponse.json({ error: 'Program type is required' }, { status: 400 });

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        company_name: company_name.trim(),
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        program_type,
        carrier: carrier || 'none',
        engagement_letter_date: engagement_letter_date || null,
        notes: notes || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!client) return NextResponse.json({ error: 'Insert returned no data' }, { status: 500 });

    await logActivity({
      userId: profile.id,
      actionType: 'client_created',
      recordType: 'client',
      recordId: client.id,
      recordLabel: company_name.trim(),
      description: `${profile.full_name} added ${company_name.trim()} as a client`,
    });

    return NextResponse.json(client);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
