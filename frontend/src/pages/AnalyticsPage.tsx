import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../auth/auth-context'
import { axis, BLUE, grid, PRIORITY_COLORS, tooltip } from '../components/charts/chart'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { FilterSelect } from '../components/ui/Fields'
import { PageHeader, ProgressBar } from '../components/ui/Misc'
import { getServices, SOURCES, STATUSES } from '../data/catalog'
import { downloadCsv, formatCompactMoney, formatMoney, pct } from '../lib/format'
import { useQueryState } from '../lib/useQueryState'
import { useData } from '../store/data-context'
import { useVisibleLeads } from '../store/useVisibleLeads'

const RANGES: Record<string, number> = { '30': 30, '90': 90 }

export default function AnalyticsPage() {
  const { isAdmin } = useAuth()
  const { users } = useData()
  const { leads: all } = useVisibleLeads()
  const [range, setRange] = useQueryState('range', 'all')

  const leads = useMemo(() => {
    const days = RANGES[range]
    if (!days) return all
    const since = new Date().getTime() - days * 86_400_000
    return all.filter((l) => new Date(l.createdAt).getTime() >= since)
  }, [all, range])

  const won = leads.filter((l) => l.status === 'won')
  const lost = leads.filter((l) => l.status === 'lost')
  const wonValue = won.reduce((a, l) => a + l.intelligence.potentialValue, 0)
  const avgScore = leads.length ? Math.round(leads.reduce((a, l) => a + l.intelligence.score, 0) / leads.length) : 0

  // Funnel: how many leads reached each stage (or beyond)
  const order = STATUSES.filter((s) => s.value !== 'lost').map((s) => s.value)
  const funnel = order.map((s, i) => ({
    stage: STATUSES.find((x) => x.value === s)!.label,
    count: leads.filter((l) => (l.status === 'lost' ? i <= 2 : order.indexOf(l.status) >= i)).length,
  }))

  const bySource = SOURCES.map((s) => {
    const ls = leads.filter((l) => l.source === s)
    return { source: s, leads: ls.length, won: ls.filter((l) => l.status === 'won').length }
  }).filter((d) => d.leads)

  const byService = getServices().map((s) => ({
    name: s.name.replace(' Development', '').replace(' & Digital Marketing', ''),
    value: leads.filter((l) => l.intelligence.serviceFit[0]?.serviceId === s.id).reduce((a, l) => a + l.intelligence.potentialValue, 0),
  })).filter((d) => d.value).sort((a, b) => b.value - a.value)

  const byIndustry = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of leads) m.set(l.intelligence.industryCategory, (m.get(l.intelligence.industryCategory) ?? 0) + 1)
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [leads])

  const byPriority = (['high', 'medium', 'low'] as const).map((p) => ({ key: p, name: `${p[0].toUpperCase()}${p.slice(1)}`, value: leads.filter((l) => l.intelligence.priority === p).length }))

  const team = users
    .filter((u) => u.role === 'sales')
    .map((u) => {
      const ls = leads.filter((l) => l.assignedTo === u.id)
      const w = ls.filter((l) => l.status === 'won').length
      const closed = w + ls.filter((l) => l.status === 'lost').length
      return { user: u, leads: ls.length, won: w, rate: pct(w, closed), value: ls.filter((l) => !['won', 'lost'].includes(l.status)).reduce((a, l) => a + l.intelligence.potentialValue, 0) }
    })
    .filter((t) => t.leads)

  function exportReport() {
    downloadCsv('lead-report.csv', [
      { metric: 'Total leads', value: leads.length },
      { metric: 'Won', value: won.length },
      { metric: 'Lost', value: lost.length },
      { metric: 'Conversion rate %', value: pct(won.length, won.length + lost.length) },
      { metric: 'Won value (USD)', value: wonValue },
      { metric: 'Average score', value: avgScore },
      ...byPriority.map((p) => ({ metric: `${p.name} priority leads`, value: p.value })),
      ...bySource.map((s) => ({ metric: `Leads from ${s.source}`, value: s.leads })),
    ])
  }


  return (
    <>
      <PageHeader
        title="Analytics & Reports"
        description={isAdmin ? 'Lead and conversion reports for the whole team.' : 'Reports for your own leads.'}
        actions={
          <>
            <FilterSelect label="Period" value={range} onChange={setRange} options={[{ value: 'all', label: 'All time' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} />
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportReport}>Export report</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Leads" value={leads.length} hint={`${byPriority[0].value} high priority`} />
        <Kpi label="Conversion rate" value={`${pct(won.length, won.length + lost.length)}%`} hint={`${won.length} won · ${lost.length} lost`} />
        <Kpi label="Won value" value={formatCompactMoney(wonValue)} hint="Potential value of won leads" />
        <Kpi label="Average lead score" value={avgScore} hint="Out of 100" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Conversion funnel" subtitle="Leads that reached each stage" />
          <div className="space-y-3 p-5">
            {funnel.map((f, i) => (
              <div key={f.stage}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700">{f.stage}</span><span className="text-slate-500"><b className="text-ink">{f.count}</b> · {pct(f.count, funnel[0].count)}%</span></div>
                <div className="h-7 overflow-hidden rounded-lg bg-slate-100">
                  <div className="h-full rounded-lg" style={{ width: `${pct(f.count, funnel[0].count)}%`, background: i === funnel.length - 1 ? '#10b981' : BLUE[Math.min(i, BLUE.length - 1)] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Leads by source" subtitle="Where leads come from and how many convert" />
          <div className="h-[300px] px-2 py-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySource} margin={{ left: -20, right: 8, top: 8 }} barGap={4}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="source" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip {...tooltip} />
                <Bar dataKey="leads" name="Leads" fill="#93c5fd" radius={[6, 6, 0, 0]} />
                <Bar dataKey="won" name="Won" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Potential value by best-fit service" />
          <div className="h-[300px] px-2 py-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byService} layout="vertical" margin={{ left: 16, right: 24 }} barSize={16}>
                <CartesianGrid stroke={grid} horizontal={false} />
                <XAxis type="number" {...axis} tickFormatter={(v) => formatCompactMoney(Number(v))} />
                <YAxis type="category" dataKey="name" {...axis} width={120} />
                <Tooltip {...tooltip} formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="value" name="Potential value" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Industry & priority mix" />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <ul className="space-y-2.5">
              {byIndustry.map((d) => (
                <li key={d.name}>
                  <div className="mb-1 flex justify-between text-sm"><span className="truncate text-slate-700">{d.name}</span><b className="text-ink">{d.value}</b></div>
                  <ProgressBar value={d.value} max={byIndustry[0]?.value ?? 1} />
                </li>
              ))}
            </ul>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byPriority} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
                    {byPriority.map((d) => <Cell key={d.key} fill={PRIORITY_COLORS[d.key]} />)}
                  </Pie>
                  <Tooltip {...tooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-3 text-xs text-slate-500">
                {byPriority.map((d) => <span key={d.key} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLORS[d.key] }} />{d.name}</span>)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {isAdmin && team.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Team performance" subtitle="Leads per sales employee" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="px-5 py-3">Employee</th><th className="px-5 py-3 text-center">Leads</th><th className="px-5 py-3 text-center">Won</th><th className="px-5 py-3 text-center">Win rate</th><th className="px-5 py-3 text-right">Open pipeline</th></tr></thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.user.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-ink">{t.user.name}</td>
                    <td className="px-5 py-3 text-center">{t.leads}</td>
                    <td className="px-5 py-3 text-center">{t.won}</td>
                    <td className="px-5 py-3 text-center">{t.rate}%</td>
                    <td className="px-5 py-3 text-right font-semibold text-ink">{formatMoney(t.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card className="p-5">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-[28px] font-bold leading-none text-ink">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </Card>
  )
}
