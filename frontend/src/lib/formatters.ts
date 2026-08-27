import type { ComplaintStatus } from '@/types/complaint'

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
    draft: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
    pending_triage: 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300',
    ready_to_commit: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300',
    committed: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300',
    under_investigation: 'text-cyan-700 bg-cyan-50 dark:bg-cyan-950/50 dark:text-cyan-300',
    capa_assigned: 'text-purple-700 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300',
    closed: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
  }
  return colors[status] || 'text-slate-500 bg-slate-100'
}

export const getSeverityColor = (severity?: string | null): string => {
  switch (severity) {
    case 'Critical':
      return 'text-red-700 bg-red-50 dark:bg-red-950/60 dark:text-red-300'
    case 'Major':
      return 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300'
    case 'Minor':
      return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300'
    default:
      return 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
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
