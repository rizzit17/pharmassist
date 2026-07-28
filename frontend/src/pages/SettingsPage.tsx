import React, { useState } from 'react'
import { Shield, Cpu, CheckCircle, Save, User as UserIcon, Check } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { toggleTheme } from '@/features/settings/themeSlice'
import { updateUser } from '@/features/auth/authSlice'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const isDark = useAppSelector((s) => s.theme.isDark)
  const user = useAppSelector((s) => s.auth.user)

  // Local state for profile form
  const [name, setName] = useState(user?.name || 'Demo QA Officer')
  const [role, setRole] = useState(user?.role || 'qa_officer')
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Model selection state
  const [primaryModel, setPrimaryModel] = useState(
    localStorage.getItem('aivoa_primary_model') || 'llama-3.1-8b-instant'
  )
  const [secondaryModel, setSecondaryModel] = useState(
    localStorage.getItem('aivoa_secondary_model') || 'llama-3.3-70b-versatile'
  )

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(updateUser({ name, role }))
    localStorage.setItem('aivoa_primary_model', primaryModel)
    localStorage.setItem('aivoa_secondary_model', secondaryModel)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">System configuration and AI model routing</p>
      </div>

      <div className="space-y-4">
        {/* User Profile Settings */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary-600" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">User Profile</h3>
            </div>
            {savedSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Profile Updated Successfully
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  User Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="qa_officer">QA Officer</option>
                  <option value="qa_manager">QA Manager</option>
                  <option value="regulatory_specialist">Regulatory Specialist</option>
                  <option value="qa_inspector">QA Inspector</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || 'demo@aivoa.com'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-gray-100 dark:bg-dark-border/40 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Authentication Status
                </label>
                <div className="h-[38px] flex items-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    JWT Authentication Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Profile Changes
              </Button>
            </div>
          </form>
        </div>

        {/* AI Routing */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-violet-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">LangGraph AI Model Routing</h3>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 dark:bg-dark-bg rounded-lg gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Primary Extraction &amp; Intent Model</p>
                <p className="text-xs text-gray-500">Lightweight fast inference via Groq for initial field parsing</p>
              </div>
              <select
                value={primaryModel}
                onChange={(e) => {
                  setPrimaryModel(e.target.value)
                  localStorage.setItem('aivoa_primary_model', e.target.value)
                }}
                className="font-mono text-xs bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-primary-600 dark:text-dark-accent px-3 py-1.5 rounded-md focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest)</option>
                <option value="gemma2-9b-it">gemma2-9b-it (Google Gemma)</option>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (High Precision)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (MoE Architecture)</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-50 dark:bg-dark-bg rounded-lg gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Complex Risk Analysis Model</p>
                <p className="text-xs text-gray-500">High-capacity reasoning for regulatory &amp; severity evaluation</p>
              </div>
              <select
                value={secondaryModel}
                onChange={(e) => {
                  setSecondaryModel(e.target.value)
                  localStorage.setItem('aivoa_secondary_model', e.target.value)
                }}
                className="font-mono text-xs bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-violet-600 dark:text-violet-400 px-3 py-1.5 rounded-md focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Default)</option>
                <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
              </select>
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
            {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Button>
        </div>
      </div>
    </div>
  )
}
