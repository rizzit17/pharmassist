import type { ComplaintStatus, SeverityLevel } from '@/types/complaint'

export const formatDate = (date?: string | null): string => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const formatDateTime = (date?: string | null): string => {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getStatusLabel = (status: ComplaintStatus): string => {
  const labels: Record<ComplaintStatus, string> = {
    draft: 'Draft',
    pending_triage: 'Pending Triage',
    ready_to_commit: 'Ready to Commit',
    committed: 'Committed',
    under_investigation: 'Under Investigation',
    capa_assigned: 'CAPA Assigned',
    closed: 'Closed',
  }
  return labels[status] || status
}

export const getStatusColor = (status: ComplaintStatus): string => {
  const colors: Record<ComplaintStatus, string> = {
    draft: 'text-gray-500 bg-gray-100',
    pending_triage: 'text-amber-700 bg-amber-50 border border-amber-200',
    ready_to_commit: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    committed: 'text-indigo-700 bg-indigo-50 border border-indigo-200',
    under_investigation: 'text-blue-700 bg-blue-50 border border-blue-200',
    capa_assigned: 'text-purple-700 bg-purple-50 border border-purple-200',
    closed: 'text-gray-600 bg-gray-100 border border-gray-200',
  }
  return colors[status] || 'text-gray-500 bg-gray-100'
}

export const getSeverityColor = (severity?: string | null): string => {
  switch (severity) {
    case 'Critical': return 'text-red-700 bg-red-50 border border-red-200'
    case 'Major': return 'text-orange-700 bg-orange-50 border border-orange-200'
    case 'Minor': return 'text-yellow-700 bg-yellow-50 border border-yellow-200'
    default: return 'text-gray-500 bg-gray-100'
  }
}

export const getSeverityDot = (severity?: string | null): string => {
  switch (severity) {
    case 'Critical': return 'bg-red-500'
    case 'Major': return 'bg-orange-500'
    case 'Minor': return 'bg-yellow-500'
    default: return 'bg-gray-400'
  }
}

export const formatFieldName = (field: string): string => {
  return field
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export const truncate = (str: string, maxLen: number): string =>
  str.length > maxLen ? str.slice(0, maxLen) + '...' : str

export const getConfidenceColor = (score: number): string => {
  if (score >= 0.8) return 'text-emerald-600'
  if (score >= 0.6) return 'text-amber-600'
  return 'text-red-500'
}

export const getConfidenceLabel = (score: number): string => {
  if (score >= 0.9) return 'High'
  if (score >= 0.7) return 'Medium'
  if (score >= 0.5) return 'Low'
  return 'Very Low'
}
