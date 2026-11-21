import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { canEditLead, canSeeLead, requireAdmin, requireAuth, signToken } from '../auth.ts'
import { aiStatus, draftFollowUp, profileCompany, summarizeInquiry } from '../ai.ts'
import { followUps, history, leads, loadDemoData, outbox, passwordResets, services, settings, users } from '../db.ts'
import { emitLeadEvent, HubspotError, integrationConfig, publicIntegrationConfig, pushToHubspot, saveIntegrationConfig, sendWebhook, WEBHOOK_EVENTS } from '../integrations.ts'
import { appUrl, emailStatus, sendEmail } from '../mailer.ts'
import { sendDueReminders } from '../reminders.ts'
import { analyzeLead, findDuplicates, getServices, guessService, sanitizeLeadInput, statusLabel, STATUSES, validateLead } from '../shared.ts'
import type { FollowUp, FollowUpType, HistoryEntry, Lead, LeadInput, LeadStatus, Role, ScoringSettings, Service, User } from '../shared.ts'
import { AnalysisError, analyzeWebsite } from '../websiteAnalyzer.ts'

export const api = Router()

const now = () => new Date().toISOString()
const fail = (res: Response, status: number, error: string, details?: unknown) => res.status(status).json({ error, details })

export function logHistory(leadId: string, actorId: string, action: string, detail: string) {
  const h: HistoryEntry = { id: `H-${randomUUID()}`, leadId, at: now(), actorId, action, detail }
  history.add(h)
  return h
}

/** Load a lead the current user is allowed to see (and optionally edit). */
function loadLead(req: Request, res: Response, edit = false): Lead | undefined {
  const lead = leads.byId(String(req.params.id))
  if (!lead || !canSeeLead(req.user!, lead)) {
    fail(res, 404, 'Lead not found.')
    return
  }
  if (edit && !canEditLead(req.user!, lead)) {
    fail(res, 403, 'You can only edit leads assigned to you.')
    return
  }
  return lead
}

// ── health & auth ─────────────────────────────────────────────────────────
api.get('/health', (_req, res) => res.json({ ok: true, time: now() }))

api.post('/auth/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim()
  const password = String(req.body?.password ?? '')
  if (!email || !password) return fail(res, 400, 'Please enter your email and password.')
  const found = users.byEmailWithHash(email)
  if (!found || !bcrypt.compareSync(password, found.hash)) return fail(res, 401, 'Incorrect email or password.')
  if (!found.user.active) return fail(res, 403, 'This account has been deactivated. Contact your Sales Manager.')
  res.json({ token: signToken(found.user), user: found.user })
})

const forgotHits = new Map<string, number[]>()
api.post('/auth/forgot', async (req, res) => {
  const ip = req.ip ?? 'unknown'
  const recent = (forgotHits.get(ip) ?? []).filter((t) => Date.now() - t < 15 * 60_000)
  if (recent.length >= 5) return fail(res, 429, 'Too many requests. Please try again later.')
  forgotHits.set(ip, [...recent, Date.now()])
  const email = String(req.body?.email ?? '').trim()
  const found = email ? users.byEmailWithHash(email) : undefined
  if (found?.user.active) {
    const token = passwordResets.create(found.user.id)
    await sendEmail(
      found.user.email,
      'Reset your LeadIntel password',
      `Hi ${found.user.name.split(' ')[0]},\n\nUse this link to choose a new password (valid for 30 minutes):\n${appUrl()}/reset-password?token=${token}\n\nIf you did not ask for this, you can ignore this email.\n\n- LeadIntel`,
    )
  }
  // Same answer whether or not the email exists (no account enumeration)
  res.json({ ok: true, message: 'If that email belongs to an active account, a reset link has been sent.' })
})

api.post('/auth/reset', (req, res) => {
  const password = String(req.body?.password ?? '')
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.')
  const userId = passwordResets.consume(String(req.body?.token ?? ''))
  if (!userId) return fail(res, 400, 'This reset link is invalid or has expired. Request a new one.')
  users.setPassword(userId, password)
  res.json({ ok: true })
})

api.use(requireAuth)

api.get('/status', (_req, res) => res.json({ ai: aiStatus(), email: emailStatus() }))

api.get('/auth/me', (req, res) => res.json({ user: req.user }))

/** Everything the signed-in user may see, in one call (role-filtered on the server). */
api.get('/bootstrap', (req, res) => {
  const me = req.user!
  const visible = leads.all().filter((l) => canSeeLead(me, l))
  const ids = new Set(visible.map((l) => l.id))
  res.json({
    leads: visible,
    followUps: followUps.all().filter((f) => ids.has(f.leadId)),
    history: history.all().filter((h) => ids.has(h.leadId)),
    users: users.all(),
    scoring: settings.scoring(),
    services: services.all(),
  })
})

// ── leads ─────────────────────────────────────────────────────────────────
api.post('/leads', (req, res) => {
  const me = req.user!
  const input = sanitizeLeadInput(req.body?.input ?? {})
  const errors = validateLead(input)
  if (Object.keys(errors).length) return fail(res, 422, 'Please fix the highlighted fields.', errors)
  let assignedTo: string | null = me.role === 'admin' ? (req.body?.assignedTo ?? null) : me.id
  if (assignedTo && !users.byId(assignedTo)?.active) assignedTo = null
  const t = now()
  const lead: Lead = { ...input, id: leads.nextId(), status: 'new', assignedTo, createdBy: me.id, createdAt: t, updatedAt: t, notes: '', intelligence: analyzeLead(input, 'new', settings.scoring()) }
  leads.save(lead)
  const dupes = findDuplicates(input, leads.all(), lead.id)
  logHistory(lead.id, me.id, 'Lead created', `Inquiry received via ${input.source}. Score ${lead.intelligence.score}/100 (${lead.intelligence.priority} priority).${dupes.length ? ` Possible duplicate of ${dupes[0].leadId}.` : ''}`)
  if (assignedTo && assignedTo !== me.id) logHistory(lead.id, me.id, 'Lead assigned', `Assigned to ${users.byId(assignedTo)?.name}.`)
  emitLeadEvent('lead.created', lead)
  res.status(201).json({ lead })
})

api.put('/leads/:id', (req, res) => {
  const lead = loadLead(req, res, true)
  if (!lead) return
  const input = sanitizeLeadInput(req.body?.input ?? {})
  const errors = validateLead(input)
  if (Object.keys(errors).length) return fail(res, 422, 'Please fix the highlighted fields.', errors)
  const intelligence = analyzeLead(input, lead.status, settings.scoring())
  const websiteChanged = input.website !== lead.website
  const updated: Lead = { ...lead, ...input, intelligence, updatedAt: now(), websiteAnalysis: websiteChanged ? undefined : lead.websiteAnalysis }
  leads.save(updated)
  logHistory(lead.id, req.user!.id, 'Lead updated', `Lead details edited.${intelligence.score !== lead.intelligence.score ? ` Score ${lead.intelligence.score} → ${intelligence.score}.` : ''}`)
  emitLeadEvent('lead.updated', updated)
  res.json({ lead: updated })
})

api.delete('/leads/:id', requireAdmin, (req, res) => {
  const lead = loadLead(req, res)
  if (!lead) return
  leads.remove(lead.id)
  res.json({ ok: true })
})

api.patch('/leads/:id/status', (req, res) => {
  const lead = loadLead(req, res, true)
  if (!lead) return
  const status = req.body?.status as LeadStatus
  if (!STATUSES.some((s) => s.value === status)) return fail(res, 400, 'Unknown status.')
  if (status === lead.status) return res.json({ lead })
  const updated: Lead = { ...lead, status, intelligence: analyzeLead(lead, status, settings.scoring()), updatedAt: now() }
  leads.save(updated)
  logHistory(lead.id, req.user!.id, 'Status changed', `${statusLabel(lead.status)} → ${statusLabel(status)}`)
  emitLeadEvent('lead.status_changed', updated)
  res.json({ lead: updated })
})

api.patch('/leads/:id/assign', requireAdmin, (req, res) => {
  const lead = loadLead(req, res)
  if (!lead) return
  const userId = (req.body?.userId as string | null) || null
  const target = userId ? users.byId(userId) : null
  if (userId && (!target || !target.active)) return fail(res, 400, 'Leads can only be assigned to an active employee.')
  leads.save({ ...lead, assignedTo: userId, updatedAt: now() })
  emitLeadEvent('lead.assigned', { ...lead, assignedTo: userId })
  logHistory(lead.id, req.user!.id, userId ? 'Lead assigned' : 'Lead unassigned', userId ? `Assigned to ${target!.name}.` : 'Removed assignment.')
  res.json({ ok: true })
})

api.patch('/leads/:id/notes', (req, res) => {
  const lead = loadLead(req, res, true)
  if (!lead) return
  const notes = String(req.body?.notes ?? '').slice(0, 5000)
  leads.save({ ...lead, notes, updatedAt: now() })
  logHistory(lead.id, req.user!.id, 'Notes updated', notes.slice(0, 80) || 'Notes cleared.')
  res.json({ ok: true })
})

/** Technical website check plus an AI profile of the company (who they are, what they do, history). */
async function analyzeWithProfile(url: string) {
  const { analysis, content } = await analyzeWebsite(url)
  return { ...analysis, companyProfile: await profileCompany({ analysis, content }) }
}

api.post('/leads/:id/website-analysis', async (req, res) => {
  const lead = loadLead(req, res, true)
  if (!lead) return
  if (!lead.website) return fail(res, 400, 'This lead has no website.')
  try {
    const websiteAnalysis = await analyzeWithProfile(lead.website)
    const fresh = leads.byId(lead.id)!
    leads.save({ ...fresh, websiteAnalysis })
    logHistory(lead.id, req.user!.id, 'Website analysed', `${websiteAnalysis.url}: performance ${websiteAnalysis.performanceScore}, SEO ${websiteAnalysis.seoScore}.`)
    res.json({ websiteAnalysis })
  } catch (e) {
    fail(res, 422, e instanceof AnalysisError ? e.message : 'Website analysis failed.')
  }
})

/** Analyse any website (not linked to a lead). */
api.post('/website-analysis', async (req, res) => {
  try {
    res.json({ websiteAnalysis: await analyzeWithProfile(String(req.body?.url ?? '')) })
  } catch (e) {
    fail(res, 422, e instanceof AnalysisError ? e.message : 'Website analysis failed.')
  }
})

// ── follow-ups ────────────────────────────────────────────────────────────
const FU_TYPES: FollowUpType[] = ['call', 'email', 'meeting', 'demo']

api.post('/follow-ups', (req, res) => {
  const lead = leads.byId(String(req.body?.leadId ?? ''))
  if (!lead || !canSeeLead(req.user!, lead)) return fail(res, 404, 'Lead not found.')
  if (!canEditLead(req.user!, lead)) return fail(res, 403, 'You can only add follow-ups to your own leads.')
  const type = req.body?.type as FollowUpType
  const due = new Date(String(req.body?.dueAt ?? ''))
  if (!FU_TYPES.includes(type)) return fail(res, 400, 'Choose a follow-up type.')
  if (Number.isNaN(due.getTime())) return fail(res, 400, 'Choose a valid date and time.')
  const f: FollowUp = { id: `F-${randomUUID()}`, leadId: lead.id, type, dueAt: due.toISOString(), note: String(req.body?.note ?? '').slice(0, 1000), status: 'pending', createdBy: req.user!.id }
  followUps.save(f)
  logHistory(lead.id, req.user!.id, 'Follow-up scheduled', `${type[0].toUpperCase()}${type.slice(1)} on ${due.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}${f.note ? `: ${f.note}` : ''}`)
  res.status(201).json({ followUp: f })
})

function loadFollowUp(req: Request, res: Response) {
  const f = followUps.byId(String(req.params.id))
  const lead = f && leads.byId(f.leadId)
  if (!f || !lead || !canSeeLead(req.user!, lead)) return void fail(res, 404, 'Follow-up not found.')
  if (!canEditLead(req.user!, lead)) return void fail(res, 403, 'You can only change follow-ups on your own leads.')
  return f
}

api.patch('/follow-ups/:id/complete', (req, res) => {
  const f = loadFollowUp(req, res)
  if (!f) return
  followUps.save({ ...f, status: 'done', completedAt: now() })
  logHistory(f.leadId, req.user!.id, 'Follow-up completed', f.note || f.type)
  res.json({ ok: true })
})

api.delete('/follow-ups/:id', (req, res) => {
  const f = loadFollowUp(req, res)
  if (!f) return
  followUps.remove(f.id)
  res.json({ ok: true })
})

// ── users ─────────────────────────────────────────────────────────────────
function readUser(body: Record<string, unknown>, base?: User): User | string {
  const name = String(body.name ?? base?.name ?? '').trim()
  const email = String(body.email ?? base?.email ?? '').trim()
  const role = (body.role ?? base?.role ?? 'sales') as Role
  if (!name) return 'Name is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email.'
  if (!['admin', 'sales'].includes(role)) return 'Unknown role.'
  return { id: base?.id ?? `u-${randomUUID().slice(0, 8)}`, name: name.slice(0, 120), email: email.slice(0, 160), role, title: String(body.title ?? base?.title ?? '').trim().slice(0, 120), active: typeof body.active === 'boolean' ? body.active : (base?.active ?? true) }
}

api.post('/users', requireAdmin, (req, res) => {
  const u = readUser(req.body ?? {})
  if (typeof u === 'string') return fail(res, 400, u)
  if (users.emailTaken(u.email)) return fail(res, 409, 'Another user already has this email.')
  const password = String(req.body?.password ?? '')
  if (password && password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.')
  users.upsert(u, password || undefined)
  res.status(201).json({ user: u })
})

api.put('/users/:id', (req, res) => {
  const me = req.user!
  const base = users.byId(String(req.params.id))
  if (!base) return fail(res, 404, 'User not found.')
  const self = base.id === me.id
  if (me.role !== 'admin' && !self) return fail(res, 403, 'You can only edit your own profile.')
  // non-admins may change only their name and title; nobody can deactivate or demote themselves
  const body = me.role === 'admin' && !self ? req.body ?? {} : { name: req.body?.name, title: req.body?.title }
  const u = readUser(body, base)
  if (typeof u === 'string') return fail(res, 400, u)
  if (users.emailTaken(u.email, u.id)) return fail(res, 409, 'Another user already has this email.')
  users.upsert(u)
  res.json({ user: u })
})

api.put('/users/:id/password', (req, res) => {
  const me = req.user!
  const id = String(req.params.id)
  const password = String(req.body?.password ?? '')
  if (me.role !== 'admin' && id !== me.id) return fail(res, 403, 'Not allowed.')
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.')
  if (id === me.id) {
    const current = users.byEmailWithHash(me.email)
    if (!current || !bcrypt.compareSync(String(req.body?.currentPassword ?? ''), current.hash)) return fail(res, 400, 'Current password is incorrect.')
  }
  users.setPassword(id, password)
  res.json({ ok: true })
})

// ── settings ──────────────────────────────────────────────────────────────
api.put('/settings/scoring', requireAdmin, (req, res) => {
  const s: ScoringSettings = { highThreshold: Number(req.body?.highThreshold), mediumThreshold: Number(req.body?.mediumThreshold) }
  if (!(s.mediumThreshold >= 1 && s.highThreshold <= 100 && s.mediumThreshold < s.highThreshold)) return fail(res, 400, 'Medium threshold must be lower than High (1–100).')
  settings.setScoring(s)
  for (const l of leads.all()) leads.save({ ...l, intelligence: analyzeLead(l, l.status, s) })
  res.json({ scoring: s })
})

api.get('/settings/integration', requireAdmin, (_req, res) => res.json({ apiKey: settings.captureKey() }))
api.post('/settings/integration/regenerate', requireAdmin, (_req, res) => res.json({ apiKey: settings.regenerateCaptureKey() }))

api.post('/settings/reset-demo', requireAdmin, (_req, res) => {
  loadDemoData()
  res.json({ ok: true })
})

// ── service catalogue (Admin) ─────────────────────────────────────────────
function readService(body: Record<string, unknown>, base?: Service): Service | string {
  const name = String(body.name ?? base?.name ?? '').trim()
  if (!name) return 'Service name is required.'
  const price = Number(body.basePrice ?? base?.basePrice ?? 0)
  if (!Number.isFinite(price) || price < 0) return 'Starting price must be 0 or more.'
  const list = (v: unknown, fallback: string[] = []) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean))].slice(0, 30) : fallback
  const keywords = list(body.keywords, base?.keywords).map((k) => k.toLowerCase())
  if (!keywords.length) return 'Add at least one keyword so the system can match inquiries to this service.'
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'service'
  let id = base?.id ?? slug
  if (!base) for (let n = 2; getServices().some((x) => x.id === id); n++) id = `${slug}-${n}`
  return {
    id,
    name: name.slice(0, 80),
    category: String(body.category ?? base?.category ?? 'Other').trim().slice(0, 40) || 'Other',
    description: String(body.description ?? base?.description ?? '').trim().slice(0, 300),
    basePrice: Math.round(price),
    keywords,
    industries: list(body.industries, base?.industries),
  }
}

/** Service changes affect service fit, so every lead is re-scored. */
function rescoreAll() {
  services.activate()
  const s = settings.scoring()
  for (const l of leads.all()) leads.save({ ...l, intelligence: analyzeLead(l, l.status, s) })
}

api.post('/services', requireAdmin, (req, res) => {
  const svc = readService(req.body ?? {})
  if (typeof svc === 'string') return fail(res, 400, svc)
  services.save(svc)
  rescoreAll()
  res.status(201).json({ service: svc })
})

api.put('/services/:id', requireAdmin, (req, res) => {
  const base = getServices().find((x) => x.id === req.params.id)
  if (!base) return fail(res, 404, 'Service not found.')
  const svc = readService(req.body ?? {}, base)
  if (typeof svc === 'string') return fail(res, 400, svc)
  services.save(svc)
  rescoreAll()
  res.json({ service: svc })
})

api.delete('/services/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id)
  const using = leads.all().filter((l) => l.requiredServices.includes(id)).length
  if (using) return fail(res, 409, `${using} lead(s) requested this service. Edit those leads first, or rename the service instead of deleting it.`)
  if (getServices().length <= 1) return fail(res, 400, 'Keep at least one service in the catalogue.')
  services.remove(id)
  rescoreAll()
  res.json({ ok: true })
})

// ── AI (Gemini / Claude) features ──────────────────────────────────────────────────
api.post('/leads/:id/ai-summary', async (req, res) => {
  const lead = loadLead(req, res)
  if (!lead) return
  const ai = await summarizeInquiry(lead)
  const fresh = leads.byId(lead.id)!
  leads.save({ ...fresh, ai })
  logHistory(lead.id, req.user!.id, 'AI summary generated', ai.source === 'template' ? 'Inquiry summarised (template, AI not configured).' : `Inquiry summarised by ${ai.source === 'gemini' ? 'Gemini' : 'Claude'}.`)
  res.json({ ai })
})

api.post('/leads/:id/ai-draft', async (req, res) => {
  const lead = loadLead(req, res)
  if (!lead) return
  const channel = req.body?.channel === 'whatsapp' ? 'whatsapp' : 'email'
  const purpose = String(req.body?.purpose ?? '').slice(0, 300)
  res.json({ draft: await draftFollowUp(lead, channel, req.user!.name, purpose) })
})

// ── bulk import ───────────────────────────────────────────────────────────
api.post('/leads/import', (req, res) => {
  const me = req.user!
  const rows = Array.isArray(req.body?.rows) ? (req.body.rows as Record<string, unknown>[]) : []
  if (!rows.length) return fail(res, 400, 'No rows to import.')
  if (rows.length > 500) return fail(res, 400, 'Import at most 500 leads at a time.')
  const created: { row: number; id: string; score: number }[] = []
  const failed: { row: number; errors: string[] }[] = []
  const scoring = settings.scoring()
  rows.forEach((raw, idx) => {
    const input: LeadInput = sanitizeLeadInput(raw)
    if (!input.requiredServices.length) {
      const guess = guessService(input)
      if (guess) input.requiredServices = [guess]
    }
    const errors = validateLead(input)
    if (Object.keys(errors).length) return void failed.push({ row: idx + 1, errors: Object.values(errors) as string[] })
    const t = now()
    const lead: Lead = { ...input, id: leads.nextId(), status: 'new', assignedTo: me.role === 'admin' ? null : me.id, createdBy: me.id, createdAt: t, updatedAt: t, notes: '', intelligence: analyzeLead(input, 'new', scoring) }
    leads.save(lead)
    logHistory(lead.id, me.id, 'Lead created', `Imported from a CSV file. Score ${lead.intelligence.score}/100.`)
    emitLeadEvent('lead.created', lead)
    created.push({ row: idx + 1, id: lead.id, score: lead.intelligence.score })
  })
  res.json({ created, failed })
})

// ── email (Admin) ─────────────────────────────────────────────────────────
api.get('/settings/email', requireAdmin, (_req, res) => res.json({ status: emailStatus(), outbox: outbox.recent(30) }))

api.post('/settings/email/test', requireAdmin, async (req, res) => {
  const to = String(req.body?.to ?? req.user!.email).trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail(res, 400, 'Enter a valid email address.')
  const result = await sendEmail(to, 'LeadIntel test email', 'This is a test email from LeadIntel. If you can read this, email is working.')
  res.json({ result })
})

api.post('/settings/reminders/run', requireAdmin, async (_req, res) => res.json({ sent: await sendDueReminders() }))

// ── CRM integrations (Admin) ──────────────────────────────────────────────
api.get('/settings/crm', requireAdmin, (_req, res) => res.json({ config: publicIntegrationConfig(), events: WEBHOOK_EVENTS }))

api.put('/settings/crm', requireAdmin, (req, res) => {
  const b = req.body ?? {}
  const patch: Record<string, unknown> = {}
  if (typeof b.webhookUrl === 'string') {
    const url = b.webhookUrl.trim()
    if (url && !/^https?:\/\/\S+$/i.test(url)) return fail(res, 400, 'Webhook URL must start with http:// or https://')
    patch.webhookUrl = url
  }
  if (Array.isArray(b.webhookEvents)) patch.webhookEvents = b.webhookEvents.filter((e: string) => (WEBHOOK_EVENTS as readonly string[]).includes(e))
  if (typeof b.hubspotToken === 'string' && b.hubspotToken.trim()) patch.hubspotToken = b.hubspotToken.trim()
  if (b.disconnectHubspot === true) patch.hubspotToken = ''
  if (typeof b.hubspotAutoPush === 'boolean') patch.hubspotAutoPush = b.hubspotAutoPush
  saveIntegrationConfig(patch)
  res.json({ config: publicIntegrationConfig() })
})

api.post('/settings/crm/test-webhook', requireAdmin, async (_req, res) => {
  const cfg = integrationConfig()
  if (!cfg.webhookUrl) return fail(res, 400, 'Add a webhook URL first.')
  res.json(await sendWebhook(cfg, 'test.ping', { message: 'Test event from LeadIntel' }))
})

api.post('/leads/:id/hubspot', async (req, res) => {
  const lead = loadLead(req, res, true)
  if (!lead) return
  try {
    const id = await pushToHubspot(lead)
    logHistory(lead.id, req.user!.id, 'Pushed to CRM', `Synced to HubSpot (contact ${id}).`)
    res.json({ hubspotId: id })
  } catch (e) {
    fail(res, e instanceof HubspotError ? 400 : 502, e instanceof Error ? e.message : 'HubSpot sync failed.')
  }
})
