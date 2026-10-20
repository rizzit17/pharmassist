import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowUpRight, X, Command } from 'lucide-react'

const actions = [
  { name: 'Quality dashboard', description: 'See your quality overview', path: '/dashboard', keywords: 'home metrics' },
  { name: 'Log a complaint', description: 'Open the complaint form and AI assistant', path: '/complaints/new', keywords: 'new create intake' },
  { name: 'Complaints register', description: 'Search, filter, and export records', path: '/complaints', keywords: 'batch product csv' },
  { name: 'Ask Copilot', description: 'Work through a complaint with AI', path: '/copilot', keywords: 'chat assistant' },
  { name: 'Conversation history', description: 'Revisit your workspace conversations', path: '/history', keywords: 'recent' },
  { name: 'Workspace settings', description: 'Appearance and preferences', path: '/settings', keywords: 'theme profile' },
]

export default function CommandMenu() {
  const navigate = useNavigate()
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const filtered = actions.filter(action => `${action.name} ${action.description} ${action.keywords}`.toLowerCase().includes(query.toLowerCase()))
  const open = () => { setQuery(''); setActive(0); dialog.current?.showModal(); input.current?.focus() }
  const close = () => { dialog.current?.close(); trigger.current?.focus() }
  const run = (path: string) => { close(); navigate(path) }
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (dialog.current?.open) dialog.current.close()
        else { setQuery(''); setActive(0); dialog.current?.showModal(); input.current?.focus() }
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])
  return <>
    <button ref={trigger} onClick={open} className="command-trigger" aria-label="Open quick actions"><Search className="w-4 h-4" /><span>Quick actions</span><kbd>Ctrl K</kbd></button>
    <dialog ref={dialog} className="command-dialog" aria-labelledby="command-title" onClick={event => { if (event.target === event.currentTarget) close() }}>
      <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3"><Command className="w-5 h-5 text-brand-500" /><h2 id="command-title" className="text-base font-semibold flex-1">Where would you like to go?</h2><button onClick={close} aria-label="Close quick actions"><X className="w-5 h-5" /></button></div>
      <div className="p-4"><input ref={input} value={query} onChange={event => { setQuery(event.target.value); setActive(0) }} placeholder="Search actions…" aria-label="Search quick actions" aria-controls="command-results" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm" onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))) }
        if (event.key === 'Enter' && filtered[active]) { event.preventDefault(); run(filtered[active].path) }
      }} /></div>
      <div id="command-results" className="px-3 pb-3 max-h-[50vh] overflow-y-auto">{filtered.map((action, index) => <button key={action.path} onClick={() => run(action.path)} onFocus={() => setActive(index)} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 ${index === active ? 'bg-brand-50 dark:bg-brand-900' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><div className="flex-1"><p className="text-sm font-medium">{action.name}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{action.description}</p></div><ArrowUpRight className="w-4 h-4 text-slate-400" /></button>)}{filtered.length === 0 && <p className="p-5 text-sm text-slate-500" role="status">No matching actions. Try “complaints” or “settings”.</p>}</div>
      <div className="px-5 py-3 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-700">↑ ↓ to browse · Enter to open · Esc to close</div>
    </dialog>
  </>
}
