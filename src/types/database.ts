export type Role = 'admin' | 'user';

export interface User {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  record_type: string;
  record_id: string | null;
  record_label: string | null;
  description: string;
  created_at: string;
  users?: { full_name: string; email: string };
}
