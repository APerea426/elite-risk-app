import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', authUser.id).single();
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 403 });

    const { data: prospect } = await supabase.from('prospects').select('*').eq('id', id).single();
    if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    if (prospect.linked_client_id) return NextResponse.json({ linked_client_id: prospect.linked_client_id });

    // Create shadow client
    const { data: shadowClient, error } = await supabase
      .from('clients')
      .insert({
        prospect_id: id,
        company_name: prospect.company_name,
        contact_name: prospect.contact_name,
        contact_email: prospect.contact_email,
        contact_phone: prospect.contact_phone,
        notes: prospect.notes,
        program_type: 'captive_only',
        is_prospect: true,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!shadowClient) return NextResponse.json({ error: 'Client insert returned no data' }, { status: 500 });

    await supabase.from('prospects').update({ linked_client_id: shadowClient.id }).eq('id', id);

    return NextResponse.json({ linked_client_id: shadowClient.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
