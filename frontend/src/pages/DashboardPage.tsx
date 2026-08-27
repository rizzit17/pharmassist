import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, AlertCircle, Clock, TrendingUp,
  Plus, ArrowUpRight, ArrowDownRight,
  FileText, CheckCircle2, ChevronRight
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { dashboardApi, complaintsApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getStatusColor, getStatusLabel, getSeverityColor, formatDate } from '@/lib/formatters'

const SEVERITY_PALETTE = {
  Critical: '#EF4444',
  Major: '#F59E0B',
  Minor: '#10B981',
  Unknown: '#94A3B8',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [charts, setCharts] = useState<any>(null)
  const [recentComplaints, setRecentComplaints] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, chartsData, listData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getCharts(),
          complaintsApi.list({ page: 1, page_size: 6, sort_order: 'desc' }),
        ])
        setStats(statsData)
        setCharts(chartsData)
        setRecentComplaints(listData.items)
      } catch (err) {
        console.error('Dashboard load error', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const trend = stats
    ? Math.round(((stats.complaints_this_month - stats.complaints_last_month) / (stats.complaints_last_month || 1)) * 100)
    : 0

  return (
    <div className="p-5 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── 1. Clean Top Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quality &amp; Complaints Dashboard
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>GxP Compliant</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time surveillance and automated risk triage for batch manufacturing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/complaints/new')}
          >
            Log New Complaint
          </Button>
        </div>
      </div>

      {/* ── 2. Top Summary KPI Cards (4 Balanced Columns) ─────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Complaints
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isLoading ? '—' : stats?.total_complaints ?? 0}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Logged in QMS register
            </p>
          </div>
        </div>

        {/* Critical Severity */}
        <div
          className="card p-5 flex flex-col justify-between cursor-pointer hover:border-red-300 dark:hover:border-red-900/60 transition-colors"
          onClick={() => navigate('/complaints')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Critical Risk
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {isLoading ? '—' : stats?.critical_complaints ?? 0}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Requires immediate QA sign-off
            </p>
          </div>
        </div>

        {/* Open Investigations */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              In Progress
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isLoading ? '—' : stats?.open_complaints ?? 0}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pending triage or CAPA
            </p>
          </div>
        </div>

        {/* Logged This Month */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              This Month
            </span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isLoading ? '—' : stats?.complaints_this_month ?? 0}
              </p>
              {stats && (
                <span className="text-xs font-medium text-slate-500 flex items-center">
                  {trend >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-slate-400 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-slate-400 mr-0.5" />
                  )}
                  {Math.abs(trend)}% vs last mo.
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats?.complaints_last_month ?? 0} in previous month
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Middle Section: Charts & Distribution ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Severity Distribution Donut (5 cols) */}
        <div className="lg:col-span-5 card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Severity Distribution
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Risk stratification under ICH Q9
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="skeleton w-36 h-36 rounded-full" />
              </div>
            ) : charts?.severity_distribution?.length > 0 ? (
              <div>
                <div className="h-48 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.severity_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={78}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="severity"
                      >
                        {charts.severity_distribution.map((entry: any, idx: number) => (
                          <Cell
                            key={idx}
                            fill={SEVERITY_PALETTE[entry.severity as keyof typeof SEVERITY_PALETTE] || '#94A3B8'}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {stats?.total_complaints ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                      Total
                    </span>
                  </div>
                </div>

                {/* Clean Horizontal Legend */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {charts.severity_distribution.map((entry: any, idx: number) => {
                    const color = SEVERITY_PALETTE[entry.severity as keyof typeof SEVERITY_PALETTE] || '#94A3B8'
                    return (
                      <div key={idx} className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {entry.severity}
                        </div>
                        <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                          {entry.count}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                No severity records logged
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend Bar Chart (7 cols) */}
        <div className="lg:col-span-7 card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Monthly Intake Trajectory
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Volume progression across reporting cycles
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="skeleton w-full h-48" />
              </div>
            ) : charts?.monthly_trend?.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.monthly_trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#6366F1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                No monthly data recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Table: Recent Complaints ─────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Complaints
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Latest quality records entered into the system
            </p>
          </div>
          <button
            onClick={() => navigate('/complaints')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                {['ID', 'Product Name', 'Batch / Lot', 'Customer', 'Status', 'Severity', 'Logged'].map((h) => (
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
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="skeleton h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : recentComplaints.map((c) => {
                    const latestAnalysis = c.ai_analyses?.[c.ai_analyses.length - 1]
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/complaints/${c.id}`)}
                      >
                        <td className="px-6 py-3.5 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {c.complaint_number}
                        </td>
                        <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                          {c.product_name || '—'}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {c.batch_lot_number || '—'}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 text-xs">
                          {c.customer_name || '—'}
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
                      </tr>
                    )
                  })}
              {!isLoading && recentComplaints.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No complaint records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      <button
                        onClick={() => navigate('/complaints/new')}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Log your first complaint →
                      </button>
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
