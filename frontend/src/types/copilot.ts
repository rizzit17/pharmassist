// TypeScript types for the Copilot API

export interface RiskAssessment {
  severity?: 'Critical' | 'Major' | 'Minor'
  suggested_next_action?: string
  initial_risk_assessment?: string
  regulatory_reportable?: boolean
}

export interface Recommendations {
  root_cause?: string[]
  capa?: string[]
}

export interface Completeness {
  is_complete: boolean
  missing_fields?: string[]
  validation_errors?: string[]
}

export interface DuplicateCandidate {
  complaint_id: string
  complaint_number: string
  similarity_score: number
  reasoning?: string
}

export interface DuplicateWarning {
  found: boolean
  candidates?: DuplicateCandidate[]
}

export interface CopilotResponseEnvelope {
  session_id: string
  intent?: 'NEW_COMPLAINT' | 'EDIT_COMPLAINT' | 'DOCUMENT_UPLOAD' | 'GENERAL_QUERY' | 'AMBIGUOUS'
  complaint?: Record<string, any>
  updated_fields?: string[]
  confidence_scores?: Record<string, number>
  risk_assessment?: RiskAssessment
  recommendations?: Recommendations
  completeness?: Completeness
  duplicate_warning?: DuplicateWarning
  assistant_message: string
  status: 'processing' | 'success' | 'needs_clarification' | 'error'
  ocr_method?: string
}

export type ChatMessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  timestamp: string
  isProcessing?: boolean
  attachedFileName?: string
  isFileUpload?: boolean
  progressValue?: number
}
