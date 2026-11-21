import { useMemo } from 'react'
import { ArrowRight, BellRing, CircleDollarSign, Flame, Percent, Plus, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../auth/auth-context'
import { axis, grid, PRIORITY_COLORS, STATUS_COLORS, tooltip } from '../components/charts/chart'
import { PriorityBadge, ScorePill, StatusBadge } from '../components/ui/Badge'
import { ButtonLink } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState, StatCard } from '../components/ui/Misc'
import { serviceName, STATUSES } from '../data/catalog'
import { nowMs, formatCompactMoney, formatMoney, formatShortDate, pct, relativeTime } from '../lib/format'
import { useVisibleLeads } from '../store/useVisibleLeads'

const OPEN = new Set(['new', 'contacted', 'qualified', 'proposal', 'negotiation'])

export default function DashboardPage() {
  const { user } = useAuth()
  const { leads, followUps } = useVisibleLeads()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const open = leads.filter((l) => OPEN.has(l.status))
    const won = leads.filter((l) => l.status === 'won').length
    const lost = leads.filter((l) => l.status === 'lost').length
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const due = followUps.filter((f) => f.status === 'pending' && new Date(f.dueAt) <= endOfToday)
    return {
      open,
      high: open.filter((l) => l.intelligence.priority === 'high').length,
      pipeline: open.reduce((a, l) => a + l.intelligence.potentialValue, 0),
      conversion: pct(won, won + lost),
      won,
      due: due.length,
      overdue: due.filter((f) => new Date(f.dueAt).getTime() < nowMs()).length,
    }
  }, [leads, followUps])

  const byStatus = STATUSES.map((s) => ({ name: s.label, key: s.value, value: leads.filter((l) => l.status === s.value).length }))
  const byPriority = (['high', 'medium', 'low'] as const).map((p) => ({ name: p[0].toUpperCase() + p.slice(1), key: p, value: leads.filter((l) => l.intelligence.priority === p).length }))

  const weekly = useMemo(() => {
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const end = nowMs() - (7 - i) * 7 * 86_400_000
      return { start: end - 7 * 86_400_000, end, label: formatShortDate(new Date(end)), leads: 0, value: 0 }
    })
    for (const l of leads) {
      const t = new Date(l.createdAt).getTime()
      const w = weeks.find((x) => t > x.start && t <= x.end)
      if (w) {
        w.leads++
        w.value += l.intelligence.potentialValue
      }
    }
    return weeks
  }, [leads])

  const topLeads = [...stats.open].sort((a, b) => b.intelligence.score - a.intelligence.score).slice(0, 5)
  const upcoming = followUps.filter((f) => f.status === 'pending').sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 5)
  const leadById = (id: string) => leads.find((l) => l.id === id)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-800 px-6 py-7 text-white sm:px-8">
        <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-24 right-48 h-48 w-48 rounded-full bg-white/[0.06]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{greeting}, {user?.name.split(' ')[0]} 👋</h1>
            <p className="mt-1.5 max-w-xl text-[15px] text-brand-100">
              You have <b className="text-white">{stats.high} high-priority leads</b> open and <b className="text-white">{stats.due} follow-ups</b> due today
              {stats.overdue ? <> ({stats.overdue} overdue)</> : null}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/leads/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50">
              <Plus className="h-4 w-4" /> Add lead
            </Link>
            <Link to="/follow-ups" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold ring-1 ring-white/30 hover:bg-white/20">
              <BellRing className="h-4 w-4" /> Follow-ups
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={user?.role === 'admin' ? 'Total leads' : 'My leads'} value={leads.length} icon={Users} hint={`${stats.open.length} open in the pipeline`} to="/leads" />
        <StatCard label="High-priority open leads" value={stats.high} icon={Flame} tone="red" hint="Score above the High threshold" to="/leads?priority=high" />
        <StatCard label="Pipeline value" value={formatCompactMoney(stats.pipeline)} icon={CircleDollarSign} tone="green" hint="Potential value of open leads" />
        <StatCard label="Conversion rate" value={`${stats.conversion}%`} icon={Percent} tone="indigo" hint={`${stats.won} won of closed leads`} to="/analytics" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="New leads per week" subtitle="Last 8 weeks" />
          <div className="h-[280px] px-2 py-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#20b082" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#20b082" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip {...tooltip} cursor={{ stroke: '#b0eed5' }} formatter={(v, n) => (n === 'Leads' ? v : formatMoney(Number(v)))} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke="#12906a" strokeWidth={2.5} fill="url(#gLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Leads by priority" subtitle="Calculated by the scoring engine" />
          <div className="relative h-[200px] pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byPriority} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3} stroke="none">
                  {byPriority.map((d) => (
                    <Cell key={d.key} fill={PRIORITY_COLORS[d.key]} />
                  ))}
                </Pie>
                <Tooltip {...tooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-3">
              <span className="text-2xl font-bold text-ink">{leads.length}</span>
              <span className="text-xs text-slate-500">leads</span>
            </div>
          </div>
          <ul className="space-y-2 px-5 pb-5 pt-3">
            {byPriority.map((d) => (
              <li key={d.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PRIORITY_COLORS[d.key] }} /> {d.name} priority
                </span>
                <span className="font-semibold text-ink">{d.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Top leads to contact"
            subtitle="Open leads with the highest scores"
            action={
              <Link to="/leads" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-800">
                All leads <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          {topLeads.length ? (
            <ul className="divide-y divide-slate-100">
              {topLeads.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => navigate(`/leads/${l.id}`)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-brand-50/40">
                    <ScorePill score={l.intelligence.score} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{l.companyName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {l.contactName} · {l.intelligence.serviceFit[0] ? serviceName(l.intelligence.serviceFit[0].serviceId) : l.industry}
                      </p>
                    </div>
                    <span className="hidden text-sm font-semibold text-ink sm:block">{formatCompactMoney(l.intelligence.potentialValue)}</span>
                    <span className="hidden md:block"><StatusBadge status={l.status} /></span>
                    <PriorityBadge priority={l.intelligence.priority} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No open leads" message="Add a lead to get started." action={<ButtonLink to="/leads/new" icon={<Plus className="h-4 w-4" />}>Add lead</ButtonLink>} />
          )}
        </Card>

        <Card>
          <CardHeader title="Upcoming follow-ups" action={<Link to="/follow-ups" className="text-sm font-semibold text-brand-600 hover:text-brand-800">View all</Link>} />
          {upcoming.length ? (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((f) => {
                const overdue = new Date(f.dueAt).getTime() < nowMs()
                return (
                  <li key={f.id}>
                    <Link to={`/leads/${f.leadId}`} className="block px-5 py-3 hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ink">{leadById(f.leadId)?.companyName}</p>
                        <span className={`shrink-0 text-xs font-medium ${overdue ? 'text-rose-600' : 'text-brand-600'}`}>{overdue ? 'Overdue' : relativeTime(f.dueAt)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500"><span className="capitalize">{f.type}</span> · {f.note}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState title="No follow-ups scheduled" />
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Pipeline by status" subtitle="Where your leads are right now" />
        <div className="h-[260px] px-2 py-4 sm:px-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byStatus} margin={{ left: -20, right: 8, top: 8 }} barSize={36}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="name" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip {...tooltip} />
              <Bar dataKey="value" name="Leads" radius={[8, 8, 0, 0]}>
                {byStatus.map((d) => (
                  <Cell key={d.key} fill={STATUS_COLORS[d.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  )
}
