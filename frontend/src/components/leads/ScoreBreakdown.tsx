import type { LeadIntelligence } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { ProgressBar, ScoreRing } from '../ui/Misc'
import { formatMoney } from '../../lib/format'

/** Score ring + priority + potential value + factor-by-factor breakdown. */
export function ScoreBreakdown({ intel, compact = false }: { intel: LeadIntelligence; compact?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-5">
        <ScoreRing score={intel.score} size={compact ? 96 : 116} />
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Priority</p>
            <div className="mt-1"><PriorityBadge priority={intel.priority} /></div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Potential value</p>
            <p className="text-lg font-bold text-ink">{formatMoney(intel.potentialValue)}</p>
          </div>
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        {intel.breakdown.map((f) => (
          <li key={f.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-slate-700">{f.label}</span>
              <span className="tabular-nums text-slate-500"><b className="text-ink">{f.points}</b>/{f.max}</span>
            </div>
            <ProgressBar value={f.points} max={f.max} />
            {!compact && <p className="mt-1 text-xs text-slate-400">{f.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
