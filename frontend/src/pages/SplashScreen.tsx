import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ClipboardCheck, MessageSquare, ScanLine } from 'lucide-react'

export default function SplashScreen({ onFinish, autoAdvance = true }: { onFinish?: () => void; autoAdvance?: boolean }) {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const finish = useCallback(() => {
    sessionStorage.setItem('hasSeenSplash', 'true')
    if (onFinish) onFinish()
    else navigate('/dashboard', { replace: true })
  }, [navigate, onFinish])
  useEffect(() => {
    if (!autoAdvance) return
    const timer = setTimeout(finish, reducedMotion ? 1000 : 2800)
    return () => clearTimeout(timer)
  }, [finish, reducedMotion, autoAdvance])

  return (
    <main className="welcome-screen min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 sm:p-10 lg:px-16 overflow-hidden relative">
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3"><img src="/pharmassist-mark.svg" alt="" className="w-10 h-10" /><span className="font-semibold tracking-tight text-lg">PharmAssist</span></div>
        <span className="text-xs text-slate-500 hidden sm:block">A little more clarity. A lot more care.</span>
      </header>
      <div className="flex-1 grid lg:grid-cols-2 gap-12 items-center max-w-6xl w-full mx-auto py-12 relative z-10">
        <motion.section initial={reducedMotion ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
          <p className="text-xs tracking-[.22em] uppercase font-semibold text-brand-600 dark:text-brand-300 mb-5">Your quality workspace</p>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.08] max-w-lg">Better clarity.<br /><span className="text-brand-500 dark:text-brand-300">Better care.</span></h1>
          <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mt-6">From the first complaint to the next informed decision. Bring your people, product quality, and AI assistance together.</p>
          <button onClick={finish} className="mt-8 inline-flex items-center gap-5 bg-brand-800 hover:bg-brand-700 text-white px-6 py-3.5 rounded-2xl text-sm font-medium transition-colors">Enter workspace <ArrowRight className="w-4 h-4" /></button>
          <p className="mt-4 text-xs text-slate-500" role="status">{autoAdvance ? 'Opening your workspace shortly…' : 'Your next informed decision starts here.'}</p>
        </motion.section>
        <motion.div initial={reducedMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7 }} className="relative mx-auto w-full max-w-md py-10" aria-hidden="true">
          <div className="welcome-orbit rounded-full border border-brand-200 dark:border-brand-800 aspect-square flex items-center justify-center relative">
            <div className="absolute inset-10 rounded-full border border-brand-200/70 dark:border-brand-800" />
            <div className="absolute inset-20 rounded-full bg-brand-100/60 dark:bg-brand-900/50" />
            <img src="/pharmassist-mark.svg" alt="" className="w-28 h-28 sm:w-36 sm:h-36 relative shadow-xl rounded-[30%]" />
            <div className="welcome-label absolute -left-1 top-12"><ScanLine className="w-5 h-5" /><div><strong>Capture</strong><span>Every detail matters</span></div></div>
            <div className="welcome-label absolute -right-1 top-1/2"><MessageSquare className="w-5 h-5" /><div><strong>Understand</strong><span>Context, with Copilot</span></div></div>
            <div className="welcome-label absolute left-6 bottom-4"><ClipboardCheck className="w-5 h-5" /><div><strong>Take action</strong><span>A clearer next step</span></div></div>
          </div>
        </motion.div>
      </div>
      <footer className="relative z-10 flex justify-between gap-4 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-5"><span>Thoughtfully built for pharmaceutical quality.</span><span>PharmAssist</span></footer>
    </main>
  )
}
