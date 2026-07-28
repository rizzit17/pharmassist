import React from 'react'
import { MessageSquare, ArrowRight } from 'lucide-react'
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
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F0E17] dark:text-white">Session &amp; Chat History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">LangGraph checkpointer session logs</p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-chip icon-chip-accent">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#0F0E17] dark:text-white">
                  Active Session: <span className="font-mono-data text-[#5B4FE9]">{sessionId || 'default'}</span>
                </p>
                <span className="pill pill-ready">
                  <span className="pill-dot" />
                  Current Live Thread
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{messages.length} messages exchanged in this session</p>
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
            <div key={m.id || idx} className="p-3.5 bg-[#FAFAFB] dark:bg-dark-bg rounded-xl border border-[#E7E5F5] dark:border-dark-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="eyebrow-label">{m.role}</span>
                <span className="text-xs text-gray-400 font-mono-data">{formatDate(m.timestamp)}</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{m.content || '[File / Processing message]'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
