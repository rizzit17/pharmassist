import React from 'react'
import { Settings, Shield, Cpu, Database, Key, CheckCircle } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { toggleTheme } from '@/features/settings/themeSlice'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const isDark = useAppSelector((s) => s.theme.isDark)
  const user = useAppSelector((s) => s.auth.user)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">System configuration and AI model routing</p>
      </div>

      <div className="space-y-4">
        {/* User Profile */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">User Profile</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Logged in User</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{user?.name || 'Demo QA Officer'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5 capitalize">{user?.role?.replace('_', ' ') || 'QA Officer'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{user?.email || 'demo@aivoa.com'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Auth Mode</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3 h-3" />
                JWT / Auth Bypass Active
              </span>
            </div>
          </div>
        </div>

        {/* AI Routing */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-violet-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">LangGraph AI Model Routing</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Primary Extraction &amp; Intent Model</p>
                <p className="text-xs text-gray-500">Lightweight fast inference via Groq</p>
              </div>
              <span className="font-mono text-xs bg-primary-50 dark:bg-primary-950 text-primary-700 px-2.5 py-1 rounded">gemma2-9b-it</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Complex Risk Analysis Model</p>
                <p className="text-xs text-gray-500">High-capacity reasoning for regulatory evaluation</p>
              </div>
              <span className="font-mono text-xs bg-violet-50 dark:bg-violet-950 text-violet-700 px-2.5 py-1 rounded">llama-3.3-70b-versatile</span>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="card p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Interface Theme</h3>
            <p className="text-xs text-gray-500">Switch between Tokyo Night Dark mode and Clean Light mode</p>
          </div>
          <Button variant="secondary" onClick={() => dispatch(toggleTheme())}>
            {isDark ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
          </Button>
        </div>
      </div>
    </div>
  )
}
