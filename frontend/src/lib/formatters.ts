import type { ComplaintStatus, SeverityLevel } from '@/types/complaint'

export const formatDate = (date?: string | null): string => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const formatDateTime = (date?: string | null): string => {
  if (!date) return '-'
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
    draft: 'text-gray-600 bg-gray-100 border border-gray-200',
    pending_triage: 'text-[#B7791F] bg-[#FEF6E7] border border-[#F5A524]/30',
    ready_to_commit: 'text-[#1C9A4B] bg-[#E9F9EE] border border-[#22C55E]/30',
    committed: 'text-[#2563EB] bg-[#EBF3FF] border border-[#3B82F6]/30',
    under_investigation: 'text-[#B7791F] bg-[#FEF6E7] border border-[#F5A524]/30',
    capa_assigned: 'text-[#5B4FE9] bg-[#E8E6FD] border border-[#5B4FE9]/30',
    closed: 'text-gray-600 bg-gray-100 border border-gray-200',
  }
  return colors[status] || 'text-gray-500 bg-gray-100'
}

export const getSeverityColor = (severity?: string | null): string => {
  switch (severity) {
    case 'Critical': return 'text-[#C0392B] bg-[#FDEDEC] border border-[#E74C3C]/30'
    case 'Major': return 'text-[#B7791F] bg-[#FEF6E7] border border-[#F5A524]/30'
    case 'Minor': return 'text-[#2563EB] bg-[#EBF3FF] border border-[#3B82F6]/30'
    default: return 'text-gray-500 bg-gray-100'
  }
}

export const getSeverityDot = (severity?: string | null): string => {
  switch (severity) {
    case 'Critical': return 'bg-[#E74C3C]'
    case 'Major': return 'bg-[#F5A524]'
    case 'Minor': return 'bg-[#3B82F6]'
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
  if (score >= 0.8) return 'text-[#1C9A4B]'
  if (score >= 0.6) return 'text-[#B7791F]'
  return 'text-[#C0392B]'
}

export const getConfidenceLabel = (score: number): string => {
  if (score >= 0.9) return 'High'
  if (score >= 0.7) return 'Medium'
  if (score >= 0.5) return 'Low'
  return 'Very Low'
}
