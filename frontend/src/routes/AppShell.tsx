import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  MessageSquare,
  History,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Activity,
  ShieldCheck,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { toggleTheme } from '@/features/settings/themeSlice'
import CommandMenu from '@/components/CommandMenu'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/complaints', label: 'Complaints', icon: ClipboardList },
  { path: '/complaints/new', label: 'Log Complaint', icon: PlusCircle },
  { path: '/copilot', label: 'Copilot', icon: MessageSquare },
  { path: '/history', label: 'History', icon: History },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const isDark = useAppSelector((s) => s.theme.isDark)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F9F6] dark:bg-[#101D17] text-slate-900 dark:text-slate-100">
      <div className="fixed right-24 top-3 lg:top-[112px] lg:left-4 lg:right-auto lg:w-56 z-40"><CommandMenu /></div>
      {/* ── DESKTOP SIDEBAR ───────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col workspace-sidebar w-64 shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 h-screen sticky top-0 z-30">
        {/* Brand Mark */}
        <div className="px-6 py-7 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <img src="/pharmassist-mark.svg" alt="PharmAssist" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block">
              PharmAssist
            </span>
            <span className="text-[11px] text-slate-400 block font-medium">
              Quality care, connected
            </span>
          </div>
        </div>

        <div className="h-16" />

        {/* Nav Links */}
        <nav aria-label="Main navigation" className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-3.5 pb-3 text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">Workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || (item.path === '/complaints' && location.pathname.startsWith('/complaints/') && location.pathname !== '/complaints/new')
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400')} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom User Profile & Theme */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {user?.name || 'QA Officer'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || 'qa@pharmassist.io'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE HEADER BAR ─────────────────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#17271F] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg">
            <img src="/pharmassist-mark.svg" alt="PharmAssist" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-white">PharmAssist</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => dispatch(toggleTheme())}
            aria-label="Toggle theme"
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-14 bg-slate-900/40 backdrop-blur-sm z-50 p-4">
          <div className="card p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-t border-slate-100 dark:border-slate-800 mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT OUTLET ───────────────────────────────────── */}
      <main className="workspace-content flex-1 min-w-0 overflow-x-hidden min-h-screen">
        <div className="workspace-header hidden lg:flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="w-4 h-4 text-brand-600 dark:text-brand-300" /><span>Quality workspace</span><span className="px-1 text-slate-300">/</span><span className="text-slate-700 dark:text-slate-200">{navItems.find(item => item.path === location.pathname)?.label || 'Complaint details'}</span></div>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="w-3.5 h-3.5" />Pharmaceutical quality management</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
