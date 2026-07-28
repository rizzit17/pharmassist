import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Mail, Lock, ArrowRight, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const res = await authApi.login(email, password)
      dispatch(setCredentials({ user: res.user, token: res.token.access_token }))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemo = async () => {
    setError(null)
    setIsDemoLoading(true)
    try {
      const res = await authApi.demo()
      dispatch(setCredentials({ user: res.user, token: res.token.access_token }))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Demo login failed')
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary-950 to-violet-950 px-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white/95 dark:bg-dark-surface backdrop-blur-xl rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-600 to-violet-600 rounded-2xl shadow-lg mb-4">
              <FlaskConical className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AIVOA</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Customer Complaint Management System
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@pharma.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none dark:text-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
          </div>

          {/* Demo login */}
          <Button
            variant="secondary"
            size="lg"
            isLoading={isDemoLoading}
            onClick={handleDemo}
            leftIcon={<Zap className="w-4 h-4 text-primary-600" />}
            className="w-full"
          >
            Continue as Demo User
          </Button>

          <p className="text-center text-xs text-gray-400 mt-6">
            Demo: demo@aivoa.com · Powered by LangGraph + Groq
          </p>
        </div>
      </motion.div>
    </div>
  )
}
