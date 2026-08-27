import React from 'react'
import { MessageSquare, ArrowRight, Clock } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { formatDate } from '@/lib/formatters'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export default function HistoryPage() {
  const navigate = useNavigate()
  const messages = useAppSelector((s) => s.chat.messages)
  const sessionId = useAppSelector((s) => s.complaint.sessionId)
  const draft = useAppSelector((s) => s.complaint.draft)

  const activeSessions = sessionId
    ? [
        {
          id: sessionId,
          title: draft.product_name ? `${draft.product_name} Investigation` : 'Active Complaint Session',
          complaintNumber: draft.batch_lot_number ? `Batch: ${draft.batch_lot_number}` : 'Draft Specimen',
          date: new Date().toISOString(),
          messageCount: messages.length,
          preview: messages[messages.length - 1]?.content || 'Session in progress…',
        },
      ]
    : []

  return (
    <div className="p-5 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Session History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Active and archived LangGraph conversation states
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/complaints/new')}
        >
          New Session
        </Button>
      </div>

      {activeSessions.length > 0 ? (
        <div className="space-y-3">
          {activeSessions.map((session) => (
            <div
              key={session.id}
              className="card p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {session.title}
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">
                    {session.complaintNumber}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {formatDate(session.date)} · {session.messageCount} messages
                </span>
              </div>

              <div className="my-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-300">
                {session.preview.replace(/\*\*/g, '').slice(0, 160)}…
              </div>

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/complaints/new')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Resume Session
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Previous Sessions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            New copilot conversation threads will appear here.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={() => navigate('/complaints/new')}>
              Start New Complaint
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
