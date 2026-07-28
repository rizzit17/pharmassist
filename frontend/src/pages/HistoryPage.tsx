import React, { useState } from 'react'
import { History, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'

export default function HistoryPage() {
  const navigate = useNavigate()
  const messages = useAppSelector((s) => s.chat.messages)
  const sessionId = useAppSelector((s) => s.chat.sessionId)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session &amp; Chat History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">LangGraph checkpointer session logs</p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Active Session: <span className="font-mono text-xs font-normal text-primary-600">{sessionId || 'Current Live Thread'}</span>
              </p>
              <p className="text-xs text-gray-500">{messages.length} messages exchanged in this session</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/copilot')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Open Copilot
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          {messages.map((m, idx) => (
            <div key={m.id || idx} className="p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-100 dark:border-dark-border">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-1">
                <span className="uppercase">{m.role}</span>
                <span>{formatDate(m.timestamp)}</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{m.content || '[File / Processing message]'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
