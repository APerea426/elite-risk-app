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
  date_sent: string | null;
  base_commission_received: number | null;
  mga_fee_received: number | null;
  date_received: string | null;
}

export interface ProgramStructure {
  id: string;
  client_id: string;
  captive_retention: number;
  excess_layer: number;
  carrier: 'victoria' | 'ottawa';
  captive_premium_pct: number;
  new_annual_premium: number;
  annual_expenses: number;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface HistoricalYear {
  year: number;
  premium: number;
  losses: number;
  captive_premium: number;
  excess_premium: number;
  captive_losses: number;
  excess_losses: number;
  captive_loss_ratio: number;
  client_pl: number;
}

export interface ProjectionYear {
  year: number;
  captive_premium: number;
  projected_total_losses: number;
  projected_captive_losses: number;
  expenses: number;
  net_profit: number;
  cumulative_profit: number;
}

export interface ProjectionData {
  client_name: string;
  generated_at: string;
  structure: {
    captive_retention: number;
    excess_layer: number;
    carrier: string;
    captive_premium_pct: number;
    new_annual_premium: number;
    annual_expenses: number;
  };
  historical: HistoricalYear[];
  projection: ProjectionYear[];
  summary: {
    avg_historical_loss_rate: number;
    total_5yr_projected_profit: number;
    avg_annual_projected_profit: number;
    years_of_history: number;
  };
}

export interface ProfitabilityProjection {
  id: string;
  client_id: string;
  program_structure_id: string;
  projection_data: ProjectionData;
  created_by: string;
  created_at: string;
}

export interface BrokerFee {
  id: string;
  client_id: string;
  description: string;
  amount: number;
  fee_date: string | null;
  amount_received: number | null;
  date_received: string | null;
  notes: string | null;
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
