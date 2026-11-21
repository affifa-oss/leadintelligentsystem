import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ArrowLeft, Save, Sparkles } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { ScoreBreakdown } from '../components/leads/ScoreBreakdown'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { ChipPicker, Field, SelectInput, TagInput, TextArea, TextInput } from '../components/ui/Fields'
import { PageHeader } from '../components/ui/Misc'
import { COMPANY_SIZES, INDUSTRIES, getServices, serviceName, SOURCES, TECH_SUGGESTIONS, TIMELINES, URGENCIES } from '../data/catalog'
import { findDuplicates } from '../lib/duplicates'
import { analyzeLead } from '../lib/intelligence'
import { ApiError } from '../lib/api'
import { validateLead, type LeadErrors } from '../lib/validation'
import { useData } from '../store/data-context'
import type { LeadInput } from '../types'

const EMPTY: LeadInput = {
  contactName: '',
  email: '',
  phone: '',
  jobTitle: '',
  companyName: '',
  website: '',
  industry: '',
  companySize: '11-50',
  location: '',
  inquiry: '',
  budget: 0,
  timeline: 'short',
  urgency: 'medium',
  existingTech: [],
  requiredServices: [],
  source: 'Website',
}

export default function LeadFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { leads, users, scoring, addLead, updateLead } = useData()
  const { isAdmin, user, canEditLead } = useAuth()
  const existing = id ? leads.find((l) => l.id === id) : undefined
  const [values, setValues] = useState<LeadInput>(() => {
    if (!existing) return EMPTY
    const { contactName, email, phone, jobTitle, companyName, website, industry, companySize, location, inquiry, budget, timeline, urgency, existingTech, requiredServices, source } = existing
    return { contactName, email, phone, jobTitle, companyName, website, industry, companySize, location, inquiry, budget, timeline, urgency, existingTech, requiredServices, source }
  })
  const [assignee, setAssignee] = useState<string>(isAdmin ? '' : (user?.id ?? ''))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverErrors, setServerErrors] = useState<LeadErrors>({})

  const errors = useMemo<LeadErrors>(() => ({ ...serverErrors, ...validateLead(values) }), [values, serverErrors])
  const preview = useMemo(() => analyzeLead(values, existing?.status ?? 'new', scoring), [values, existing, scoring])
  const duplicates = useMemo(() => (values.email || values.companyName || values.website ? findDuplicates(values, leads, existing?.id) : []), [values, leads, existing])

  if (id && !existing) return <Navigate to="/leads" replace />
  if (existing && !canEditLead(existing)) return <Navigate to={`/leads/${existing.id}`} replace />

  const set = <K extends keyof LeadInput>(k: K, v: LeadInput[K]) => {
    setValues((s) => ({ ...s, [k]: v }))
    if (serverErrors[k]) setServerErrors((e) => ({ ...e, [k]: undefined }))
  }
  const err = (k: keyof LeadInput) => (submitted ? errors[k] : undefined)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const clean = { ...values, website: values.website.trim(), email: values.email.trim(), contactName: values.contactName.trim(), companyName: values.companyName.trim() }
    setSaving(true)
    try {
      if (existing) {
        await updateLead(existing.id, clean)
        navigate(`/leads/${existing.id}`)
      } else {
        const lead = await addLead(clean, assignee || null)
        navigate(`/leads/${lead.id}`)
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) setServerErrors(err.details as LeadErrors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title={existing ? `Edit ${existing.companyName}` : 'Add a new lead'}
        description="Fill in what the client told you. The score, priority and recommendations update live on the right."
        back={
          <Link to={existing ? `/leads/${existing.id}` : '/leads'} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />

      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Client & company" subtitle="Who is the inquiry from?" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Client name" required error={err('contactName')}><TextInput value={values.contactName} onChange={(e) => set('contactName', e.target.value)} invalid={!!err('contactName')} aria-invalid={!!err('contactName')} placeholder="e.g. Ayesha Khan" /></Field>
              <Field label="Job title"><TextInput value={values.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="e.g. Founder" /></Field>
              <Field label="Email" required error={err('email')}><TextInput type="email" value={values.email} onChange={(e) => set('email', e.target.value)} invalid={!!err('email')} aria-invalid={!!err('email')} placeholder="name@company.com" /></Field>
              <Field label="Contact number" error={err('phone')}><TextInput value={values.phone} onChange={(e) => set('phone', e.target.value)} invalid={!!err('phone')} aria-invalid={!!err('phone')} placeholder="+92 300 1234567" /></Field>
              <Field label="Company name" required error={err('companyName')}><TextInput value={values.companyName} onChange={(e) => set('companyName', e.target.value)} invalid={!!err('companyName')} aria-invalid={!!err('companyName')} placeholder="e.g. Bloom Organics" /></Field>
              <Field label="Company website" error={err('website')} hint="Used for automatic website analysis"><TextInput value={values.website} onChange={(e) => set('website', e.target.value)} invalid={!!err('website')} aria-invalid={!!err('website')} placeholder="https://example.com" /></Field>
              <Field label="Industry" required error={err('industry')}>
                <SelectInput value={values.industry} onChange={(e) => set('industry', e.target.value)} invalid={!!err('industry')} aria-invalid={!!err('industry')}>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </SelectInput>
              </Field>
              <Field label="Company size">
                <SelectInput value={values.companySize} onChange={(e) => set('companySize', e.target.value as LeadInput['companySize'])}>
                  {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
                </SelectInput>
              </Field>
              <Field label="Location" required error={err('location')}><TextInput value={values.location} onChange={(e) => set('location', e.target.value)} invalid={!!err('location')} aria-invalid={!!err('location')} placeholder="City, Country" /></Field>
              <Field label="Lead source">
                <SelectInput value={values.source} onChange={(e) => set('source', e.target.value as LeadInput['source'])}>
                  {SOURCES.map((s) => <option key={s}>{s}</option>)}
                </SelectInput>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Inquiry & requirements" subtitle="What does the client need?" />
            <div className="space-y-4 p-5">
              <Field label="Client inquiry" required error={err('inquiry')} hint="Paste or summarise the client's message. Words like “quote”, “ASAP” or “budget approved” raise buying intent.">
                <TextArea value={values.inquiry} onChange={(e) => set('inquiry', e.target.value)} invalid={!!err('inquiry')} aria-invalid={!!err('inquiry')} placeholder="e.g. We need an online store with payment gateway. Please share a quote." />
              </Field>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-slate-700">Required services<span className="ml-0.5 text-rose-500">*</span></p>
                <ChipPicker options={getServices().map((s) => ({ value: s.id, label: s.name }))} value={values.requiredServices} onChange={(v) => set('requiredServices', v)} />
                {err('requiredServices') && <p aria-invalid="true" className="mt-1 text-xs text-rose-600">{err('requiredServices')}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Estimated budget (USD)" error={err('budget')} hint="Leave 0 if unknown">
                  <TextInput type="number" min={0} step={500} value={values.budget || ''} onChange={(e) => set('budget', Math.max(0, Number(e.target.value) || 0))} placeholder="0" />
                </Field>
                <Field label="Expected timeline">
                  <SelectInput value={values.timeline} onChange={(e) => set('timeline', e.target.value as LeadInput['timeline'])}>
                    {TIMELINES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Project urgency">
                  <SelectInput value={values.urgency} onChange={(e) => set('urgency', e.target.value as LeadInput['urgency'])}>
                    {URGENCIES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </SelectInput>
                </Field>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium text-slate-700">Existing technology</p>
                <TagInput value={values.existingTech} onChange={(v) => set('existingTech', v)} suggestions={TECH_SUGGESTIONS} placeholder="Type and press Enter, e.g. WordPress" />
              </div>
              {!existing && isAdmin && (
                <Field label="Assign to" hint="You can also assign later from the lead page">
                  <SelectInput value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">Leave unassigned</option>
                    {users.filter((u) => u.role === 'sales' && u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </SelectInput>
                </Field>
              )}
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={saving} icon={<Save className="h-4 w-4" />}>{saving ? 'Saving…' : existing ? 'Save changes' : 'Save lead'}</Button>
          </div>
        </div>

        {/* Live intelligence preview */}
        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          {duplicates.length > 0 && (
            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> Possible duplicate</p>
              <ul className="mt-2 space-y-2">
                {duplicates.slice(0, 3).map((d) => {
                  const l = leads.find((x) => x.id === d.leadId)!
                  return (
                    <li key={d.leadId} className="text-sm text-amber-900">
                      <Link to={`/leads/${l.id}`} target="_blank" className="font-semibold underline">{l.companyName} · {l.contactName}</Link>
                      <span className="block text-xs text-amber-700">{d.reasons.join(', ')} · {Math.round(d.confidence * 100)}% match</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <Card>
            <CardHeader title="Live lead intelligence" subtitle="Updates as you type" icon={<Sparkles className="h-[18px] w-[18px]" />} />
            <div className="p-5">
              <ScoreBreakdown intel={preview} compact />
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Service fit</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preview.serviceFit.length ? preview.serviceFit.map((f) => <Badge key={f.serviceId} tone="blue">{serviceName(f.serviceId)} · {f.fit}%</Badge>) : <span className="text-sm text-slate-400">Select services or describe the need</span>}
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-400">Recommended next action</p>
                <p className="mt-1 text-sm text-ink">{preview.nextAction}</p>
              </div>
            </div>
          </Card>
        </aside>
      </form>
    </>
  )
}
