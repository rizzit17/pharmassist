import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Paperclip, Zap, FlaskConical, ArrowRight, Shield } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { addUserMessage, addProcessingIndicator, addAssistantMessage, setProcessingError, addFileProgressMessage } from '@/features/copilot/chatSlice'
import { applyAIResponse } from '@/features/complaints/complaintSlice'
import { copilotApi } from '@/lib/api'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export default function CopilotPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const messages = useAppSelector((s) => s.chat.messages)
  const isProcessing = useAppSelector((s) => s.chat.isProcessing)
  const sessionId = useAppSelector((s) => s.chat.sessionId)
  const draft = useAppSelector((s) => s.complaint.draft)

  const [inputText, setInputText] = useState('')
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

  const handleFileUpload = async (file: File) => {
    dispatch(addUserMessage({ content: `[Uploading: ${file.name}]`, attachedFileName: file.name }))
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
      dispatch(setProcessingError(err.message || 'File upload failed.'))
    }
  }

  const { inputRef, handleFileInput, handleDrop, handleDragOver, openFilePicker } = useFileUpload(
    handleFileUpload,
    { onError: (msg) => dispatch(setProcessingError(msg)) }
  )

  const hasExtractedFields = Object.keys(draft).length > 0

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header card */}
      <div className="card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border p-1.5 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="AIVOA Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-[#0F0E17] dark:text-white">Full-Screen AI Copilot</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Natural language complaint extraction &amp; QA assistant</p>
          </div>
        </div>

        {hasExtractedFields && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/complaints/new')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Review Extracted Form
          </Button>
        )}
      </div>

      {/* Chat window */}
      <div
        ref={chatEndRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex-1 card p-4 overflow-y-auto space-y-4 mb-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex items-start gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
            )}

            <div
              className={cn(
                'px-4 py-3 rounded-2xl max-w-lg text-sm shadow-sm',
                msg.role === 'user'
                  ? 'chat-bubble-user'
                  : 'chat-bubble-ai text-gray-800 dark:text-dark-text-bright'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="card p-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.eml,.txt,.png,.jpg,.jpeg"
          onChange={handleFileInput}
        />

        <button
          onClick={openFilePicker}
          className="p-2.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
          title="Upload document"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
          placeholder="Describe a complaint or ask a QMS question..."
          rows={1}
          className="flex-1 px-3 py-2 text-sm bg-transparent border-none outline-none resize-none dark:text-white placeholder-gray-400 max-h-32"
        />

        <button
          onClick={handleSendMessage}
          disabled={!inputText.trim() || isProcessing}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
            inputText.trim() && !isProcessing
              ? 'bg-gradient-to-br from-primary-600 to-violet-600 text-white hover:scale-105'
              : 'bg-gray-100 dark:bg-dark-border text-gray-400 cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
