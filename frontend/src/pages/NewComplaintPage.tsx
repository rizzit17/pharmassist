import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { applyAIResponse, resetDraft, markCommitted, setIsCommitting } from '@/features/complaints/complaintSlice'
import { addUserMessage, addProcessingIndicator, addAssistantMessage, setProcessingError, addFileProgressMessage } from '@/features/copilot/chatSlice'
import { copilotApi, complaintsApi } from '@/lib/api'
import { useHighlightOnChange } from '@/hooks/useHighlightOnChange'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  Shield, Send, Paperclip, RotateCcw, CheckCircle,
  AlertTriangle, Info, FileText, ChevronDown, Zap, FlaskConical
} from 'lucide-react'
import type { ChatMessage } from '@/types/copilot'

// ── Field component with AI highlight ─────────────────────────────
function FormField({
  label, value, placeholder, updatedFields, fieldName, type = 'text', options, isTextarea
}: {
  label: string
  value?: string
  placeholder: string
  updatedFields: string[]
  fieldName: string
  type?: string
  options?: string[]
  isTextarea?: boolean
}) {
  const isHighlighted = useHighlightOnChange(fieldName, updatedFields)
  const isEmpty = !value

  const inputClass = cn(
    'w-full px-3 py-2 text-sm rounded-lg border transition-all duration-300 outline-none',
    'dark:bg-dark-bg dark:text-dark-text-bright',
    isHighlighted
      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500'
      : 'bg-white border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-dark-border',
    isEmpty ? 'text-gray-400 italic' : 'text-gray-900'
  )

  if (options) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
        <div className="relative">
          <select
            className={cn(inputClass, 'appearance-none pr-8')}
            value={value || ''}
            disabled
          >
            <option value="" className="text-gray-400 italic">{placeholder}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
    )
  }

  if (isTextarea) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
        <textarea
          className={cn(inputClass, 'resize-none h-24')}
          value={value || ''}
          placeholder={placeholder}
          readOnly
        />
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        className={inputClass}
        value={value || ''}
        placeholder={placeholder}
        readOnly
      />
    </div>
  )
}

// ── Status Pill ──────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const configs = {
    pending_triage: { label: 'Pending Triage', cls: 'pill-pending', dot: 'bg-amber-500' },
    ready_to_commit: { label: 'Ready to Commit', cls: 'pill-ready', dot: 'bg-emerald-500' },
    committed: { label: 'Committed', cls: 'pill-committed', dot: 'bg-indigo-500' },
    draft: { label: 'Draft', cls: 'text-gray-500 bg-gray-100 border border-gray-200 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', dot: 'bg-gray-400' },
  }
  const cfg = configs[status as keyof typeof configs] || configs.draft
  return (
    <span className={cfg.cls}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ── Chat Message Bubble ───────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.isProcessing) {
    return (
      <div className="flex items-start gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="chat-bubble-ai px-4 py-3 max-w-xs">
          {msg.progressValue !== undefined ? (
            <div>
              <p className="text-xs text-gray-600 mb-2">Processing document...</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="progress-bar-fill h-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${msg.progressValue}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{msg.progressValue}%</p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 py-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (msg.isFileUpload) {
    return (
      <div className="flex justify-end mb-4">
        <div className="chat-bubble-user px-4 py-3 max-w-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-white">{msg.attachedFileName}</p>
              <p className="text-xs text-white/70">PDF Document</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="chat-bubble-user px-4 py-3 max-w-sm">
          <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Zap className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="chat-bubble-ai px-4 py-3 max-w-sm">
        <p className="text-sm text-gray-800 dark:text-dark-text-bright whitespace-pre-wrap">
          {msg.content ? msg.content.replace(/\*\*/g, '') : ''}
        </p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function NewComplaintPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const draft = useAppSelector((s) => s.complaint.draft)
  const updatedFields = useAppSelector((s) => s.complaint.updatedFields)
  const statusPill = useAppSelector((s) => s.complaint.statusPill)
  const riskAssessment = useAppSelector((s) => s.complaint.riskAssessment)
  const completeness = useAppSelector((s) => s.complaint.completeness)
  const duplicateWarning = useAppSelector((s) => s.complaint.duplicateWarning)
  const sessionId = useAppSelector((s) => s.complaint.sessionId)
  const isCommitting = useAppSelector((s) => s.complaint.isCommitting)
  const messages = useAppSelector((s) => s.chat.messages)
  const isProcessing = useAppSelector((s) => s.chat.isProcessing)

  const [inputText, setInputText] = useState('')
  const [activeTab, setActiveTab] = useState<'form' | 'copilot'>('form')
  const chatEndRef = useAutoScroll<HTMLDivElement>([messages])

  const handleSendMessage = async () => {
    const text = inputText.trim()
    if (!text || isProcessing) return

    setInputText('')
    dispatch(addUserMessage({ content: text }))
    dispatch(addProcessingIndicator())

    try {
      const res = await copilotApi.chat({
        message: text,
        session_id: sessionId || undefined,
        current_complaint: draft,
      })

      dispatch(applyAIResponse({
        complaint: res.complaint || {},
        updated_fields: res.updated_fields,
        confidence_scores: res.confidence_scores,
        risk_assessment: res.risk_assessment || undefined,
        recommendations: res.recommendations || undefined,
        completeness: res.completeness || undefined,
        duplicate_warning: res.duplicate_warning || undefined,
        session_id: res.session_id,
      }))
      dispatch(addAssistantMessage(res.assistant_message))
    } catch (err: any) {
      dispatch(setProcessingError(err.message || 'AI service unavailable. Please try again.'))
    }
  }

  const handleFileUpload = useCallback(async (file: File) => {
    dispatch(addUserMessage({ content: `[Uploading: ${file.name}]`, attachedFileName: file.name }))
    dispatch(addFileProgressMessage({ fileName: file.name, progress: 10 }))

    try {
      // Simulate progress
      const progressTimer = setInterval(() => {
        dispatch(addFileProgressMessage({ fileName: file.name, progress: Math.min(90, Math.random() * 30 + 30) }))
      }, 800)

      const res = await copilotApi.upload(file, sessionId || undefined)
      clearInterval(progressTimer)

      dispatch(applyAIResponse({
        complaint: res.complaint || {},
        updated_fields: res.updated_fields,
        confidence_scores: res.confidence_scores,
        risk_assessment: res.risk_assessment || undefined,
        recommendations: res.recommendations || undefined,
        completeness: res.completeness || undefined,
        duplicate_warning: res.duplicate_warning || undefined,
        session_id: res.session_id,
      }))
      dispatch(addAssistantMessage(res.assistant_message))
    } catch (err: any) {
      dispatch(setProcessingError(err.message || 'File processing failed. Please try again.'))
    }
  }, [dispatch, sessionId])

  const { inputRef, handleFileInput, handleDrop, handleDragOver, openFilePicker } = useFileUpload(
    handleFileUpload,
    {
      onError: (msg) => dispatch(setProcessingError(msg))
    }
  )

  const handleCommit = async () => {
    dispatch(setIsCommitting(true))
    try {
      const complaint = await complaintsApi.create({
        ...draft,
        status: 'committed',
      })
      dispatch(markCommitted())
      navigate(`/complaints/${complaint.id}`)
    } catch (err: any) {
      console.error('Commit failed:', err)
    } finally {
      dispatch(setIsCommitting(false))
    }
  }

  const handleReset = () => {
    dispatch(resetDraft())
  }

  const canCommit = completeness?.is_complete && !!riskAssessment?.severity

  // Severity badge
  const severityColors: Record<string, string> = {
    Critical: 'text-red-700 bg-red-50 border border-red-200',
    Major: 'text-orange-700 bg-orange-50 border border-orange-200',
    Minor: 'text-yellow-700 bg-yellow-50 border border-yellow-200',
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile tab switcher */}
      <div className="lg:hidden flex border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
        {(['form', 'copilot'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-3 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab === 'form' ? '📋 Form' : '🤖 Copilot'}
          </button>
        ))}
      </div>

      {/* Two-pane layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE — Complaint Form */}
        <div className={cn(
          'flex flex-col w-full lg:w-[55%] border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface overflow-y-auto',
          activeTab !== 'form' && 'hidden lg:flex'
        )}>
          {/* Form header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-dark-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Log Customer Complaint</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">API & FDF Quality Assurance Module</p>
              </div>
              <StatusPill status={statusPill} />
            </div>
          </div>

          {/* Form body */}
          <div className="flex-1 px-6 py-5 space-y-6">
            {/* Duplicate warning */}
            {duplicateWarning?.found && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Possible duplicate detected</p>
                  {duplicateWarning.candidates?.map((c) => (
                    <p key={c.complaint_id} className="text-xs text-amber-700 mt-1">
                      {c.complaint_number} — {(c.similarity_score * 100).toFixed(0)}% similar
                    </p>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Section 1: Origin & Customer Details */}
            <div>
              <p className="section-header">1. Origin &amp; Customer Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label="Complaint Source"
                  value={draft.source}
                  placeholder="Awaiting AI extraction…"
                  updatedFields={updatedFields}
                  fieldName="source"
                  options={['Pharmacy', 'Hospital', 'Distributor', 'Email', 'Direct Customer', 'Regulatory Body']}
                />
                <FormField
                  label="Customer Name"
                  value={draft.customer_name}
                  placeholder="Awaiting AI extraction…"
                  updatedFields={updatedFields}
                  fieldName="customer_name"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-dark-border" />

            {/* Section 2: Product & Batch Identification */}
            <div>
              <p className="section-header">2. Product &amp; Batch Identification</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Product Name (API/FDF)" value={draft.product_name} placeholder="Awaiting AI extraction…" updatedFields={updatedFields} fieldName="product_name" />
                <FormField label="Product Strength / Grade" value={draft.product_strength} placeholder="Awaiting AI extraction…" updatedFields={updatedFields} fieldName="product_strength" />
                <FormField label="Batch / Lot Number" value={draft.batch_lot_number} placeholder="Awaiting AI extraction…" updatedFields={updatedFields} fieldName="batch_lot_number" />
                <FormField label="Affected Quantity" value={draft.affected_quantity} placeholder="Awaiting AI extraction…" updatedFields={updatedFields} fieldName="affected_quantity" />
                <FormField label="Manufacturing Date" value={draft.manufacturing_date} placeholder="Awaiting AI extraction…" updatedFields={updatedFields} fieldName="manufacturing_date" type="date" />
                <FormField label="Expiry Date" value={draft.expiry_date} placeholder="Awaiting AI extraction…" updatedFields={updatedFields} fieldName="expiry_date" type="date" />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-dark-border" />

            {/* Section 3: Facility & Material Impact */}
            <div>
              <p className="section-header">3. Facility &amp; Material Impact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Originating Site Block" value={draft.originating_site_block} placeholder="Awaiting AI extraction…" updatedFields={updatedFields} fieldName="originating_site_block" />
                <FormField label="Impacted Non-Product Materials (NPM)" value={draft.impacted_npm} placeholder="e.g. Primary packaging…" updatedFields={updatedFields} fieldName="impacted_npm" />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-dark-border" />

            {/* Section 4: Defect Analysis */}
            <div>
              <p className="section-header">4. Defect Analysis</p>
              <div className="space-y-3">
                <FormField label="Complaint Category" value={draft.complaint_category} placeholder="Awaiting AI classification…" updatedFields={updatedFields} fieldName="complaint_category" />
                <FormField
                  label="Complaint Description / Structured Defect Summary"
                  value={draft.complaint_description}
                  placeholder="AI will synthesize the complaint into a formal QMS description…"
                  updatedFields={updatedFields}
                  fieldName="complaint_description"
                  isTextarea
                />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-dark-border" />

            {/* AI Risk Assessment Card */}
            {riskAssessment ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="risk-assessment-card"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-primary-600" />
                  <span className="text-xs font-bold tracking-widest uppercase text-primary-700 dark:text-dark-accent">
                    AI Copilot Risk Assessment
                  </span>
                  <span className={cn(
                    'ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full',
                    severityColors[riskAssessment.severity || ''] || 'text-gray-500 bg-gray-100'
                  )}>
                    {riskAssessment.severity || '—'}
                  </span>
                </div>

                {riskAssessment.regulatory_reportable && (
                  <div className="flex items-center gap-1.5 mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    May require regulatory notification (MHRA/USFDA) — AI suggestion, requires QA sign-off
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Suggested Next Action</p>
                    <p className="text-sm text-gray-800 dark:text-dark-text-bright">{riskAssessment.suggested_next_action}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Initial Risk Assessment</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{riskAssessment.initial_risk_assessment}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="risk-assessment-card opacity-60">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary-400" />
                  <span className="text-xs font-bold tracking-widest uppercase text-primary-400">AI Copilot Risk Assessment</span>
                </div>
                <p className="text-sm text-gray-400 italic">
                  AI will generate severity classification, risk assessment, and suggested next action after complaint extraction…
                </p>
              </div>
            )}

            {/* Completeness checker */}
            {completeness && !completeness.is_complete && completeness.missing_fields && completeness.missing_fields.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Missing fields</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {completeness.missing_fields.map((f) => (
                      <span key={f} className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleReset} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Reset Form
            </Button>
            <div className="flex-1" />
            <Button
              variant="primary"
              size="md"
              onClick={handleCommit}
              isLoading={isCommitting}
              disabled={!canCommit}
              leftIcon={<CheckCircle className="w-4 h-4" />}
              className={cn(!canCommit && 'opacity-50 cursor-not-allowed')}
            >
              Commit to QMS Ledger
            </Button>
          </div>
        </div>

        {/* RIGHT PANE — AIVOA Copilot */}
        <div className={cn(
          'flex flex-col w-full lg:w-[45%] bg-gray-50 dark:bg-dark-bg overflow-hidden',
          activeTab !== 'copilot' && 'hidden lg:flex'
        )}>
          {/* Chat header */}
          <div className="px-5 py-4 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">AIVOA Copilot</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drop complaint files or paste text below.</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className={cn(
                'w-2 h-2 rounded-full',
                isProcessing ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
              )} />
              <span className="text-xs text-gray-400">{isProcessing ? 'Processing' : 'Ready'}</span>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatEndRef}
            className="flex-1 overflow-y-auto px-4 py-5 space-y-1"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </div>

          {/* Input bar */}
          <div className="px-4 py-4 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border">
            {/* Hidden file input */}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.eml,.txt,.png,.jpg,.jpeg"
              onChange={handleFileInput}
            />

            <div className="flex items-end gap-2">
              <button
                onClick={openFilePicker}
                className="p-2.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                title="Attach file (PDF, email, image)"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Type a message or paste a complaint…"
                  rows={1}
                  className="w-full px-4 py-3 pr-12 text-sm rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg resize-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none dark:text-white placeholder-gray-400 max-h-32 overflow-y-auto"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isProcessing}
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm',
                  inputText.trim() && !isProcessing
                    ? 'bg-gradient-to-br from-primary-600 to-violet-600 text-white hover:shadow-md hover:scale-105'
                    : 'bg-gray-100 dark:bg-dark-border text-gray-400 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <p className="text-center text-xs text-gray-300 dark:text-gray-600 mt-2 tracking-wider">
              POWERED BY LANGGRAPH
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
