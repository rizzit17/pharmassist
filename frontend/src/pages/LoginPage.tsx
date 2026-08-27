import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Mail, Lock, ArrowRight, ShieldCheck, FileCheck2,
  AlertOctagon, BarChart3, CheckCircle2, Eye, EyeOff, Sparkles
} from 'lucide-react'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const data = await authApi.login(email, password)
      dispatch(setCredentials({ user: data.user, token: data.access_token }))
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickDemo = async (demoEmail?: string) => {
    setError('')
    setIsLoading(true)
    try {
      if (demoEmail === 'admin@pharmassist.com') {
        setEmail('admin@pharmassist.com')
        setPassword('admin1234')
        const data = await authApi.login('admin@pharmassist.com', 'admin1234')
        dispatch(setCredentials({ user: data.user, token: data.access_token }))
      } else {
        setEmail('demo@pharmassist.com')
        setPassword('demo1234')
        const data = await authApi.demo()
        dispatch(setCredentials({ user: data.user, token: data.access_token }))
      }
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Demo login failed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-white">
      <div className="w-full max-w-5xl rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111625] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* ── Left Side: Platform Brief & Capabilities (5 Cols) ── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 sm:p-8 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 p-1.5 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <img src="/logo.png" alt="PharmAssist Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  PharmAssist
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    GxP AI
                  </span>
                </h1>
                <p className="text-xs text-indigo-200/80">Quality &amp; Complaint Surveillance</p>
              </div>
            </div>

            {/* Mission Statement */}
            <div className="space-y-2 pt-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Autonomous Quality Intelligence for Pharma
              </h2>
              <p className="text-xs text-indigo-100/70 leading-relaxed">
                Streamline customer complaint intake, automate ICH Q9/Q10 risk triage, and maintain continuous 21 CFR Part 11 compliance.
              </p>
            </div>

            {/* Feature Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">AI Document Extraction</h3>
                  <p className="text-[11px] text-indigo-200/70 mt-0.5 leading-relaxed">
                    Auto-ingest PDFs, lab reports, and intake emails with instant entity extraction.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">ICH Risk Classification</h3>
                  <p className="text-[11px] text-indigo-200/70 mt-0.5 leading-relaxed">
                    Real-time severity grading, defect categorization, and regulatory reportability flags.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">Batch &amp; Site Surveillance</h3>
                  <p className="text-[11px] text-indigo-200/70 mt-0.5 leading-relaxed">
                    Live batch cluster monitoring, trend analytics, and CAPA resolution workflows.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Compliance Tags */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-200/70">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              21 CFR Part 11
            </span>
            <span>·</span>
            <span>cGMP SOP-QA-402</span>
            <span>·</span>
            <span>ICH Q10 System</span>
          </div>
        </div>

        {/* ── Right Side: Sign In Form (7 Cols) ── */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Secure Enterprise Portal
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Sign In to Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your authorized credentials or select a demo role to proceed.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs font-medium border border-red-200 dark:border-red-900 flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="qa.specialist@pharmassist.io"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Access Divider */}
          <div className="space-y-3 pt-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative px-3 bg-white dark:bg-[#111625] text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Or Instant Demo Access
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('demo@pharmassist.com')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-900/60 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    QA Specialist
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Intake &amp; Risk Triage</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin@pharmassist.com')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-900/60 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    QA Lead / Admin
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Approvals &amp; CAPA</p>
              </button>
            </div>
          </div>

          {/* Footer Security Notice */}
          <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>256-bit TLS Encrypted · Verified Audit Trail Session</span>
          </div>
        </div>

      </div>
    </div>
  )
}
