import React, { useState } from 'react'
import { CheckCircle, Save, Moon, Sun } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { toggleTheme } from '@/features/settings/themeSlice'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const isDark = useAppSelector((s) => s.theme.isDark)

  const [primaryModel, setPrimaryModel] = useState('groq-llama-3.3-70b-versatile')
  const [reasoningModel, setReasoningModel] = useState('groq-llama-3.1-8b-instant')
  const [ocrEngine, setOcrEngine] = useState('tesseract-ocr')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-5 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            User profile, interface preferences, and model configuration
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Save className="w-4 h-4" />}
          onClick={handleSave}
        >
          {saved ? 'Saved' : 'Save Changes'}
        </Button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Settings updated successfully.
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* User Profile */}
        <div className="card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            User Profile
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name</label>
              <input
                type="text"
                readOnly
                value={user?.name || 'QA Specialist'}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
              <input
                type="email"
                readOnly
                value={user?.email || 'qa@pharmassist.io'}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Role</label>
              <input
                type="text"
                readOnly
                value={user?.role || 'QA Specialist'}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Appearance
          </h2>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => isDark && dispatch(toggleTheme())}
              className={cn(
                'p-3.5 rounded-lg border text-left transition-colors relative',
                !isDark
                  ? 'border-indigo-600 bg-indigo-50/40'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              )}
            >
              <Sun className="w-5 h-5 text-amber-500 mb-2" />
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Light Mode</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Crisp daytime theme</p>
            </button>

            <button
              onClick={() => !isDark && dispatch(toggleTheme())}
              className={cn(
                'p-3.5 rounded-lg border text-left transition-colors relative',
                isDark
                  ? 'border-indigo-500 bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              )}
            >
              <Moon className="w-5 h-5 text-indigo-400 mb-2" />
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Low-light theme</p>
            </button>
          </div>
        </div>

        {/* AI Model Routing (Full Width) */}
        <div className="md:col-span-2 card p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            AI Model Routing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Extraction Model
              </label>
              <select
                value={primaryModel}
                onChange={(e) => setPrimaryModel(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="groq-llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                <option value="groq-llama-3.1-70b-versatile">llama-3.1-70b-versatile</option>
                <option value="groq-mixtral-8x7b-32768">mixtral-8x7b-32768</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Risk Classification Model
              </label>
              <select
                value={reasoningModel}
                onChange={(e) => setReasoningModel(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="groq-llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                <option value="groq-llama-3.1-8b-instant">llama-3.1-8b-instant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                OCR Engine
              </label>
              <select
                value={ocrEngine}
                onChange={(e) => setOcrEngine(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="tesseract-ocr">Tesseract OCR v5</option>
                <option value="pdfplumber">pdfplumber Text Engine</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
