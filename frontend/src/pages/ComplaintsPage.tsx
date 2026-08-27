import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Filter, ChevronLeft, ChevronRight, FileText, Trash2 } from 'lucide-react'
import { complaintsApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getStatusColor, getStatusLabel, getSeverityColor, formatDate } from '@/lib/formatters'
import type { Complaint } from '@/types/complaint'

const STATUS_OPTIONS = ['', 'draft', 'pending_triage', 'ready_to_commit', 'committed', 'under_investigation', 'capa_assigned', 'closed']

export default function ComplaintsPage() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    try {
      const data = await complaintsApi.list({
        page, page_size: 20, search: search || undefined, status: status || undefined
      })
      setComplaints(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [page, status])
  useEffect(() => {
    const timer = setTimeout(load, 350)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="p-5 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Complaints Register
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {total} total complaints recorded in the quality ledger
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/complaints/new')}
        >
          Log New Complaint
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, batch number, or customer…"
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="w-full sm:w-auto text-xs pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.slice(1).map((s) => (
                <option key={s} value={s}>{getStatusLabel(s as any)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                {['ID', 'Customer', 'Product / Lot', 'Category', 'Status', 'Severity', 'Logged', 'Action'].map((h) => (
                  <th
                    key={h}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-6 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="skeleton h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : complaints.map((c) => {
                    const latestAnalysis = c.ai_analyses?.[c.ai_analyses.length - 1]
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/complaints/${c.id}`)}
                      >
                        <td className="px-6 py-3.5 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {c.complaint_number}
                        </td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300 font-medium text-xs">
                          {c.customer_name || '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="text-slate-900 dark:text-slate-100 font-medium text-xs">
                            {c.product_name || '—'}
                          </div>
                          {c.batch_lot_number && (
                            <span className="text-[11px] font-mono text-slate-400">
                              Lot: {c.batch_lot_number}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 text-xs max-w-44 truncate">
                          {c.complaint_category || '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap', getStatusColor(c.status))}>
                            {getStatusLabel(c.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {latestAnalysis?.severity ? (
                            <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap', getSeverityColor(latestAnalysis.severity))}>
                              {latestAnalysis.severity}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(c.created_at)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (window.confirm(`Delete complaint record ${c.complaint_number}?`)) {
                                try {
                                  await complaintsApi.delete(c.id)
                                  load()
                                } catch (err) {
                                  console.error('Delete failed:', err)
                                }
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              {!isLoading && complaints.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold">No complaints found</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Try clearing filters or{' '}
                      <button
                        onClick={() => navigate('/complaints/new')}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        create a new complaint
                      </button>
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
