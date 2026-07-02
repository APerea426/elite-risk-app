import { createClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity-log';
import { calculateProjection } from '@/lib/projection-calc';
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
    const { program_structure_id } = body;
    if (!program_structure_id) return NextResponse.json({ error: 'program_structure_id required' }, { status: 400 });

    const [clientResult, structureResult, historyResult] = await Promise.all([
      supabase.from('clients').select('company_name').eq('id', clientId).single(),
      supabase.from('program_structures').select('*').eq('id', program_structure_id).eq('client_id', clientId).single(),
      supabase.from('premium_loss_history').select('*').eq('client_id', clientId).order('year'),
    ]);

    if (!clientResult.data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    if (!structureResult.data) return NextResponse.json({ error: 'Program structure not found' }, { status: 404 });
    if (!historyResult.data || historyResult.data.length === 0) {
      return NextResponse.json({ error: 'No premium/loss history found. Add history data before generating a projection.' }, { status: 400 });
    }

    const projectionData = calculateProjection(
      clientResult.data.company_name,
      structureResult.data,
      historyResult.data
    );

    const { data: projection, error } = await supabase
      .from('profitability_projections')
      .insert({
        client_id: clientId,
        program_structure_id,
        projection_data: projectionData,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      userId: profile.id,
      actionType: 'projection_generated',
      recordType: 'client',
      recordId: clientId,
      recordLabel: clientResult.data.company_name,
      description: `${profile.full_name} generated a profitability projection for ${clientResult.data.company_name}`,
    });

    return NextResponse.json(projection, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
