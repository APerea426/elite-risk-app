import { createClient } from './supabase/server';

interface LogActivityParams {
  userId: string;
  actionType: string;
  recordType: string;
  recordId?: string;
  recordLabel?: string;
  description: string;
}

export async function logActivity(params: LogActivityParams) {
  const supabase = await createClient();
  await supabase.from('activity_log').insert({
    user_id: params.userId,
    action_type: params.actionType,
    record_type: params.recordType,
    record_id: params.recordId ?? null,
    record_label: params.recordLabel ?? null,
    description: params.description,
  });
}
