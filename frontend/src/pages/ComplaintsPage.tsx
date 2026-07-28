import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PlusCircle, Filter, ChevronLeft, ChevronRight, ClipboardList, Trash2 } from 'lucide-react'
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
    const timer = setTimeout(load, 400)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F0E17] dark:text-white">Complaints</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} total records</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('/complaints/new')}>
          New Complaint
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, customer, batch…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-primary-200 dark:bg-dark-bg dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="text-sm border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-200 dark:bg-dark-bg dark:text-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.slice(1).map((s) => (
              <option key={s} value={s}>{getStatusLabel(s as any)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-border bg-[#FAFAFB] dark:bg-dark-bg">
                {['Complaint #', 'Customer', 'Product / Batch', 'Category', 'Status', 'Severity', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>
                      ))}
                    </tr>
                  ))
                : complaints.map((c) => {
                    const latestAnalysis = c.ai_analyses?.[c.ai_analyses.length - 1]
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-[#FAFAFB] dark:hover:bg-dark-border/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/complaints/${c.id}`)}
                      >
                        <td className="px-4 py-3 font-semibold text-[#5B4FE9] dark:text-dark-accent whitespace-nowrap">{c.complaint_number}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.customer_name || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800 dark:text-gray-200">{c.product_name || '-'}</div>
                          {c.batch_lot_number && <div className="text-xs text-gray-500 font-mono-data mt-0.5">{c.batch_lot_number}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-36 truncate">{c.complaint_category || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap', getStatusColor(c.status))}>
                            {getStatusLabel(c.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {latestAnalysis?.severity ? (
                            <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold', getSeverityColor(latestAnalysis.severity))}>
                              {latestAnalysis.severity}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(c.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (window.confirm(`Are you sure you want to delete complaint ${c.complaint_number}?`)) {
                                try {
                                  await complaintsApi.delete(c.id)
                                  load()
                                } catch (err) {
                                  console.error('Delete failed:', err)
                                }
                              }
                            }}
                            className="p-1.5 rounded-lg text-[#C0392B] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Delete Complaint"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              {!isLoading && complaints.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
                    <p className="text-gray-500 text-sm font-medium">No complaints found</p>
                    <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or <button onClick={() => navigate('/complaints/new')} className="text-[#5B4FE9] hover:underline font-semibold">log a new complaint</button></p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-dark-border disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-dark-border">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-dark-border disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-dark-border">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
