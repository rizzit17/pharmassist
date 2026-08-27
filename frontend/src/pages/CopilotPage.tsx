import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Paperclip, Sparkles, ArrowRight } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { addUserMessage, addProcessingIndicator, addAssistantMessage, setProcessingError, addFileProgressMessage } from '@/features/copilot/chatSlice'
import { applyAIResponse } from '@/features/complaints/complaintSlice'
import { copilotApi } from '@/lib/api'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export default function CopilotPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const messages = useAppSelector((s) => s.chat.messages)
  const isProcessing = useAppSelector((s) => s.chat.isProcessing)
  const sessionId = useAppSelector((s) => s.complaint.sessionId)
  const draft = useAppSelector((s) => s.complaint.draft)

  const [input, setInput] = useState('')
  const chatEndRef = useAutoScroll<HTMLDivElement>([messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isProcessing) return

    setInput('')
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
      dispatch(setProcessingError(err.message || 'Error processing request.'))
    }
  }

  const handleFileUpload = async (file: File) => {
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
  }

  const { inputRef, handleFileInput, handleDrop, handleDragOver, openFilePicker } = useFileUpload(
    handleFileUpload,
    { onError: (msg) => dispatch(setProcessingError(msg)) }
  )

  const quickPrompts = [
    'Analyze batch dissolution failure for Metformin 500mg (Lot #MET-2024-09)',
    'Synthesize email regarding broken seal ampoules in Ciprofloxacin batch',
    'Evaluate regulatory reportability under 21 CFR 211 for particulate contamination',
  ]

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-5 sm:p-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Copilot Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive defect extraction and regulatory risk assessment
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={() => navigate('/complaints/new')}
        >
          Open Form
        </Button>
      </div>

      {/* Chat Card */}
      <div
        className="flex-1 card overflow-hidden flex flex-col"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* Messages */}
        <div ref={chatEndRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40 dark:bg-slate-950/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-xl px-4 py-3 rounded-xl text-xs sm:text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                    : 'card rounded-tl-none text-slate-800 dark:text-slate-200'
                )}
              >
                {msg.isProcessing ? (
                  <div className="flex items-center gap-2 py-1 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                    <span>Analyzing complaint details…</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content ? msg.content.replace(/\*\*/g, '') : ''}</p>
                )}
              </div>
            </div>
          ))}

          {messages.length <= 1 && (
            <div className="pt-8 text-center max-w-md mx-auto">
              <Sparkles className="w-8 h-8 text-indigo-500/40 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500 mb-3">
                Suggested Prompts
              </p>
              <div className="space-y-2">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(q)}
                    className="w-full text-left text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition-colors"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#101420]">
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
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Attach document"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask Copilot or paste complaint text…"
                rows={1}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none text-slate-900 dark:text-white"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              disabled={!input.trim() || isProcessing}
              onClick={handleSend}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
