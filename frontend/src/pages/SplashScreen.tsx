import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
    }, 4000)

    return () => clearTimeout(timer)
  }, [navigate, onFinish])

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0C0F17] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center text-center space-y-4 max-w-xs"
      >
        <div className="w-14 h-14 rounded-xl bg-indigo-600 p-2.5 shadow-sm flex items-center justify-center">
          <img src="/logo.png" alt="PharmAssist Logo" className="w-full h-full object-contain" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            PharmAssist
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quality Management System
          </p>
        </div>

        <div className="pt-2 w-full space-y-2">
          <div className="w-64 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 4, ease: 'easeInOut' }}
              className="h-full bg-indigo-600 rounded-full"
            />
          </div>
          <p className="text-[11px] text-slate-400">Loading workspace…</p>
        </div>
      </motion.div>
    </div>
  )
}
