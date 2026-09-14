export type Priority = 'high' | 'medium' | 'low'
export type AccountStatus = 'target' | 'contacted' | 'qualified' | 'dead'
export type Stage = 'requirement' | 'rfq' | 'quotation' | 'negotiation' | 'won' | 'lost' | 'repeat'

export const STAGES: Stage[] = ['requirement', 'rfq', 'quotation', 'negotiation', 'won', 'lost', 'repeat']
export const STAGE_LABEL: Record<Stage, string> = {
  requirement: 'Requirement', rfq: 'RFQ', quotation: 'Quotation',
  negotiation: 'Negotiation', won: 'Won', lost: 'Lost', repeat: 'Repeat Order',
}
export const STATUS_LABEL: Record<AccountStatus, string> = {
  target: 'Target', contacted: 'Contacted', qualified: 'Qualified', dead: 'Dead',
}

export interface Account {
  id: string
  company: string
  industry: string | null
  location: string | null
  website: string | null
  potential_products: string[]
  priority: Priority
  status: AccountStatus
  source: 'manual' | 'csv' | 'ai'
  verified: boolean
  last_activity: string | null
  next_action: string | null
  next_action_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  account_id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  is_primary: boolean
}

export interface ProductLine {
  product: string
  grade: string
  size: string
  thickness: string
  finish: string
  qty: string
  application: string
}

export interface Opportunity {
  id: string
  account_id: string
  stage: Stage
  products: ProductLine[]
  value_inr: number
  quote_ref: string | null
  expected_close: string | null
  next_action: string | null
  next_action_date: string | null
  lost_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  category: string
  grades: string[]
  sizes: string[]
  thicknesses: string[]
  finishes: string[]
  availability: string | null
  notes: string | null
}

export interface Activity {
  id: string
  account_id: string
  opportunity_id: string | null
  type: 'call' | 'email' | 'whatsapp' | 'visit' | 'note'
  summary: string
  at: string
}

export type NewAccount = Omit<Account, 'id' | 'created_at' | 'updated_at'>
export type NewOpportunity = Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>
