import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`animate-rise rounded-2xl border border-slate-200/70 bg-white/95 transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_18px_40px_-20px_rgba(18,144,106,0.35)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(18,144,106,0.22)] backdrop-blur-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-100">{icon}</span>}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
