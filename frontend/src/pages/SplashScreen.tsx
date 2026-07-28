import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.setItem('hasSeenSplash', 'true')
      if (onFinish) {
        onFinish()
      } else {
        navigate('/dashboard', { replace: true })
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [navigate, onFinish])

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-dark-bg p-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#5B4FE9]/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-sm"
      >
        {/* Brand Icon Mark */}
        <div className="w-20 h-20 rounded-2xl bg-[#E8E6FD] dark:bg-primary-950/50 border border-[#5B4FE9]/20 flex items-center justify-center shadow-lg shadow-[#5B4FE9]/10">
          <FlaskConical className="w-10 h-10 text-[#5B4FE9]" />
        </div>

        {/* Branding & Wordmark */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0F0E17] dark:text-white">AIVOA</h1>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1">QMS Copilot</p>
        </div>

        {/* Tagline */}
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide">
          Your Digital QA Workforce
        </p>

        {/* Progress Bar Container */}
        <div className="pt-4 space-y-2.5 w-full flex flex-col items-center">
          <div className="w-72 sm:w-80 h-1.5 rounded-full bg-gray-100 dark:bg-dark-border overflow-hidden relative">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 5, ease: 'easeInOut' }}
              className="h-full bg-[#5B4FE9] rounded-full shadow-sm"
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Loading your workspace…
          </span>
        </div>
      </motion.div>
    </div>
  )
}
