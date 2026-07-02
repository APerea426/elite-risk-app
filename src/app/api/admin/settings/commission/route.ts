import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('commission_settings')
      .select('*')
      .is('client_id', null)
      .maybeSingle();

    return NextResponse.json({ rate: data?.base_commission_rate ?? 0.15, settings: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', authUser.id)
      .single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { rate } = await request.json();
    if (rate == null || rate <= 0 || rate > 1) {
      return NextResponse.json({ error: 'Rate must be between 0 and 1 (e.g. 0.15 for 15%)' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('commission_settings')
      .select('id')
      .is('client_id', null)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('commission_settings')
        .update({ base_commission_rate: rate })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('commission_settings')
        .insert({ client_id: null, base_commission_rate: rate, notes: 'Global default' });
    }

    return NextResponse.json({ rate });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
