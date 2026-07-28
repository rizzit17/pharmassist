import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RiskAssessment, Completeness, DuplicateWarning, Recommendations } from '@/types/copilot'
import type { ComplaintStatus, ComplaintDraft } from '@/types/complaint'

type StatusPillState = 'pending_triage' | 'ready_to_commit' | 'committed' | 'draft'

interface ComplaintState {
  draft: ComplaintDraft
  draftId: string | null
  complaintNumber: string | null
  updatedFields: string[]
  statusPill: StatusPillState
  riskAssessment: RiskAssessment | null
  recommendations: Recommendations | null
  completeness: Completeness | null
  duplicateWarning: DuplicateWarning | null
  confidenceScores: Record<string, number>
  sessionId: string | null
  isCommitting: boolean
  commitError: string | null
  lastSavedAt: string | null
}

const initialState: ComplaintState = {
  draft: {},
  draftId: null,
  complaintNumber: null,
  updatedFields: [],
  statusPill: 'pending_triage',
  riskAssessment: null,
  recommendations: null,
  completeness: null,
  duplicateWarning: null,
  confidenceScores: {},
  sessionId: null,
  isCommitting: false,
  commitError: null,
  lastSavedAt: null,
}

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    // AI response is the ONLY writer to the draft object
    applyAIResponse: (
      state,
      action: PayloadAction<{
        complaint?: Record<string, any>
        updated_fields?: string[]
        confidence_scores?: Record<string, number>
        risk_assessment?: RiskAssessment
        recommendations?: Recommendations
        completeness?: Completeness
        duplicate_warning?: DuplicateWarning
        session_id?: string
      }>
    ) => {
      const {
        complaint,
        updated_fields,
        confidence_scores,
        risk_assessment,
        recommendations,
        completeness,
        duplicate_warning,
        session_id,
      } = action.payload

      if (complaint) {
        state.draft = { ...state.draft, ...complaint }
      }
      if (updated_fields) {
        state.updatedFields = updated_fields
      }
      if (confidence_scores) {
        state.confidenceScores = confidence_scores
      }
      if (risk_assessment) {
        state.riskAssessment = risk_assessment
      }
      if (recommendations) {
        state.recommendations = recommendations
      }
      if (completeness) {
        state.completeness = completeness
      }
      if (duplicate_warning) {
        state.duplicateWarning = duplicate_warning
      }
      if (session_id) {
        state.sessionId = session_id
      }

      // Update status pill based on completeness + risk
      if (completeness?.is_complete && risk_assessment?.severity) {
        state.statusPill = 'ready_to_commit'
      } else {
        state.statusPill = 'pending_triage'
      }
    },

    // Clear highlight after animation completes
    clearUpdatedFields: (state) => {
      state.updatedFields = []
    },

    // Set draft ID after commit
    setDraftId: (state, action: PayloadAction<{ id: string; number: string }>) => {
      state.draftId = action.payload.id
      state.complaintNumber = action.payload.number
    },

    // Mark as committed
    markCommitted: (state) => {
      state.statusPill = 'committed'
      state.lastSavedAt = new Date().toISOString()
    },

    // Manual field override (optional - dispatches through same reducer)
    manualFieldUpdate: (
      state,
      action: PayloadAction<{ field: string; value: any }>
    ) => {
      const { field, value } = action.payload
      ;(state.draft as any)[field] = value
      state.updatedFields = [field]
    },

    // Reset to initial state (new complaint)
    resetDraft: () => initialState,

    setIsCommitting: (state, action: PayloadAction<boolean>) => {
      state.isCommitting = action.payload
    },

    setCommitError: (state, action: PayloadAction<string | null>) => {
      state.commitError = action.payload
    },

    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload
    },
  },
})

export const {
  applyAIResponse,
  clearUpdatedFields,
  setDraftId,
  markCommitted,
  manualFieldUpdate,
  resetDraft,
  setIsCommitting,
  setCommitError,
  setSessionId,
} = complaintSlice.actions

export default complaintSlice.reducer
