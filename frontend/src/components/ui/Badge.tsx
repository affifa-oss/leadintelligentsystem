import type { ReactNode } from 'react'
import { statusLabel } from '../../data/catalog'
import type { LeadStatus, Priority } from '../../types'

export type Tone = 'blue' | 'sky' | 'indigo' | 'green' | 'amber' | 'red' | 'gray' | 'violet'

const tones: Record<Tone, string> = {
  blue: 'bg-brand-50 text-brand-700 ring-brand-200',
  sky: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  indigo: 'bg-teal-50 text-teal-700 ring-teal-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-lime-50 text-lime-700 ring-lime-200',
}
const dots: Record<Tone, string> = {
  blue: 'bg-brand-500',
  sky: 'bg-cyan-500',
  indigo: 'bg-teal-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  gray: 'bg-slate-400',
  violet: 'bg-lime-500',
}

export function Badge({ tone = 'gray', dot = false, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  )
}

const STATUS_TONE: Record<LeadStatus, Tone> = {
  new: 'sky',
  contacted: 'indigo',
  qualified: 'blue',
  proposal: 'violet',
  negotiation: 'amber',
  won: 'green',
  lost: 'gray',
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {statusLabel(status)}
    </Badge>
  )
}

const PRIORITY: Record<Priority, { tone: Tone; label: string }> = {
  high: { tone: 'red', label: 'High' },
  medium: { tone: 'amber', label: 'Medium' },
  low: { tone: 'gray', label: 'Low' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={PRIORITY[priority].tone} dot>
      {PRIORITY[priority].label}
    </Badge>
  )
}

/** Small score pill coloured by value. */
export function ScorePill({ score }: { score: number }) {
  const cls = score >= 80 ? 'bg-brand-600 text-white' : score >= 55 ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600'
  return <span className={`inline-grid h-7 min-w-9 place-items-center rounded-lg px-1.5 text-sm font-bold tabular-nums ${cls}`}>{score}</span>
}
