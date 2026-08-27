import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { applyAIResponse, resetDraft, markCommitted, setIsCommitting } from '@/features/complaints/complaintSlice'
import { addUserMessage, addProcessingIndicator, addAssistantMessage, setProcessingError, addFileProgressMessage } from '@/features/copilot/chatSlice'
import { copilotApi, complaintsApi } from '@/lib/api'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  Send, Paperclip, RotateCcw, CheckCircle,
  AlertTriangle, ChevronDown, Bot, Sparkles, FileText
} from 'lucide-react'
import type { ChatMessage } from '@/types/copilot'

// ── Form Input Field ──────────────────────────────────────────────
function FormField({
  label, value, placeholder, type = 'text', options, isTextarea, isMonospace = false
}: {
  label: string
  value?: string
  placeholder: string
  fieldName?: string
  type?: string
  options?: string[]
  isTextarea?: boolean
  isMonospace?: boolean
}) {
  const isEmpty = !value

  const inputClass = cn(
    'w-full px-3 py-2 text-xs rounded-lg border transition-colors outline-none',
    'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    isMonospace && 'font-mono',
    isEmpty ? 'text-slate-400 placeholder:text-slate-400 italic' : 'text-slate-900 dark:text-white font-medium'
  )

  if (options) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <div className="relative">
          <select
            className={cn(inputClass, 'appearance-none pr-8 cursor-not-allowed')}
            value={value || ''}
            disabled
          >
            <option value="" className="text-slate-400 italic">{placeholder}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    )
  }

  if (isTextarea) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <textarea
          className={cn(inputClass, 'resize-none h-24 leading-relaxed font-sans')}
          value={value || ''}
          placeholder={placeholder}
          readOnly
        />
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
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

// ── Chat Message Bubble ───────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.isProcessing) {
    return (
      <div className="flex items-start gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5" />
        </div>
        <div className="card px-3.5 py-2.5 max-w-xs text-xs">
          {msg.progressValue !== undefined ? (
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Analyzing document ({msg.progressValue}%)
              </p>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${msg.progressValue}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-slate-500">Processing input...</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (msg.isFileUpload) {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 max-w-xs">
          <FileText className="w-4 h-4 text-indigo-200" />
          <span className="truncate">{msg.attachedFileName}</span>
        </div>
      </div>
    )
  }

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-indigo-600 text-white px-3.5 py-2.5 rounded-xl rounded-tr-none text-xs leading-relaxed max-w-sm">
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 mb-3">
      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="card px-3.5 py-2.5 rounded-xl rounded-tl-none text-xs leading-relaxed max-w-sm text-slate-800 dark:text-slate-200">
        <p className="whitespace-pre-wrap">{msg.content ? msg.content.replace(/\*\*/g, '') : ''}</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export default function NewComplaintPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const draft = useAppSelector((s) => s.complaint.draft)
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
      dispatch(setProcessingError(err.message || 'AI service unavailable.'))
    }
  }

  const handleFileUpload = useCallback(async (file: File) => {
    dispatch(addUserMessage({ content: `[Uploaded: ${file.name}]`, attachedFileName: file.name }))
    dispatch(addFileProgressMessage({ fileName: file.name, progress: 20 }))

    try {
      const res = await copilotApi.upload(file, sessionId || undefined)
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
      dispatch(setProcessingError(err.message || 'File processing failed.'))
    }
  }, [dispatch, sessionId])

  const { inputRef, handleFileInput, handleDrop, handleDragOver, openFilePicker } = useFileUpload(
    handleFileUpload,
    { onError: (msg) => dispatch(setProcessingError(msg)) }
  )

  const handleCommit = async () => {
    dispatch(setIsCommitting(true))
    try {
      const complaint = await complaintsApi.create({
        ...draft,
        status: 'committed',
        risk_assessment: riskAssessment || undefined,
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

  return (
    <div className="h-full flex flex-col">
      {/* Mobile tab switcher */}
      <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101420]">
        {(['form', 'copilot'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-3 text-xs font-semibold transition-colors',
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500'
            )}
          >
            {tab === 'form' ? 'Complaint Form' : 'AI Copilot'}
          </button>
        ))}
      </div>

      {/* Two-pane layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE - Clean Complaint Form */}
        <div className={cn(
          'flex flex-col w-full lg:w-[56%] border-r border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0C0F17] overflow-y-auto',
          activeTab !== 'form' && 'hidden lg:flex'
        )}>
          {/* Form header */}
          <div className="px-6 py-4 bg-white dark:bg-[#101420] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Log New Complaint
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Fields are automatically populated by AI Copilot on the right
              </p>
            </div>
            {riskAssessment?.severity && (
              <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold', {
                'text-red-700 bg-red-50 dark:bg-red-950/60 dark:text-red-300': riskAssessment.severity === 'Critical',
                'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300': riskAssessment.severity === 'Major',
                'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300': riskAssessment.severity === 'Minor',
              })}>
                {riskAssessment.severity}
              </span>
            )}
          </div>

          {/* Form body */}
          <div className="flex-1 p-6 space-y-4">
            {duplicateWarning?.found && (
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Possible Duplicate Complaint</p>
                  {duplicateWarning.candidates?.map((c) => (
                    <p key={c.complaint_id} className="mt-0.5">
                      Matches record <span className="font-mono font-bold">{c.complaint_number}</span> ({Math.round(c.similarity_score * 100)}% match)
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Section 1: Customer & Origin */}
            <div className="card p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                1. Customer &amp; Source
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label="Channel"
                  value={draft.source}
                  placeholder="Awaiting extraction…"
                  options={['Pharmacy', 'Hospital', 'Distributor', 'Email', 'Direct Customer', 'Regulatory Body']}
                />
                <FormField
                  label="Reporting Customer"
                  value={draft.customer_name}
                  placeholder="Awaiting extraction…"
                />
              </div>
            </div>

            {/* Section 2: Product & Batch */}
            <div className="card p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                2. Product &amp; Batch
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Product Name" value={draft.product_name} placeholder="Awaiting extraction…" />
                <FormField label="Strength / Dosage" value={draft.product_strength} placeholder="Awaiting extraction…" />
                <FormField label="Batch / Lot Number" value={draft.batch_lot_number} placeholder="Awaiting extraction…" isMonospace />
                <FormField label="Affected Quantity" value={draft.affected_quantity} placeholder="Awaiting extraction…" isMonospace />
                <FormField label="Manufacturing Date" value={draft.manufacturing_date} placeholder="Awaiting extraction…" type="date" />
                <FormField label="Expiry Date" value={draft.expiry_date} placeholder="Awaiting extraction…" type="date" />
              </div>
            </div>

            {/* Section 3: Facility & Packaging */}
            <div className="card p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                3. Facility &amp; Packaging
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Site Block" value={draft.originating_site_block} placeholder="Awaiting extraction…" />
                <FormField label="Packaging Material (NPM)" value={draft.impacted_npm} placeholder="Awaiting extraction…" />
              </div>
            </div>

            {/* Section 4: Defect Description */}
            <div className="card p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                4. Defect Details
              </h2>
              <div className="space-y-3">
                <FormField label="Category" value={draft.complaint_category} placeholder="Awaiting classification…" />
                <FormField
                  label="Description"
                  value={draft.complaint_description}
                  placeholder="AI will synthesize complaint narrative here…"
                  isTextarea
                />
              </div>
            </div>

            {/* Risk Assessment Card */}
            {riskAssessment && (
              <div className="card p-4 space-y-2.5 bg-slate-50 dark:bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    AI Risk Assessment
                  </span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Severity: {riskAssessment.severity || '—'}
                  </span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                  <p><span className="font-semibold text-slate-900 dark:text-white">Action:</span> {riskAssessment.suggested_next_action}</p>
                  <p><span className="font-semibold text-slate-900 dark:text-white">Assessment:</span> {riskAssessment.initial_risk_assessment}</p>
                </div>
              </div>
            )}
          </div>

          {/* Form footer */}
          <div className="px-6 py-3 bg-white dark:bg-[#101420] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between sticky bottom-0 z-10">
            <Button variant="ghost" size="sm" onClick={handleReset} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Reset
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCommit}
              isLoading={isCommitting}
              disabled={!canCommit}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Commit Complaint
            </Button>
          </div>
        </div>

        {/* RIGHT PANE - AI Copilot */}
        <div className={cn(
          'flex flex-col w-full lg:w-[44%] bg-white dark:bg-[#101420] overflow-hidden',
          activeTab !== 'copilot' && 'hidden lg:flex'
        )}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Copilot Assistant
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              {isProcessing ? 'Thinking…' : 'Ready'}
            </span>
          </div>

          {/* Messages Feed */}
          <div
            ref={chatEndRef}
            className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-50/50 dark:bg-slate-950/40"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#101420]">
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
                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Attach Document"
              >
                <Paperclip className="w-4 h-4" />
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
                  placeholder="Paste complaint email text, notes, or drop PDF files here…"
                  rows={1}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  style={{ minHeight: '38px' }}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isProcessing}
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                  inputText.trim() && !isProcessing
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
