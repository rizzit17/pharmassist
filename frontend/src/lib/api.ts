import axiosClient from './axiosClient'
import type { CopilotResponseEnvelope } from '@/types/copilot'
import type { Complaint, ComplaintListOut, AuditLogOut } from '@/types/complaint'

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    axiosClient.post('/auth/login', { email, password }).then((r) => r.data),
  demo: () =>
    axiosClient.post('/auth/demo').then((r) => r.data),
  me: () =>
    axiosClient.get('/auth/me').then((r) => r.data),
}

// ── Complaints ────────────────────────────────────────────────────
export const complaintsApi = {
  list: (params?: {
    page?: number
    page_size?: number
    status?: string
    search?: string
    sort_by?: string
    sort_order?: string
  }): Promise<ComplaintListOut> =>
    axiosClient.get('/complaints', { params }).then((r) => r.data),

  get: (id: string): Promise<Complaint> =>
    axiosClient.get(`/complaints/${id}`).then((r) => r.data),

  create: (data: Partial<Complaint>): Promise<Complaint> =>
    axiosClient.post('/complaints', data).then((r) => r.data),

  update: (id: string, data: Partial<Complaint>): Promise<Complaint> =>
    axiosClient.patch(`/complaints/${id}`, data).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    axiosClient.delete(`/complaints/${id}`).then(() => undefined),

  getAuditTrail: (id: string): Promise<AuditLogOut[]> =>
    axiosClient.get(`/complaints/${id}/audit-trail`).then((r) => r.data),
}

// ── Copilot ───────────────────────────────────────────────────────
export const copilotApi = {
  chat: (data: {
    message: string
    session_id?: string
    complaint_id?: string
    current_complaint?: Record<string, any>
  }): Promise<CopilotResponseEnvelope> =>
    axiosClient.post('/copilot/chat', data).then((r) => r.data),

  upload: (
    file: File,
    sessionId?: string,
    complaintId?: string
  ): Promise<CopilotResponseEnvelope> => {
    const form = new FormData()
    form.append('file', file)
    if (sessionId) form.append('session_id', sessionId)
    if (complaintId) form.append('complaint_id', complaintId)
    return axiosClient
      .post('/copilot/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })
      .then((r) => r.data)
  },

  getSessionHistory: (sessionId: string) =>
    axiosClient.get(`/copilot/sessions/${sessionId}/history`).then((r) => r.data),

  summary: (data: { complaint_id?: string; complaint?: Record<string, any> }) =>
    axiosClient.post('/copilot/summary', data).then((r) => r.data),
}

// ── Dashboard ─────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => axiosClient.get('/dashboard/stats').then((r) => r.data),
  getCharts: () => axiosClient.get('/dashboard/charts').then((r) => r.data),
}

// ── Health ────────────────────────────────────────────────────────
export const healthApi = {
  check: () => axiosClient.get('/health').then((r) => r.data),
  db: () => axiosClient.get('/health/db').then((r) => r.data),
  llm: () => axiosClient.get('/health/llm').then((r) => r.data),
}
