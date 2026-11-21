import { useCallback, useEffect, useState } from 'react'
import { BellRing, Bot, Mail, Send, Webhook } from 'lucide-react'
import { formatDateTime } from '../../lib/format'
import { useData, type CrmConfig, type OutboxEmail, type SystemStatus } from '../../store/data-context'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { Field, TextInput } from '../ui/Fields'

export function EmailSettings() {
  const { getEmailInfo, sendTestEmail, runReminders } = useData()
  const [status, setStatus] = useState<SystemStatus['email'] | null>(null)
  const [mails, setMails] = useState<OutboxEmail[]>([])
  const [to, setTo] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(() => getEmailInfo().then((r) => { setStatus(r.status); setMails(r.outbox) }, () => undefined), [getEmailInfo])
  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader
          title="Email delivery"
          subtitle="Used for follow-up reminders and password-reset links"
          icon={<Mail className="h-[18px] w-[18px]" />}
          action={status && <Badge tone={status.mode === 'smtp' ? 'green' : status.mode === 'test-inbox' ? 'blue' : 'amber'} dot>{status.mode === 'smtp' ? `SMTP: ${status.host}` : status.mode === 'test-inbox' ? 'Free test inbox' : 'Not configured'}</Badge>}
        />
        <div className="space-y-4 p-5 text-sm">
          {status?.mode === 'test-inbox' && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-brand-900">
              <p className="font-semibold">Free test inbox: no account needed</p>
              <p className="mt-1 text-brand-800/80">Emails are really sent, but only to this private test inbox (never to real people). Open any email with its <b>Open</b> link below, or see them all in the inbox:</p>
              {status.testInbox ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">Login</span>
                  <code className="break-all rounded bg-white px-2 py-1 text-xs">{status.testInbox.user}</code>
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">Password</span>
                  <code className="break-all rounded bg-white px-2 py-1 text-xs">{status.testInbox.pass}</code>
                  <span />
                  <a href={status.testInbox.loginUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">Open test inbox →</a>
                </div>
              ) : (
                <p className="mt-2 text-xs text-brand-700">The inbox is created automatically with the first email. Click “Send test” below.</p>
              )}
              <p className="mt-3 text-xs text-brand-800/70">To deliver to real inboxes later, add Gmail SMTP settings to <code>backend/.env</code> (see README).</p>
            </div>
          )}
          {status?.mode === 'off' && (
            <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Emails are saved in the outbox below but not delivered. Add SMTP settings to <code>backend/.env</code> to send them.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="Send a test email to" className="flex-1"><TextInput type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@company.com" /></Field>
            <Button icon={<Send className="h-4 w-4" />} onClick={() => sendTestEmail(to).then(load, () => undefined)}>Send test</Button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-2 text-slate-600"><BellRing className="h-4 w-4 text-brand-600" /> Reminders are emailed automatically every 5 minutes for follow-ups due within the hour.</p>
            <Button size="sm" variant="secondary" onClick={() => runReminders().then(load, () => undefined)}>Run now</Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Outbox" subtitle="The last 30 emails the system created" />
        {mails.length ? (
          <ul className="divide-y divide-slate-100">
            {mails.map((m) => (
              <li key={m.id} className="px-5 py-3">
                <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{m.subject}</span>
                    <span className="text-xs text-slate-500">To {m.to} · {formatDateTime(m.createdAt)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {m.previewUrl && (
                      <a href={m.previewUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700">
                        Open
                      </a>
                    )}
                    <Badge tone={m.status === 'sent' ? 'green' : m.status === 'test' ? 'blue' : m.status === 'failed' ? 'red' : 'gray'}>
                      {m.status === 'not-configured' ? 'Saved only' : m.status === 'test' ? 'Test inbox' : m.status}
                    </Badge>
                  </span>
                </button>
                {open === m.id && <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{m.text}{m.error ? `\n\nError: ${m.error}` : ''}</pre>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500">No emails yet.</p>
        )}
      </Card>
    </div>
  )
}

export function CrmSettings() {
  const { getCrm, saveCrm, testWebhook, getStatus } = useData()
  const [cfg, setCfg] = useState<CrmConfig | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [ai, setAi] = useState<SystemStatus['ai'] | null>(null)

  useEffect(() => {
    getCrm().then((r) => { setCfg(r.config); setEvents(r.events); setUrl(r.config.webhookUrl) }, () => undefined)
    getStatus().then((s) => setAi(s.ai), () => undefined)
  }, [getCrm, getStatus])

  if (!cfg) return null
  const save = (patch: Parameters<typeof saveCrm>[0]) => saveCrm(patch).then(setCfg, () => undefined)

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader title="Webhook (Zapier, Make, n8n, any CRM)" subtitle="Send lead events to another system. Each request is signed with HMAC-SHA256." icon={<Webhook className="h-[18px] w-[18px]" />} action={<Badge tone={cfg.webhookUrl ? 'green' : 'gray'} dot>{cfg.webhookUrl ? 'Active' : 'Off'}</Badge>} />
        <div className="space-y-4 p-5">
          <Field label="Webhook URL" hint="Leave empty to turn webhooks off"><TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/…" /></Field>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-slate-700">Events</p>
            <div className="flex flex-wrap gap-3">
              {events.map((e) => (
                <label key={e} className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={cfg.webhookEvents.includes(e)} onChange={(x) => setCfg({ ...cfg, webhookEvents: x.target.checked ? [...cfg.webhookEvents, e] : cfg.webhookEvents.filter((v) => v !== e) })} />
                  {e}
                </label>
              ))}
            </div>
          </div>
          {cfg.webhookSecret && <Field label="Signing secret" hint="Verify the x-leadintel-signature header with this secret"><TextInput readOnly value={cfg.webhookSecret} className="font-mono" /></Field>}
          <div className="flex justify-end gap-2">
            {cfg.webhookUrl && <Button variant="secondary" onClick={() => testWebhook().catch(() => undefined)}>Send test event</Button>}
            <Button onClick={() => save({ webhookUrl: url, webhookEvents: cfg.webhookEvents })}>Save webhook</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="HubSpot CRM" subtitle="Push leads to HubSpot as contacts (Private App token with crm.objects.contacts.write)" action={<Badge tone={cfg.hubspotConnected ? 'green' : 'gray'} dot>{cfg.hubspotConnected ? `Connected ${cfg.hubspotTokenPreview}` : 'Not connected'}</Badge>} />
        <div className="space-y-4 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label={cfg.hubspotConnected ? 'Replace access token' : 'Private App access token'} className="flex-1"><TextInput type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="pat-…" /></Field>
            <Button disabled={!token.trim()} onClick={() => save({ hubspotToken: token }).then(() => setToken(''))}>Connect</Button>
            {cfg.hubspotConnected && <Button variant="ghost" onClick={() => save({ disconnectHubspot: true })}>Disconnect</Button>}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={cfg.hubspotAutoPush} disabled={!cfg.hubspotConnected} onChange={(e) => save({ hubspotAutoPush: e.target.checked })} />
            Push every new lead to HubSpot automatically
          </label>
          <p className="text-xs text-slate-500">Leads can also be pushed one at a time with “Push to CRM” on the lead page. Zoho and Salesforce can be reached through the webhook above (e.g. with Zapier).</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="AI assistant" subtitle="Inquiry summaries and follow-up message drafts" icon={<Bot className="h-[18px] w-[18px]" />} action={ai && <Badge tone={ai.configured ? 'green' : 'amber'} dot>{ai.configured ? `On · ${ai.model}` : 'Template mode'}</Badge>} />
        <p className="p-5 text-sm text-slate-600">
          {ai?.configured
            ? `Summaries and drafts are written by ${ai.provider === 'gemini' ? 'Google Gemini' : 'Claude'}. Client text is treated as data, and drafts must be reviewed before sending.`
            : <>No AI key on the server, so summaries and drafts use built-in templates. Add a free Google Gemini key as <code>GEMINI_API_KEY</code> in <code>backend/.env</code> (get one at aistudio.google.com) and restart the app.</>}
        </p>
      </Card>
    </div>
  )
}
