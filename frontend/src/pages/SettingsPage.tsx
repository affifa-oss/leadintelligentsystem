import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Plug, RefreshCw, RotateCcw, Save, Scale, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, SelectInput, TextInput } from '../components/ui/Fields'
import { CrmSettings, EmailSettings } from '../components/settings/SystemSettings'
import { Avatar, Modal, PageHeader, Tabs } from '../components/ui/Misc'
import { DEFAULT_SCORING } from '../lib/intelligence'
import { useData } from '../store/data-context'
import type { Role, User } from '../types'

type Tab = 'profile' | 'team' | 'scoring' | 'email' | 'integrations'

const PLANNED = [
  {
    name: 'Two-way CRM sync (HubSpot / Zoho / Salesforce)',
    desc: 'Leads already go from LeadIntel to your CRM (HubSpot push and webhooks above). Bringing deal stages and updates back from the CRM is planned (needs each CRM’s OAuth app).',
  },
]

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const { users, leads, scoring, saveUser, setScoring, resetDemoData, changePassword } = useData()
  const [tab, setTab] = useState<Tab>('profile')
  const [editing, setEditing] = useState<User | null>(null)
  const [thresholds, setThresholds] = useState(scoring)
  const [confirmReset, setConfirmReset] = useState(false)

  if (!user) return null
  const tabs: { value: Tab; label: string }[] = [{ value: 'profile', label: 'My profile' }]
  if (isAdmin) tabs.push({ value: 'team', label: 'Team' }, { value: 'scoring', label: 'Scoring' }, { value: 'email', label: 'Email & reminders' }, { value: 'integrations', label: 'Integrations & AI' })

  const thresholdError = thresholds.mediumThreshold >= thresholds.highThreshold ? 'Medium threshold must be lower than High.' : ''

  return (
    <>
      <PageHeader title="Settings" description="Profile, password, team members, scoring thresholds and integrations." />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} options={tabs} /></div>

      {tab === 'profile' && (
        <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="My profile" />
            <div className="p-5">
              <div className="mb-6 flex items-center gap-4">
                <Avatar name={user.name} size="lg" />
                <div>
                  <p className="text-lg font-semibold text-ink">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.title} · {user.role === 'admin' ? 'Admin / Sales Manager' : 'Sales Employee'}</p>
                </div>
              </div>
              <ProfileForm user={user} onSave={(u) => saveUser(u).catch(() => undefined)} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Change password" icon={<KeyRound className="h-[18px] w-[18px]" />} />
            <PasswordForm onSave={(next, current) => changePassword(user.id, next, current)} />
          </Card>
        </div>
      )}

      {tab === 'team' && isAdmin && (
        <Card>
          <CardHeader
            title="Team members"
            subtitle="Admins manage Sales Employee accounts. Deactivated users cannot sign in or receive new leads."
            icon={<Users className="h-[18px] w-[18px]" />}
            action={<Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setEditing({ id: '', name: '', email: '', role: 'sales', title: 'Sales Executive', active: true })}>Add employee</Button>}
          />
          <ul className="divide-y divide-slate-100">
            {users.map((u) => {
              const count = leads.filter((l) => l.assignedTo === u.id && !['won', 'lost'].includes(l.status)).length
              return (
                <li key={u.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={u.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{u.name} {u.id === user.id && <span className="text-xs font-normal text-slate-400">(you)</span>}</p>
                      <p className="truncate text-sm text-slate-500">{u.email} · {u.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={u.role === 'admin' ? 'indigo' : 'blue'}>{u.role === 'admin' ? 'Admin' : 'Sales'}</Badge>
                    <Badge tone={u.active ? 'green' : 'gray'} dot>{u.active ? 'Active' : 'Inactive'}</Badge>
                    {u.role === 'sales' && <span className="text-xs text-slate-500">{count} open leads</span>}
                    {u.id !== user.id && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(u)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => saveUser({ ...u, active: !u.active }).catch(() => undefined)}>{u.active ? 'Deactivate' : 'Activate'}</Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {tab === 'scoring' && isAdmin && (
        <div className="grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Priority thresholds" subtitle="Saving re-scores every lead" icon={<Scale className="h-[18px] w-[18px]" />} />
            <div className="space-y-6 p-5">
              {(['highThreshold', 'mediumThreshold'] as const).map((k) => (
                <label key={k} className="block">
                  <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-700">{k === 'highThreshold' ? 'High priority from' : 'Medium priority from'}</span><b className="text-brand-700">{thresholds[k]}</b></div>
                  <input type="range" min={10} max={95} step={5} value={thresholds[k]} onChange={(e) => setThresholds({ ...thresholds, [k]: Number(e.target.value) })} className="w-full accent-brand-600" />
                </label>
              ))}
              {thresholdError && <p className="text-sm text-rose-600">{thresholdError}</p>}
              <div className="flex justify-between gap-2">
                <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setThresholds(DEFAULT_SCORING)}>Defaults</Button>
                <Button icon={<Save className="h-4 w-4" />} disabled={!!thresholdError} onClick={() => setScoring(thresholds).catch(() => undefined)}>Save & re-score</Button>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Preview" />
            <div className="space-y-3 p-5 text-sm">
              {(['high', 'medium', 'low'] as const).map((p) => {
                const n = leads.filter((l) => (p === 'high' ? l.intelligence.score >= thresholds.highThreshold : p === 'medium' ? l.intelligence.score >= thresholds.mediumThreshold && l.intelligence.score < thresholds.highThreshold : l.intelligence.score < thresholds.mediumThreshold)).length
                return <div key={p} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="capitalize text-slate-600">{p} priority</span><b className="text-ink">{n} leads</b></div>
              })}
              <p className="text-xs text-slate-500">Factor weights are explained on the Lead Scoring page.</p>
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Demo data" subtitle="Restore the original sample leads, follow-ups and users" />
            <div className="flex items-center justify-between gap-4 p-5">
              <p className="text-sm text-slate-600">Replaces everything in the database with the sample data. Use only for demos and testing.</p>
              <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmReset(true)}>Reset demo data</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'email' && isAdmin && <EmailSettings />}
      {tab === 'integrations' && isAdmin && (
        <div className="space-y-6">
          <Integrations />
          <CrmSettings />
        </div>
      )}

      <EmployeeModal key={editing?.id ?? 'none'} user={editing} onClose={() => setEditing(null)} onSave={async (u, pw) => { await saveUser(u, pw); setEditing(null) }} />

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} size="sm" title="Reset demo data?" footer={<><Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={() => { setConfirmReset(false); resetDemoData().catch(() => undefined) }}>Reset</Button></>}>
        <p className="text-sm text-slate-600">All leads, follow-ups, history and users will be replaced with the original sample data. This cannot be undone.</p>
      </Modal>
    </>
  )
}

function Integrations() {
  const { getCaptureKey, regenerateCaptureKey } = useData()
  const [key, setKey] = useState('')
  const [copied, setCopied] = useState('')
  useEffect(() => {
    getCaptureKey().then(setKey, () => undefined)
  }, [getCaptureKey])

  const endpoint = `${window.location.origin}/api/public/leads`
  const curl = `curl -X POST ${endpoint} \\\n  -H "x-api-key: ${key || 'YOUR_API_KEY'}" \\\n  -H "content-type: application/json" \\\n  -d '{"name":"Ayesha Khan","company":"Bloom Organics","email":"ayesha@example.com","website":"bloomorganics.pk","message":"We need an online store, please share a quote.","budget":8000}'`
  const form = `<form id="lead-form">\n  <input name="name" placeholder="Your name" required>\n  <input name="company" placeholder="Company">\n  <input name="email" type="email" placeholder="Email" required>\n  <textarea name="message" placeholder="How can we help?" required></textarea>\n  <button>Send</button>\n</form>\n<script>\ndocument.getElementById('lead-form').onsubmit = async (e) => {\n  e.preventDefault()\n  const data = Object.fromEntries(new FormData(e.target))\n  await fetch('${endpoint}', {\n    method: 'POST',\n    headers: { 'content-type': 'application/json', 'x-api-key': '${key || 'YOUR_API_KEY'}' },\n    body: JSON.stringify(data),\n  })\n  e.target.reset()\n}\n</script>`

  const copy = (label: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1800)
    }, () => undefined)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader title="Lead capture API" subtitle="Website contact forms or other systems can send inquiries straight into LeadIntel. Each one is scored automatically." icon={<Plug className="h-[18px] w-[18px]" />} action={<Badge tone="green" dot>Active</Badge>} />
        <div className="space-y-4 p-5">
          <Field label="Endpoint"><div className="flex gap-2"><TextInput readOnly value={endpoint} /><CopyButton copied={copied} onCopy={copy} label="endpoint" text={endpoint} /></div></Field>
          <Field label="API key" hint="Keep this secret. Regenerating it stops the old key immediately.">
            <div className="flex gap-2">
              <TextInput readOnly value={key} className="font-mono" />
              <CopyButton copied={copied} onCopy={copy} label="key" text={key} />
              <Button size="sm" variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={() => regenerateCaptureKey().then(setKey, () => undefined)}>New key</Button>
            </div>
          </Field>
          <div>
            <div className="mb-1.5 flex items-center justify-between"><p className="text-[13px] font-medium text-slate-700">Test with cURL</p><CopyButton copied={copied} onCopy={copy} label="curl" text={curl} /></div>
            <pre className="overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-relaxed text-brand-100">{curl}</pre>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between"><p className="text-[13px] font-medium text-slate-700">Website contact form snippet</p><CopyButton copied={copied} onCopy={copy} label="form" text={form} /></div>
            <pre className="max-h-64 overflow-auto rounded-xl bg-ink p-4 text-xs leading-relaxed text-brand-100">{form}</pre>
          </div>
          <p className="text-xs text-slate-500">Accepted fields: name / contactName, company / companyName, email, phone, website, industry, companySize, location, message / inquiry, budget, timeline, urgency, requiredServices, existingTech, source. Missing services are inferred from the message.</p>
        </div>
      </Card>
      <Card>
        <CardHeader title="Planned integrations" />
        <ul className="divide-y divide-slate-100">
          {PLANNED.map((i) => (
            <li key={i.name} className="flex items-center justify-between gap-4 px-5 py-4">
              <div><p className="font-semibold text-ink">{i.name}</p><p className="text-sm text-slate-500">{i.desc}</p></div>
              <Button size="sm" variant="secondary" disabled>Coming soon</Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function ProfileForm({ user, onSave }: { user: User; onSave: (u: User) => void }) {
  const [name, setName] = useState(user.name)
  const [title, setTitle] = useState(user.title)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Full name"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Job title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Email" hint="Ask your admin to change your login email"><TextInput value={user.email} disabled /></Field>
      <Field label="Role"><TextInput value={user.role === 'admin' ? 'Admin / Sales Manager' : 'Sales Employee'} disabled /></Field>
      <div className="flex justify-end sm:col-span-2">
        <Button icon={<Save className="h-4 w-4" />} disabled={!name.trim()} onClick={() => onSave({ ...user, name: name.trim(), title: title.trim() })}>Save profile</Button>
      </div>
    </div>
  )
}

function PasswordForm({ onSave }: { onSave: (next: string, current: string) => Promise<void> }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  async function submit() {
    setError('')
    if (!current || !next) return setError('Fill in all fields.')
    if (next.length < 8) return setError('New password must be at least 8 characters.')
    if (next !== confirm) return setError('New passwords do not match.')
    try {
      await onSave(next, current)
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch {
      /* toast shows the reason */
    }
  }
  return (
    <div className="space-y-4 p-5">
      <Field label="Current password"><TextInput type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
      <Field label="New password" hint="At least 8 characters"><TextInput type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
      <Field label="Confirm new password"><TextInput type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end"><Button variant="secondary" icon={<KeyRound className="h-4 w-4" />} onClick={submit}>Update password</Button></div>
    </div>
  )
}

function EmployeeModal({ user, onClose, onSave }: { user: User | null; onClose: () => void; onSave: (u: User, password?: string) => Promise<void> }) {
  const [form, setForm] = useState<User | null>(user)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  if (!form) return null
  const isNew = !user?.id
  async function save() {
    if (!form) return
    if (!form.name.trim()) return setError('Name is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email.')
    if (isNew && password.length < 8) return setError('Set a password of at least 8 characters.')
    if (!isNew && password && password.length < 8) return setError('Password must be at least 8 characters.')
    try {
      await onSave({ ...form, name: form.name.trim(), email: form.email.trim() }, password || undefined)
    } catch {
      /* toast shows the reason */
    }
  }
  return (
    <Modal open onClose={onClose} title={isNew ? 'Add employee' : `Edit ${user?.name}`} subtitle={isNew ? 'Share the email and password with the employee so they can sign in.' : undefined} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email" required><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Job title"><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Role">
          <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="sales">Sales Employee</option>
            <option value="admin">Admin / Sales Manager</option>
          </SelectInput>
        </Field>
        <Field label={isNew ? 'Password' : 'New password (optional)'} required={isNew} className="sm:col-span-2" hint="At least 8 characters">
          <TextInput type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </Modal>
  )
}

function CopyButton({ label, text, copied, onCopy }: { label: string; text: string; copied: string; onCopy: (label: string, text: string) => void }) {
  return (
    <Button size="sm" variant="secondary" icon={copied === label ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => onCopy(label, text)}>
      {copied === label ? 'Copied' : 'Copy'}
    </Button>
  )
}
