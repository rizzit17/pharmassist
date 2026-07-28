import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardList, AlertTriangle, TrendingUp, BarChart3,
  ArrowUpRight, ArrowDownRight, PlusCircle
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { dashboardApi, complaintsApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getStatusColor, getStatusLabel, getSeverityColor, formatDate } from '@/lib/formatters'

const SEVERITY_COLORS = {
  Critical: '#C0392B',
  Major: '#B7791F',
  Minor: '#2563EB',
  Unknown: '#94a3b8',
}

function KPICard({ title, value, subtitle, icon: Icon, chipClass, trend }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-[#0F0E17] dark:text-white mt-1.5">{value ?? '-'}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn('icon-chip', chipClass)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          {trend > 0 ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span className="text-xs font-semibold text-blue-600">
            {Math.abs(trend)}% vs last month
          </span>
        </div>
      )}
    </motion.div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
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
          complaintsApi.list({ page: 1, page_size: 5, sort_order: 'desc' }),
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F0E17] dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">QMS Complaint Analytics Overview</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={() => navigate('/complaints/new')}
        >
          New Complaint
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
          ))
        ) : (
          <>
            <KPICard title="Total Complaints" value={stats?.total_complaints} icon={ClipboardList} chipClass="icon-chip-accent" trend={trend} />
            <KPICard title="Open Complaints" value={stats?.open_complaints} subtitle="Pending resolution" icon={BarChart3} chipClass="icon-chip-warning" />
            <KPICard title="Critical / High Risk" value={stats?.critical_complaints} subtitle="Requires immediate action" icon={AlertTriangle} chipClass="icon-chip-critical" />
            <KPICard title="This Month" value={stats?.complaints_this_month} subtitle={`${stats?.complaints_last_month} last month`} icon={TrendingUp} chipClass="icon-chip-success" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Severity donut */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-[#0F0E17] dark:text-white mb-4">Severity Distribution</h3>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : charts?.severity_distribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={charts.severity_distribution}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="count" nameKey="severity"
                >
                  {charts.severity_distribution.map((entry: any, i: number) => (
                    <Cell key={i} fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [`${v} complaints`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Monthly trend */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-[#0F0E17] dark:text-white mb-4">Monthly Trend</h3>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : charts?.monthly_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#5B4FE9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No monthly data yet</div>
          )}
        </div>
      </div>

      {/* Recent complaints */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0F0E17] dark:text-white">Recent Complaints</h3>
          <button onClick={() => navigate('/complaints')} className="text-xs text-[#5B4FE9] hover:underline font-semibold">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-border bg-[#FAFAFB] dark:bg-dark-bg">
                {['Complaint #', 'Product', 'Customer', 'Status', 'Severity', 'Date'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 rounded" /></td>
                      ))}
                    </tr>
                  ))
                : recentComplaints.map((c) => {
                    const latestAnalysis = c.ai_analyses?.[c.ai_analyses.length - 1]
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-[#FAFAFB] dark:hover:bg-dark-border/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/complaints/${c.id}`)}
                      >
                        <td className="px-4 py-3 font-semibold text-[#5B4FE9] dark:text-dark-accent">{c.complaint_number}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.product_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.customer_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-semibold', getStatusColor(c.status))}>
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
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(c.created_at)}</td>
                      </tr>
                    )
                  })}
              {!isLoading && recentComplaints.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No complaints yet. <button onClick={() => navigate('/complaints/new')} className="text-[#5B4FE9] hover:underline font-semibold">Log the first one →</button></p>
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
