import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, PlusCircle, MessageSquare,
  History, Settings, LogOut, FlaskConical, Moon, Sun, Menu, X,
  ChevronRight,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { toggleTheme } from '@/features/settings/themeSlice'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/complaints', icon: ClipboardList, label: 'Complaints' },
  { to: '/complaints/new', icon: PlusCircle, label: 'New Complaint' },
  { to: '/copilot', icon: MessageSquare, label: 'Copilot' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const pathLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/complaints': 'Complaints',
  '/complaints/new': 'New Complaint',
  '/copilot': 'AI Copilot',
  '/history': 'History',
  '/settings': 'Settings',
}

export default function AppShell() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const isDark = useAppSelector((s) => s.theme.isDark)
  const user = useAppSelector((s) => s.auth.user)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const breadcrumb = pathLabels[location.pathname] || 'AIVOA'

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-bg overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-[#0F0E17] text-white border-r border-[#262438] transition-transform duration-300 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#262438]">
          <div className="w-9 h-9 rounded-xl bg-white/10 p-1.5 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="AIVOA Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-extrabold text-[#FFFFFF] text-base tracking-tight leading-none">AIVOA</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-1">QMS Copilot</p>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-primary-600'
                  : 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors'
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#262438] space-y-1">
          <button
            onClick={() => dispatch(toggleTheme())}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors w-full"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={() => dispatch(logout())}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 sm:px-6 py-4 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shrink-0">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span className="text-gray-400">AIVOA</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-medium text-gray-900 dark:text-dark-text-bright">{breadcrumb}</span>
          </div>

          {/* User menu */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold">
                {user?.name?.charAt(0) || 'D'}
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-dark-text-bright leading-none">{user?.name || 'Demo User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{user?.role?.replace('_', ' ') || 'QA Officer'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
