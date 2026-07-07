import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { data: prospect } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', id)
      .single();

    if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    if (prospect.status !== 'active') {
      return NextResponse.json({ error: 'Only active prospects can be converted' }, { status: 400 });
    }

    let clientId: string;

    if (prospect.linked_client_id) {
      // Shadow client already exists — just promote it
      const { error: promoteError } = await supabase
        .from('clients')
        .update({ is_prospect: false, updated_at: new Date().toISOString() })
        .eq('id', prospect.linked_client_id);

      if (promoteError) return NextResponse.json({ error: promoteError.message }, { status: 500 });
      clientId = prospect.linked_client_id;
    } else {
      // Legacy prospect with no shadow client — create client now
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          prospect_id: id,
          company_name: prospect.company_name,
          contact_name: prospect.contact_name,
          contact_email: prospect.contact_email,
          contact_phone: prospect.contact_phone,
          notes: prospect.notes,
          program_type: 'captive_only',
          is_prospect: false,
          created_by: profile.id,
        })
        .select()
        .single();

      if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });
      if (!client) return NextResponse.json({ error: 'Client insert returned no data' }, { status: 500 });
      clientId = client.id;
    }

    await supabase
      .from('prospects')
      .update({ status: 'converted', converted_to_client_id: clientId, updated_at: new Date().toISOString() })
      .eq('id', id);

    await logActivity({
      userId: profile.id,
      actionType: 'prospect_converted',
      recordType: 'prospect',
      recordId: id,
      recordLabel: prospect.company_name,
      description: `${profile.full_name} converted ${prospect.company_name} from prospect to client`,
    });

    return NextResponse.json({ clientId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
