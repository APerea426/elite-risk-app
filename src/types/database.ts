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

export type ProspectStatus = 'active' | 'inactive' | 'converted';

export interface Prospect {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: ProspectStatus;
  converted_to_client_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ProgramType =
  | 'captive_only'
  | 'ottawa_victoria_captive'
  | 'ottawa_victoria_only'
  | 'fronted'
  | 'fronted_captive';

export type CarrierType = 'ottawa' | 'victoria' | 'none';

export interface Client {
  id: string;
  prospect_id: string | null;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  program_type: ProgramType;
  carrier: CarrierType;
  notes: string | null;
  engagement_letter_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Coverage {
  id: string;
  client_id: string;
  coverage_type: string;
  policy_limit: number | null;
  notes: string | null;
  created_at: string;
}

export interface PremiumLossHistory {
  id: string;
  client_id: string;
  year: number;
  premium: number;
  losses: number;
  created_at: string;
}

export interface CommissionSettings {
  id: string;
  client_id: string | null;
  base_commission_rate: number;
  notes: string | null;
  created_at: string;
}

export interface Commission {
  id: string;
  client_id: string;
  premium_amount: number;
  base_commission_rate: number;
  base_commission_amount: number;
  mga_fee: number;
  total_commission: number;
  policy_period: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export type InvoiceStatus = 'outstanding' | 'paid';

export interface Invoice {
  id: string;
  invoice_number: number;
  client_id: string;
  commission_id: string;
  amount_due: number;
  date_issued: string;
  due_date: string | null;
  status: InvoiceStatus;
  paid_at: string | null;
  paid_by: string | null;
  pdf_url: string | null;
  created_by: string;
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
