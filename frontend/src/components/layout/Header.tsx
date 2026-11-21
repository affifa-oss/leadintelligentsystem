import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BellRing, Menu, Plus, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { nowMs, relativeTime } from '../../lib/format'
import { useData } from '../../store/data-context'
import { ButtonLink } from '../ui/Button'

export function Header({ onMenu }: { onMenu: () => void }) {
  const { followUps, leads } = useData()
  const { user, canSeeLead } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const reminders = useMemo(() => {
    const visible = new Set(leads.filter(canSeeLead).map((l) => l.id))
    const horizon = nowMs() + 24 * 3_600_000
    return followUps
      .filter((f) => f.status === 'pending' && visible.has(f.leadId) && new Date(f.dueAt).getTime() <= horizon)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  }, [followUps, leads, canSeeLead])

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    navigate(`/leads?q=${encodeURIComponent(q.trim())}`)
    setQ('')
  }

  const leadName = (id: string) => leads.find((l) => l.id === id)?.companyName ?? id

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button type="button" onClick={onMenu} aria-label="Open menu" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <form onSubmit={submit} className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads, companies, emails…" aria-label="Search leads" className="h-10 w-full rounded-xl border border-transparent bg-slate-100 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100" />
      </form>

      <div className="ml-auto flex items-center gap-2" ref={ref}>
        <span className="mr-1 hidden text-xs font-medium text-slate-500 xl:inline">{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
        <ButtonLink to="/leads/new" size="sm" icon={<Plus className="h-4 w-4" />} className="hidden sm:inline-flex">
          New lead
        </ButtonLink>
        <div className="relative">
          <button type="button" onClick={() => setOpen(!open)} aria-label="Follow-up reminders" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700">
            <BellRing className="h-5 w-5" />
            {reminders.length > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{reminders.length}</span>}
          </button>
          {open && (
            <div className="animate-fade-up absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-ink">Follow-up reminders</p>
                <p className="text-xs text-slate-500">Overdue or due in the next 24 hours</p>
              </div>
              {reminders.length ? (
                <ul className="max-h-72 overflow-y-auto">
                  {reminders.map((f) => {
                    const overdue = new Date(f.dueAt).getTime() < nowMs()
                    return (
                      <li key={f.id}>
                        <Link to={`/leads/${f.leadId}`} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50">
                          <p className="truncate text-sm font-medium text-ink">{leadName(f.leadId)} · <span className="capitalize">{f.type}</span></p>
                          <p className={`text-xs ${overdue ? 'font-medium text-rose-600' : 'text-slate-500'}`}>{overdue ? 'Overdue · ' : 'Due '}{relativeTime(f.dueAt)}</p>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-500">You're all caught up 🎉</p>
              )}
              <Link to="/follow-ups" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-brand-600 hover:bg-slate-50">
                Open follow-ups
              </Link>
            </div>
          )}
        </div>
        <span className="hidden h-6 w-px bg-slate-200 sm:block" />
        <span className="hidden rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 sm:inline">{user?.role === 'admin' ? 'Admin' : 'Sales'}</span>
      </div>
    </header>
  )
}
