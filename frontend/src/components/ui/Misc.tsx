import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Inbox, X, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{title}</h1>
          <span className="mt-2 block h-1 w-12 rounded-full bg-gradient-to-r from-brand-600 to-brand-300" />
          {description && <p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

const statTones = {
  blue: { icon: 'from-brand-500 to-brand-700', glow: 'bg-brand-400/15', bar: 'from-brand-500 to-brand-300' },
  sky: { icon: 'from-sky-400 to-sky-600', glow: 'bg-sky-400/15', bar: 'from-sky-500 to-sky-300' },
  indigo: { icon: 'from-indigo-500 to-indigo-700', glow: 'bg-indigo-400/15', bar: 'from-indigo-500 to-indigo-300' },
  green: { icon: 'from-emerald-400 to-emerald-600', glow: 'bg-emerald-400/15', bar: 'from-emerald-500 to-emerald-300' },
  amber: { icon: 'from-amber-400 to-amber-600', glow: 'bg-amber-400/15', bar: 'from-amber-500 to-amber-300' },
  red: { icon: 'from-rose-400 to-rose-600', glow: 'bg-rose-400/15', bar: 'from-rose-500 to-rose-300' },
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'blue', to }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string; tone?: keyof typeof statTones; to?: string }) {
  const t = statTones[tone]
  const body = (
    <>
      <span className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${t.glow}`} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md ${t.icon}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="relative mt-1 font-display text-[30px] font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {hint && <p className="relative mt-2.5 text-xs text-slate-500">{hint}</p>}
      <span className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-0 transition group-hover:opacity-100 ${t.bar}`} />
    </>
  )
  const cls = 'group relative block overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(37,99,235,0.25)] transition'
  return to ? (
    <Link to={to} className={`${cls} hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_18px_40px_-20px_rgba(37,99,235,0.45)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, max = 100, className = '' }: { value: number; max?: number; className?: string }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Circular 0–100 score gauge. */
export function ScoreRing({ score, size = 120, label = 'Lead score' }: { score: number; size?: number; label?: string }) {
  const r = 44
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${label}: ${score} out of 100`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 50 50)" />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <text x="50" y="52" textAnchor="middle" fontSize="24" fontWeight="800" fill="#0f172a">{score}</text>
      <text x="50" y="66" textAnchor="middle" fontSize="8.5" fill="#64748b">out of 100</text>
    </svg>
  )
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl'
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`animate-fade-up relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${width}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${value === o.value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-ink'}`}
        >
          {o.label}
          {o.count !== undefined && <span className={`rounded-md px-1.5 text-xs ${value === o.value ? 'bg-brand-50 text-brand-700' : 'bg-white/70 text-slate-500'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-7 w-7 text-[11px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs'
  const ini = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  return <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-semibold text-white ${s}`}>{ini}</span>
}
