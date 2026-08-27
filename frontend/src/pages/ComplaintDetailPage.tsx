import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Trash2, Sparkles } from 'lucide-react'
import { complaintsApi, copilotApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getStatusColor, getStatusLabel, getSeverityColor, formatDate, formatDateTime } from '@/lib/formatters'
import type { Complaint, AuditLogOut } from '@/types/complaint'

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [auditTrail, setAuditTrail] = useState<AuditLogOut[]>([])
  const [summary, setSummary] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const [complaintData, auditData] = await Promise.all([
          complaintsApi.get(id),
          complaintsApi.getAuditTrail(id).catch(() => []),
        ])
        setComplaint(complaintData)
        setAuditTrail(auditData)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const handleGenerateSummary = async () => {
    if (!complaint) return
    setIsGeneratingSummary(true)
    try {
      const res = await copilotApi.summary({ complaint_id: complaint.id })
      setSummary(res.summary)
    } catch (err) {
      console.error(err)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!complaint) return
    try {
      const updated = await complaintsApi.update(complaint.id, { status: newStatus as any })
      setComplaint(updated)
      const freshAudit = await complaintsApi.getAuditTrail(complaint.id).catch(() => [])
      setAuditTrail(freshAudit)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!complaint) return
    if (window.confirm(`Delete complaint record ${complaint.complaint_number}?`)) {
      try {
        await complaintsApi.delete(complaint.id)
        navigate('/complaints')
      } catch (err) {
        console.error(err)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <p className="text-slate-400 font-medium">Complaint record not found.</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/complaints')}>
          Back to Complaints
        </Button>
      </div>
    )
  }

  const latestAnalysis = complaint.ai_analyses?.[complaint.ai_analyses.length - 1]

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/complaints')}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {complaint.complaint_number}
              </h1>
              <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-medium', getStatusColor(complaint.status))}>
                {getStatusLabel(complaint.status)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged {formatDateTime(complaint.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={complaint.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500"
          >
            {['draft', 'pending_triage', 'ready_to_commit', 'committed', 'under_investigation', 'capa_assigned', 'closed'].map((s) => (
              <option key={s} value={s}>{getStatusLabel(s as any)}</option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Product Info */}
          <div className="card p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Product &amp; Batch
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400">Product Name</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{complaint.product_name || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Strength</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{complaint.product_strength || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Batch / Lot Number</p>
                <p className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{complaint.batch_lot_number || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Affected Quantity</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">{complaint.affected_quantity || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Manufacturing Date</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{formatDate(complaint.manufacturing_date)}</p>
              </div>
              <div>
                <p className="text-slate-400">Expiry Date</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{formatDate(complaint.expiry_date)}</p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="card p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Customer &amp; Origin
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-400">Customer Name</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{complaint.customer_name || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Channel</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{complaint.source || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Site Block</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{complaint.originating_site_block || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Packaging Material (NPM)</p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{complaint.impacted_npm || '—'}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card p-5 space-y-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Complaint Description
            </h2>
            <p className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {complaint.complaint_description || 'No description provided.'}
            </p>
          </div>

          {/* Audit Trail */}
          <div className="card p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Audit Trail (21 CFR Part 11)
            </h2>
            <div className="space-y-2.5">
              {auditTrail.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      <span className="font-semibold">{entry.action_type || 'Update'}</span> by {entry.actor_name || entry.actor || 'QA Officer'}
                      {entry.field_name && <span className="text-slate-400 ml-1">({entry.field_name})</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">{formatDateTime(entry.created_at)}</p>
                  </div>
                </div>
              ))}
              {auditTrail.length === 0 && (
                <p className="text-xs text-slate-400 italic">Initial record created.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Risk Assessment & Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {latestAnalysis && (
            <div className="card p-5 space-y-3 bg-indigo-50/40 dark:bg-indigo-950/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  AI Risk Assessment
                </span>
                <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold', getSeverityColor(latestAnalysis.severity))}>
                  {latestAnalysis.severity || '—'}
                </span>
              </div>

              {latestAnalysis.regulatory_reportable && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  Potential regulatory reportable event
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-slate-500 font-medium">Suggested Action</p>
                  <p className="text-slate-900 dark:text-white font-medium mt-0.5">{latestAnalysis.suggested_next_action || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Risk Assessment</p>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{latestAnalysis.initial_risk_assessment || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Executive Summary */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Executive Briefing
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateSummary}
                isLoading={isGeneratingSummary}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Generate
              </Button>
            </div>

            {summary ? (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {summary}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                Click "Generate" to synthesize an executive summary.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
