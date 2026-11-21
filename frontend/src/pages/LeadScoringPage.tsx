import { useMemo } from 'react'
import { Scale, Target } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axis, grid, tooltip } from '../components/charts/chart'
import { PriorityBadge, ScorePill } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { DataTable, type Column } from '../components/ui/DataTable'
import { PageHeader, ProgressBar } from '../components/ui/Misc'
import { serviceName } from '../data/catalog'
import { useData } from '../store/data-context'
import { useVisibleLeads } from '../store/useVisibleLeads'
import type { Lead } from '../types'

const RULES = [
  { key: 'budget', label: 'Budget', max: 25, rule: '$20k+ = 25 · $10k+ = 20 · $5k+ = 14 · $2k+ = 8 · any = 4 · unknown = 0' },
  { key: 'timeline', label: 'Timeline', max: 15, rule: 'Immediately = 15 · 1–3 months = 12 · 3–6 months = 7 · later = 3' },
  { key: 'urgency', label: 'Urgency', max: 10, rule: 'High = 10 · Medium = 6 · Low = 2' },
  { key: 'size', label: 'Company size', max: 15, rule: '500+ = 15 · 201–500 = 13 · 51–200 = 11 · 11–50 = 7 · 1–10 = 4' },
  { key: 'fit', label: 'Service fit', max: 15, rule: 'Best matching service fit % × 15 (requested service, inquiry keywords, industry)' },
  { key: 'intent', label: 'Buying intent', max: 15, rule: 'Intent score × 15. Detects “quote”, “ASAP”, “budget approved”, deadlines, vendor comparison; lowers for “just exploring”' },
  { key: 'data', label: 'Data completeness', max: 5, rule: '1 point each: website, phone, detailed inquiry, existing tech, location' },
]

export default function LeadScoringPage() {
  const { scoring } = useData()
  const { leads } = useVisibleLeads()
  const navigate = useNavigate()

  const buckets = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const lo = i * 10
        return { range: `${lo}–${lo + 9}`, lo, count: leads.filter((l) => l.intelligence.score >= lo && (i === 9 ? l.intelligence.score <= 100 : l.intelligence.score < lo + 10)).length }
      }),
    [leads],
  )

  const avgFactor = (key: string) => {
    const vals = leads.map((l) => l.intelligence.breakdown.find((b) => b.key === key)?.points ?? 0)
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0
  }

  const columns: Column<Lead>[] = [
    { key: 'rank', header: '#', render: (l) => <span className="font-semibold text-slate-400">{[...leads].sort((a, b) => b.intelligence.score - a.intelligence.score).indexOf(l) + 1}</span> },
    { key: 'score', header: 'Score', sortValue: (l) => l.intelligence.score, render: (l) => <ScorePill score={l.intelligence.score} /> },
    { key: 'lead', header: 'Lead', sortValue: (l) => l.companyName, render: (l) => <div><p className="font-semibold text-ink">{l.companyName}</p><p className="text-xs text-slate-500">{l.contactName}</p></div> },
    ...['budget', 'timeline', 'size', 'fit', 'intent'].map((k) => ({
      key: k,
      header: RULES.find((r) => r.key === k)!.label,
      align: 'center' as const,
      hideBelow: 'lg' as const,
      sortValue: (l: Lead) => l.intelligence.breakdown.find((b) => b.key === k)?.points ?? 0,
      render: (l: Lead) => {
        const f = l.intelligence.breakdown.find((b) => b.key === k)!
        return <span className="tabular-nums text-slate-600"><b className="text-ink">{f.points}</b>/{f.max}</span>
      },
    })),
    { key: 'fitname', header: 'Best fit', render: (l) => <span className="whitespace-nowrap text-sm text-slate-600">{l.intelligence.serviceFit[0] ? serviceName(l.intelligence.serviceFit[0].serviceId) : '—'}</span>, hideBelow: 'xl' },
    { key: 'priority', header: 'Priority', sortValue: (l) => l.intelligence.score, render: (l) => <PriorityBadge priority={l.intelligence.priority} /> },
  ]

  return (
    <>
      <PageHeader title="Lead Scoring" description="Every lead gets a 0–100 score from predefined, explainable rules. Priority comes from the score thresholds." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Scoring rules" subtitle="Total = 100 points" icon={<Scale className="h-[18px] w-[18px]" />} action={<Link to="/settings" className="text-sm font-semibold text-brand-600 hover:text-brand-800">Thresholds</Link>} />
          <ul className="divide-y divide-slate-100">
            {RULES.map((r) => (
              <li key={r.label} className="grid grid-cols-1 gap-2 px-5 py-3.5 sm:grid-cols-[180px_1fr_120px] sm:items-center">
                <p className="font-semibold text-ink">{r.label} <span className="text-sm font-normal text-slate-400">/ {r.max}</span></p>
                <p className="text-sm text-slate-600">{r.rule}</p>
                <div className="flex items-center gap-2">
                  <ProgressBar value={avgFactor(r.key)} max={r.max} className="flex-1" />
                  <span className="w-8 text-right text-xs text-slate-500" title="Average across leads">
                    {avgFactor(r.key)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-4 text-sm">
            <span className="rounded-xl bg-rose-50 px-3 py-1.5 font-medium text-rose-700">High priority: score ≥ {scoring.highThreshold}</span>
            <span className="rounded-xl bg-amber-50 px-3 py-1.5 font-medium text-amber-700">Medium: {scoring.mediumThreshold}–{scoring.highThreshold - 1}</span>
            <span className="rounded-xl bg-slate-100 px-3 py-1.5 font-medium text-slate-600">Low: below {scoring.mediumThreshold}</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Score distribution" subtitle={`${leads.length} leads`} icon={<Target className="h-[18px] w-[18px]" />} />
          <div className="h-[320px] px-2 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ left: -24, right: 8, top: 8 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="range" {...axis} fontSize={10} interval={0} angle={-35} textAnchor="end" height={44} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip {...tooltip} />
                <Bar dataKey="count" name="Leads" radius={[6, 6, 0, 0]}>
                  {buckets.map((b) => <Cell key={b.range} fill={b.lo >= scoring.highThreshold - 9 && b.lo + 9 >= scoring.highThreshold ? '#0f7357' : b.lo + 9 >= scoring.mediumThreshold ? '#47cb9c' : '#cbd5e1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Leaderboard" subtitle="All leads ranked by score, with points per factor" />
        <DataTable rows={leads} columns={columns} getRowId={(l) => l.id} onRowClick={(l) => navigate(`/leads/${l.id}`)} initialSort={{ key: 'score', dir: 'desc' }} />
      </Card>
    </>
  )
}
