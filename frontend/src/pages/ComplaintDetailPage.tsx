import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Clock, User, Bot, CheckCircle2, AlertTriangle, ChevronRight, Trash2 } from 'lucide-react'
import { complaintsApi, copilotApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getStatusColor, getStatusLabel, getSeverityColor, formatDate, formatDateTime } from '@/lib/formatters'
import type { Complaint, AuditLogOut } from '@/types/complaint'

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white mt-0.5">{value || '—'}</p>
    </div>
  )
}

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [auditTrail, setAuditTrail] = useState<AuditLogOut[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const [c, audit] = await Promise.all([
          complaintsApi.get(id),
          complaintsApi.getAuditTrail(id),
        ])
        setComplaint(c)
        setAuditTrail(audit)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const handleGenerateSummary = async () => {
    if (!id) return
    setIsSummaryLoading(true)
    try {
      const res = await copilotApi.summary({ complaint_id: id })
      setSummary(res.summary)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSummaryLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !complaint) return
    if (window.confirm(`Are you sure you want to delete complaint ${complaint.complaint_number}?`)) {
      try {
        await complaintsApi.delete(id)
        navigate('/complaints')
      } catch (err) {
        console.error('Delete failed:', err)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}
          </div>
          <div className="card p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Complaint not found.</p>
        <Button variant="ghost" onClick={() => navigate('/complaints')} className="mt-4">← Back to list</Button>
      </div>
    )
  }

  const latestAnalysis = complaint.ai_analyses?.[complaint.ai_analyses.length - 1]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/complaints')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{complaint.complaint_number}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{complaint.product_name} · {complaint.customer_name}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className={cn('text-xs px-3 py-1 rounded-full font-medium', getStatusColor(complaint.status))}>
            {getStatusLabel(complaint.status)}
          </span>
          {latestAnalysis?.severity && (
            <span className={cn('text-xs px-3 py-1 rounded-full font-medium', getSeverityColor(latestAnalysis.severity))}>
              {latestAnalysis.severity}
            </span>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Record
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main fields */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Origin & Customer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Source" value={complaint.source} />
              <Field label="Customer" value={complaint.customer_name} />
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Product & Batch</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product Name" value={complaint.product_name} />
              <Field label="Strength / Grade" value={complaint.product_strength} />
              <Field label="Batch / Lot" value={complaint.batch_lot_number} />
              <Field label="Affected Quantity" value={complaint.affected_quantity} />
              <Field label="Manufacturing Date" value={formatDate(complaint.manufacturing_date)} />
              <Field label="Expiry Date" value={formatDate(complaint.expiry_date)} />
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Defect Analysis</h3>
            <div className="space-y-3">
              <Field label="Complaint Category" value={complaint.complaint_category} />
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{complaint.complaint_description || '—'}</p>
              </div>
            </div>
          </div>

          {/* Executive summary */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Executive Summary</h3>
              <Button variant="outline" size="sm" isLoading={isSummaryLoading} onClick={handleGenerateSummary}>
                Generate AI Summary
              </Button>
            </div>
            {summary ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
              >
                {summary}
              </motion.p>
            ) : (
              <p className="text-sm text-gray-400 italic">Click "Generate AI Summary" to create an executive summary.</p>
            )}
          </div>
        </div>

        {/* Sidebar: Risk + Audit trail */}
        <div className="space-y-5">
          {/* Risk Assessment */}
          {latestAnalysis && (
            <div className="risk-assessment-card">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Risk Assessment</span>
              </div>
              <div className="space-y-3">
                {latestAnalysis.regulatory_reportable && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
                    <AlertTriangle className="w-3 h-3" />
                    May require regulatory notification
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Suggested Action</p>
                  <p className="text-xs text-gray-800 dark:text-gray-200">{latestAnalysis.suggested_next_action}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Risk Narrative</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{latestAnalysis.initial_risk_assessment}</p>
                </div>
                {latestAnalysis.capa_suggestions && latestAnalysis.capa_suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">CAPA Steps</p>
                    <ul className="space-y-1">
                      {latestAnalysis.capa_suggestions.map((step: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit trail */}
          <div className="card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Audit Trail
            </h3>
            {auditTrail.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No audit events yet.</p>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((log, i) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-100 dark:bg-dark-border">
                      {log.actor === 'ai'
                        ? <Bot className="w-3 h-3 text-primary-600" />
                        : <User className="w-3 h-3 text-gray-600" />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                        {log.action_type.replace(/_/g, ' ')}
                        {log.field_name && <span className="text-gray-500"> · {log.field_name.replace(/_/g, ' ')}</span>}
                      </p>
                      {log.old_value && log.new_value && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="line-through">{String(log.old_value).slice(0, 30)}</span>
                          {' → '}
                          <span className="text-emerald-600">{String(log.new_value).slice(0, 30)}</span>
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
