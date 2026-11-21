import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  BellRing,
  Briefcase,
  CalendarPlus,
  Check,
  Copy,
  Globe,
  Lightbulb,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Sparkles,
  Target,
  Trash2,
  Zap,
  MessageSquareText,
  CloudUpload,
} from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { AiInsightsCard } from '../components/leads/AiInsightsCard'
import { DraftMessageModal } from '../components/leads/DraftMessageModal'
import { FollowUpModal } from '../components/leads/FollowUpModal'
import { ScoreBreakdown } from '../components/leads/ScoreBreakdown'
import { WebsiteAnalysisView } from '../components/leads/WebsiteAnalysisCard'
import { Badge, PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { SelectInput, TextArea } from '../components/ui/Fields'
import { Avatar, Modal, ProgressBar } from '../components/ui/Misc'
import { serviceById, serviceName, STATUSES, timelineLabel } from '../data/catalog'
import { findDuplicates } from '../lib/duplicates'
import { nowMs, formatDate, formatDateTime, formatMoney, relativeTime } from '../lib/format'
import { useData } from '../store/data-context'
import type { LeadStatus } from '../types'

export default function LeadDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = useData()
  const { leads, users, followUps, history } = data
  const { isAdmin, canSeeLead, canEditLead } = useAuth()
  const lead = leads.find((l) => l.id === id)
  const [fuOpen, setFuOpen] = useState(false)
  const [fuNote, setFuNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draftOpen, setDraftOpen] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [summarising, setSummarising] = useState(false)

  async function aiSummary() {
    setSummarising(true)
    document.getElementById('ai-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    await data.generateAiSummary(id).catch(() => undefined)
    setSummarising(false)
  }
  const [notes, setNotes] = useState(lead?.notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)

  const duplicates = useMemo(() => (lead ? findDuplicates(lead, leads, lead.id) : []), [lead, leads])

  if (!lead || !canSeeLead(lead)) return <Navigate to="/leads" replace />

  const editable = canEditLead(lead)
  const intel = lead.intelligence
  const leadFollowUps = followUps.filter((f) => f.leadId === lead.id).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const leadHistory = history.filter((h) => h.leadId === lead.id)
  const userName = (uid: string | null) => users.find((u) => u.id === uid)?.name ?? 'System'
  const owner = users.find((u) => u.id === lead.assignedTo)

  function schedule(note = '') {
    setFuNote(note)
    setFuOpen(true)
  }

  return (
    <>
      <Link to="/leads" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800">
        <ArrowLeft className="h-4 w-4" /> All leads
      </Link>

      {/* Header */}
      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700 ring-1 ring-brand-100">
              {lead.companyName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-ink">{lead.companyName}</h1>
                <PriorityBadge priority={intel.priority} />
                <StatusBadge status={lead.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {lead.contactName}{lead.jobTitle && ` · ${lead.jobTitle}`} · {intel.industryCategory} · <span className="text-slate-400">{lead.id}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">Received {formatDateTime(lead.createdAt)} via {lead.source} · Updated {relativeTime(lead.updatedAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {editable && (
              <div className="w-44">
                <SelectInput aria-label="Lead status" value={lead.status} onChange={(e) => data.setStatus(lead.id, e.target.value as LeadStatus).catch(() => undefined)}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </SelectInput>
              </div>
            )}
            <Button icon={<Sparkles className="h-4 w-4" />} disabled={summarising} onClick={aiSummary}>{summarising ? 'Summarising…' : 'AI summary'}</Button>
            <Button variant="secondary" icon={<MessageSquareText className="h-4 w-4" />} onClick={() => setDraftOpen(true)}>Draft message</Button>
            {editable && (
              lead.hubspotId ? (
                <Badge tone="green" dot>In HubSpot</Badge>
              ) : (
                <Button variant="secondary" disabled={pushing} icon={<CloudUpload className="h-4 w-4" />} onClick={async () => { setPushing(true); await data.pushToHubspot(lead.id).catch(() => undefined); setPushing(false) }}>
                  {pushing ? 'Pushing…' : 'Push to CRM'}
                </Button>
              )
            )}
            {editable && <ButtonLink to={`/leads/${lead.id}/edit`} variant="secondary" icon={<Pencil className="h-4 w-4" />}>Edit</ButtonLink>}
            {isAdmin && <Button variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)} className="hover:!border-rose-300 hover:!bg-rose-50 hover:!text-rose-700">Delete</Button>}
          </div>
        </div>

        {/* Next action banner */}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15"><Zap className="h-[18px] w-[18px]" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-100">Recommended next action</p>
              <p className="mt-0.5 font-medium">{intel.nextAction}</p>
            </div>
          </div>
          {editable && (
            <button type="button" onClick={() => schedule(intel.nextAction)} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              <CalendarPlus className="h-4 w-4" /> Schedule it
            </button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div id="ai-summary" className="scroll-mt-24">
            <AiInsightsCard lead={lead} />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Lead score" subtitle="How the score was calculated" icon={<Target className="h-[18px] w-[18px]" />} />
              <div className="p-5"><ScoreBreakdown intel={intel} /></div>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader title="Why this score" icon={<Sparkles className="h-[18px] w-[18px]" />} />
                <ul className="space-y-2.5 p-5 text-sm text-slate-700">
                  {intel.reasoning.map((r) => (
                    <li key={r} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />{r}</li>
                  ))}
                </ul>
              </Card>
              <Card>
                <CardHeader title="Buying intent" action={<Badge tone={intel.buyingIntent.level === 'high' ? 'red' : intel.buyingIntent.level === 'medium' ? 'amber' : 'gray'} dot>{intel.buyingIntent.level[0].toUpperCase() + intel.buyingIntent.level.slice(1)}</Badge>} />
                <div className="p-5">
                  <div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-600">Intent score</span><b className="text-ink">{intel.buyingIntent.score}/100</b></div>
                  <ProgressBar value={intel.buyingIntent.score} />
                  {intel.buyingIntent.signals.length > 0 ? (
                    <ul className="mt-4 flex flex-wrap gap-1.5">{intel.buyingIntent.signals.map((s) => <li key={s}><Badge tone="blue">{s}</Badge></li>)}</ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No buying signals detected in the inquiry.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader title="Service fit & recommendations" subtitle="Which services match this client" icon={<Lightbulb className="h-[18px] w-[18px]" />} />
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              <div className="space-y-4">
                {intel.serviceFit.length ? intel.serviceFit.map((f, i) => (
                  <div key={f.serviceId}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{i === 0 && '⭐ '}{serviceName(f.serviceId)}</span>
                      <span className="text-sm font-semibold text-brand-700">{f.fit}%</span>
                    </div>
                    <ProgressBar value={f.fit} />
                    <p className="mt-1 text-xs text-slate-500">{f.reason}. From {formatMoney(serviceById(f.serviceId)?.basePrice ?? 0)}.</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No strong service match. Clarify the requirement with the client.</p>}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Follow-up suggestions</p>
                <ul className="space-y-2">
                  {intel.followUpSuggestions.map((s) => (
                    <li key={s} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      <span>{s}</span>
                      {editable && (
                        <button type="button" onClick={() => schedule(s)} title="Schedule as follow-up" aria-label={`Schedule: ${s}`} className="shrink-0 rounded-lg p-1 text-brand-600 hover:bg-brand-100">
                          <CalendarPlus className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Website analysis" subtitle="Technology, speed, SEO and opportunities" icon={<Globe className="h-[18px] w-[18px]" />} />
            <div className="p-5">
              <WebsiteAnalysisView analysis={lead.websiteAnalysis} website={lead.website} onRun={editable ? () => data.runWebsiteAnalysis(lead.id) : undefined} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Client inquiry" />
            <div className="p-5">
              <blockquote className="rounded-xl border-l-4 border-brand-400 bg-brand-50/50 p-4 text-[15px] leading-relaxed text-slate-700">“{lead.inquiry}”</blockquote>
            </div>
          </Card>

          <Card>
            <CardHeader title="Lead history" subtitle={`${leadHistory.length} events`} />
            <ol className="relative space-y-5 p-5 before:absolute before:bottom-6 before:left-[29px] before:top-6 before:w-px before:bg-slate-200">
              {leadHistory.map((h) => (
                <li key={h.id} className="relative flex gap-4">
                  <span className="relative z-10 mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white ring-4 ring-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{h.action}</p>
                    <p className="text-sm text-slate-600">{h.detail}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{userName(h.actorId)} · {formatDateTime(h.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact & company" />
            <div className="space-y-3 p-5 text-sm">
              <Info icon={<Mail className="h-4 w-4" />}><a href={`mailto:${lead.email}`} className="text-brand-600 hover:underline">{lead.email}</a></Info>
              {lead.phone && <Info icon={<Phone className="h-4 w-4" />}><a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="text-brand-600 hover:underline">{lead.phone}</a></Info>}
              {lead.website && <Info icon={<Globe className="h-4 w-4" />}><a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{lead.website.replace(/^https?:\/\//, '')}</a></Info>}
              <Info icon={<MapPin className="h-4 w-4" />}>{lead.location}</Info>
              <Info icon={<Briefcase className="h-4 w-4" />}>{lead.companySize} employees · {intel.industryCategory}</Info>
              <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <Meta label="Budget">{lead.budget ? formatMoney(lead.budget) : 'Not shared'}</Meta>
                <Meta label="Timeline">{timelineLabel(lead.timeline)}</Meta>
                <Meta label="Urgency"><span className="capitalize">{lead.urgency}</span></Meta>
                <Meta label="Source">{lead.source}</Meta>
              </dl>
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Requested services</p>
                <div className="flex flex-wrap gap-1.5">{lead.requiredServices.map((s) => <Badge key={s} tone="blue">{serviceName(s)}</Badge>)}</div>
                {lead.existingTech.length > 0 && (
                  <>
                    <p className="mb-1.5 mt-3 text-xs font-medium uppercase tracking-wider text-slate-400">Existing technology</p>
                    <div className="flex flex-wrap gap-1.5">{lead.existingTech.map((t) => <Badge key={t} tone="gray">{t}</Badge>)}</div>
                  </>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Assigned to" />
            <div className="p-5">
              {isAdmin ? (
                <SelectInput aria-label="Assign lead" value={lead.assignedTo ?? ''} onChange={(e) => data.assignLead(lead.id, e.target.value || null).catch(() => undefined)}>
                  <option value="">Unassigned</option>
                  {users.filter((u) => u.role === 'sales' && (u.active || u.id === lead.assignedTo)).map((u) => <option key={u.id} value={u.id}>{u.name}{!u.active ? ' (inactive)' : ''}</option>)}
                </SelectInput>
              ) : owner ? (
                <div className="flex items-center gap-3"><Avatar name={owner.name} /><div><p className="font-semibold text-ink">{owner.name}</p><p className="text-xs text-slate-500">{owner.title}</p></div></div>
              ) : (
                <p className="text-sm text-slate-500">Not assigned yet.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Follow-ups" icon={<BellRing className="h-[18px] w-[18px]" />} action={editable && <Button size="sm" variant="secondary" icon={<CalendarPlus className="h-4 w-4" />} onClick={() => schedule()}>Add</Button>} />
            {leadFollowUps.length ? (
              <ul className="divide-y divide-slate-100">
                {leadFollowUps.map((f) => {
                  const overdue = f.status === 'pending' && new Date(f.dueAt).getTime() < nowMs()
                  return (
                    <li key={f.id} className="flex items-start gap-3 px-5 py-3">
                      <button
                        type="button"
                        disabled={f.status === 'done' || !editable}
                        onClick={() => data.completeFollowUp(f.id).catch(() => undefined)}
                        aria-label={f.status === 'done' ? 'Completed' : 'Mark as done'}
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${f.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-brand-500'}`}
                      >
                        {f.status === 'done' && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium capitalize ${f.status === 'done' ? 'text-slate-400 line-through' : 'text-ink'}`}>{f.type}</p>
                        {f.note && <p className="text-sm text-slate-500">{f.note}</p>}
                        <p className={`mt-0.5 text-xs ${overdue ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>{overdue ? 'Overdue · ' : ''}{formatDateTime(f.dueAt)}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-slate-500">No follow-ups yet.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Notes" subtitle="Communication notes" />
            <div className="p-5">
              <TextArea value={notes} onChange={(e) => { setNotes(e.target.value); setNotesSaved(false) }} disabled={!editable} placeholder="e.g. Client prefers WhatsApp, decision maker is the CEO…" />
              {editable && (
                <div className="mt-3 flex items-center justify-end gap-3">
                  {notesSaved && <span className="text-xs text-emerald-600">Saved</span>}
                  <Button size="sm" onClick={() => data.setNotes(lead.id, notes).then(() => setNotesSaved(true), () => undefined)} disabled={notes === lead.notes}>Save notes</Button>
                </div>
              )}
            </div>
          </Card>

          {duplicates.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader title="Possible duplicates" icon={<Copy className="h-[18px] w-[18px]" />} />
              <ul className="divide-y divide-slate-100">
                {duplicates.map((d) => {
                  const other = leads.find((l) => l.id === d.leadId)!
                  return (
                    <li key={d.leadId} className="px-5 py-3">
                      <Link to={`/leads/${other.id}`} className="text-sm font-semibold text-brand-600 hover:underline">{other.companyName} · {other.contactName}</Link>
                      <p className="text-xs text-slate-500">{d.reasons.join(', ')} · {Math.round(d.confidence * 100)}% match · {formatDate(other.createdAt)}</p>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {draftOpen && <DraftMessageModal lead={lead} open onClose={() => setDraftOpen(false)} />}

      <FollowUpModal key={`${fuOpen}-${fuNote}`} open={fuOpen} onClose={() => setFuOpen(false)} lead={lead} initialNote={fuNote} />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Delete this lead?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={async () => { await data.deleteLead(lead.id).catch(() => undefined); navigate('/leads', { replace: true }) }}>Delete lead</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <b>{lead.companyName}</b> and its follow-ups and history will be removed. This cannot be undone.
        </p>
      </Modal>
    </>
  )
}

function Info({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <p className="flex items-center gap-2.5 text-slate-700"><span className="text-slate-400">{icon}</span><span className="min-w-0 truncate">{children}</span></p>
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  )
}
