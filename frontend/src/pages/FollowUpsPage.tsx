import { useMemo, useState } from 'react'
import { CalendarPlus, Check, Mail, Phone, Presentation, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { FollowUpModal } from '../components/leads/FollowUpModal'
import { PriorityBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState, PageHeader, Tabs } from '../components/ui/Misc'
import { nowMs, formatDateTime, relativeTime, startOfToday } from '../lib/format'
import { useData } from '../store/data-context'
import { useVisibleLeads } from '../store/useVisibleLeads'
import type { FollowUp } from '../types'

type View = 'overdue' | 'today' | 'upcoming' | 'done'
const ICON = { call: Phone, email: Mail, meeting: Users, demo: Presentation }

export default function FollowUpsPage() {
  const { completeFollowUp, deleteFollowUp, users } = useData()
  const { canEditLead } = useAuth()
  const { leads, followUps } = useVisibleLeads()
  const [view, setView] = useState<View>('overdue')
  const [open, setOpen] = useState(false)

  const groups = useMemo(() => {
    const now = nowMs()
    const endToday = startOfToday() + 86_400_000
    const pending = followUps.filter((f) => f.status === 'pending')
    const t = (f: FollowUp) => new Date(f.dueAt).getTime()
    return {
      overdue: pending.filter((f) => t(f) < now).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      today: pending.filter((f) => t(f) >= now && t(f) < endToday).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      upcoming: pending.filter((f) => t(f) >= endToday).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
      done: followUps.filter((f) => f.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    }
  }, [followUps])

  const list = groups[view]
  const leadOf = (id: string) => leads.find((l) => l.id === id)

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description="Calls, emails, meetings and demos you promised clients. Overdue items also appear in the bell reminder."
        actions={<Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setOpen(true)}>Schedule follow-up</Button>}
      />

      <div className="mb-4">
        <Tabs<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'overdue', label: 'Overdue', count: groups.overdue.length },
            { value: 'today', label: 'Today', count: groups.today.length },
            { value: 'upcoming', label: 'Upcoming', count: groups.upcoming.length },
            { value: 'done', label: 'Completed', count: groups.done.length },
          ]}
        />
      </div>

      <Card>
        {list.length ? (
          <ul className="divide-y divide-slate-100">
            {list.map((f) => {
              const lead = leadOf(f.leadId)
              if (!lead) return null
              const Icon = ICON[f.type]
              const editable = canEditLead(lead)
              return (
                <li key={f.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${view === 'overdue' ? 'bg-rose-50 text-rose-600' : view === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/leads/${lead.id}`} className="font-semibold text-ink hover:text-brand-700">{lead.companyName}</Link>
                      <PriorityBadge priority={lead.intelligence.priority} />
                    </div>
                    <p className="text-sm text-slate-600"><span className="font-medium capitalize">{f.type}</span>{f.note && ` · ${f.note}`}</p>
                    <p className={`text-xs ${view === 'overdue' ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>
                      {view === 'done' ? `Completed ${formatDateTime(f.completedAt)}` : `${formatDateTime(f.dueAt)} · ${relativeTime(f.dueAt)}`} · by {users.find((u) => u.id === f.createdBy)?.name ?? '—'}
                    </p>
                  </div>
                  {view !== 'done' && editable && (
                    <div className="flex gap-2">
                      <Button size="sm" icon={<Check className="h-4 w-4" />} onClick={() => completeFollowUp(f.id).catch(() => undefined)}>Done</Button>
                      <Button size="sm" variant="ghost" aria-label="Delete follow-up" onClick={() => deleteFollowUp(f.id).catch(() => undefined)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState title={view === 'overdue' ? 'Nothing overdue 🎉' : view === 'done' ? 'No completed follow-ups yet' : 'Nothing scheduled'} message="Schedule follow-ups from a lead page or with the button above." />
        )}
      </Card>

      <FollowUpModal key={String(open)} open={open} onClose={() => setOpen(false)} leads={leads.filter((l) => canEditLead(l) && l.status !== 'won' && l.status !== 'lost')} />
    </>
  )
}
