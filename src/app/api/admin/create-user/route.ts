import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/activity-log';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Verify the caller is an authenticated admin
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('auth_id', authUser.id)
    .single();

  if (!callerProfile || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, full_name, role } = await request.json();
  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Use service role key to create Auth user (bypasses email confirmation)
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password: Math.random().toString(36).slice(-12) + 'Aa1!', // temporary password
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 500 });
  }

  // Insert profile row
  const { error: profileError } = await supabase.from('users').insert({
    auth_id: authData.user.id,
    email,
    full_name,
    role,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Send password reset email so the new user sets their own password
  await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  await logActivity({
    userId: callerProfile.id,
    actionType: 'user_created',
    recordType: 'user',
    recordLabel: `${full_name} (${email})`,
    description: `${callerProfile.full_name} created user ${full_name} (${email}) with role: ${role}`,
  });

  return NextResponse.json({ success: true });
}
