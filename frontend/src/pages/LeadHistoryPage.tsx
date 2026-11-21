import { useMemo } from 'react'
import { ArrowRightLeft, BellRing, Globe, Pencil, PlusCircle, StickyNote, UserCheck, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { FilterSelect, SearchBox } from '../components/ui/Fields'
import { EmptyState, PageHeader } from '../components/ui/Misc'
import { formatDate, formatDateTime } from '../lib/format'
import { useQueryState } from '../lib/useQueryState'
import { useData } from '../store/data-context'
import { useVisibleLeads } from '../store/useVisibleLeads'

const ICONS: Record<string, { icon: LucideIcon; cls: string }> = {
  'Lead created': { icon: PlusCircle, cls: 'bg-brand-50 text-brand-600' },
  'Lead updated': { icon: Pencil, cls: 'bg-slate-100 text-slate-600' },
  'Status changed': { icon: ArrowRightLeft, cls: 'bg-indigo-50 text-indigo-600' },
  'Lead assigned': { icon: UserCheck, cls: 'bg-emerald-50 text-emerald-600' },
  'Lead unassigned': { icon: UserCheck, cls: 'bg-slate-100 text-slate-600' },
  'Follow-up scheduled': { icon: BellRing, cls: 'bg-amber-50 text-amber-600' },
  'Follow-up completed': { icon: BellRing, cls: 'bg-emerald-50 text-emerald-600' },
  'Website analysed': { icon: Globe, cls: 'bg-sky-50 text-sky-600' },
  'Notes updated': { icon: StickyNote, cls: 'bg-violet-50 text-violet-600' },
}

export default function LeadHistoryPage() {
  const { history, users } = useData()
  const { leads } = useVisibleLeads()
  const [q, setQ] = useQueryState('q')
  const [action, setAction] = useQueryState('action', 'all')

  const leadMap = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads])
  const actions = useMemo(() => [...new Set(history.map((h) => h.action))].sort(), [history])

  const entries = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return history
      .filter((h) => leadMap.has(h.leadId))
      .filter((h) => action === 'all' || h.action === action)
      .filter((h) => !needle || `${leadMap.get(h.leadId)!.companyName} ${h.detail}`.toLowerCase().includes(needle))
      .slice(0, 150)
  }, [history, leadMap, action, q])

  // group by day
  const days = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const e of entries) {
      const k = formatDate(e.at)
      map.set(k, [...(map.get(k) ?? []), e])
    }
    return [...map.entries()]
  }, [entries])

  return (
    <>
      <PageHeader title="Lead History" description="A complete audit trail of every change: new leads, status updates, assignments, follow-ups and analyses." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchBox value={q} onChange={setQ} placeholder="Search company or detail" />
          <FilterSelect label="Event" value={action} onChange={setAction} options={[{ value: 'all', label: 'All events' }, ...actions.map((a) => ({ value: a, label: a }))]} />
        </div>
        {days.length ? (
          <div className="space-y-6 p-5">
            {days.map(([day, items]) => (
              <section key={day}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{day}</h3>
                <ul className="space-y-1">
                  {items.map((h) => {
                    const { icon: Icon, cls } = ICONS[h.action] ?? ICONS['Lead updated']
                    const lead = leadMap.get(h.leadId)!
                    return (
                      <li key={h.id} className="flex gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${cls}`}><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink">
                            <span className="font-semibold">{h.action}</span> · <Link to={`/leads/${lead.id}`} className="font-medium text-brand-600 hover:underline">{lead.companyName}</Link>
                          </p>
                          <p className="text-sm text-slate-600">{h.detail}</p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-slate-400">
                          <p>{formatDateTime(h.at).split(', ').pop()}</p>
                          <p>{users.find((u) => u.id === h.actorId)?.name.split(' ')[0] ?? 'System'}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="No history found" />
        )}
      </Card>
    </>
  )
}
