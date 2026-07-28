// TypeScript types mirroring backend Pydantic schemas

export interface User {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

export interface AIAnalysis {
  id: string
  severity?: 'Critical' | 'Major' | 'Minor'
  suggested_next_action?: string
  initial_risk_assessment?: string
  regulatory_reportable?: boolean
  root_cause_suggestions?: string[]
  capa_suggestions?: string[]
  confidence_scores?: Record<string, number>
  model_used?: string
  created_at: string
}

export interface Complaint {
  id: string
  complaint_number: string
  source?: string
  customer_name?: string
  product_name?: string
  product_strength?: string
  batch_lot_number?: string
  affected_quantity?: string
  manufacturing_date?: string
  expiry_date?: string
  originating_site_block?: string
  impacted_npm?: string
  complaint_category?: string
  complaint_description?: string
  status: ComplaintStatus
  created_by?: string
  created_at: string
  updated_at: string
  ai_analyses?: AIAnalysis[]
  risk_assessment?: Record<string, any>
  ai_analysis?: Record<string, any>
}

export type ComplaintStatus =
  | 'draft'
  | 'pending_triage'
  | 'ready_to_commit'
  | 'committed'
  | 'under_investigation'
  | 'capa_assigned'
  | 'closed'

export type SeverityLevel = 'Critical' | 'Major' | 'Minor'

export interface ComplaintDraft {
  source?: string
  customer_name?: string
  product_name?: string
  product_strength?: string
  batch_lot_number?: string
  affected_quantity?: string
  manufacturing_date?: string
  expiry_date?: string
  originating_site_block?: string
  impacted_npm?: string
  complaint_category?: string
  complaint_description?: string
}

export interface ComplaintListOut {
  items: Complaint[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AuditLogOut {
  id: string
  complaint_id: string
  actor: 'human' | 'ai'
  actor_name?: string
  field_name?: string
  old_value?: string
  new_value?: string
  action_type: string
  created_at: string
}
