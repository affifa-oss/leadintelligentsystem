/**
 * Public lead-capture endpoint (CRM / website integration).
 * A company website contact form, Zapier, or another CRM can POST inquiries here with the API key
 * shown in Settings → Integrations. Each inquiry becomes a scored lead automatically.
 */
import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { leads, settings } from '../db.ts'
import { analyzeLead, findDuplicates, getServices, guessService, sanitizeLeadInput, validateLead } from '../shared.ts'
import type { Lead } from '../shared.ts'
import { emitLeadEvent } from '../integrations.ts'
import { logHistory } from './api.ts'

export const capture = Router()

const hits = new Map<string, number[]>()
function rateLimited(ip: string) {
  const t = Date.now()
  const recent = (hits.get(ip) ?? []).filter((x) => t - x < 60_000)
  recent.push(t)
  hits.set(ip, recent)
  return recent.length > 20
}

capture.post('/leads', (req, res) => {
  const key = String(req.headers['x-api-key'] ?? '')
  const expected = settings.captureKey()
  if (key.length !== expected.length || !timingSafeEqual(Buffer.from(key), Buffer.from(expected))) return res.status(401).json({ error: 'Invalid API key.' })
  if (rateLimited(req.ip ?? 'unknown')) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' })

  const body = req.body ?? {}
  // Accept friendly aliases used by typical contact forms
  const raw = {
    ...body,
    contactName: body.contactName ?? body.name,
    companyName: body.companyName ?? body.company ?? body.name,
    inquiry: body.inquiry ?? body.message,
    industry: body.industry ?? 'Other',
    location: body.location ?? 'Not provided',
    source: body.source ?? 'Website',
    requiredServices: Array.isArray(body.requiredServices) ? body.requiredServices.map((s: string) => getServices().find((x) => x.id === s || x.name.toLowerCase() === String(s).toLowerCase())?.id ?? s) : [],
  }
  const input = sanitizeLeadInput(raw)
  // Forms often lack a service choice: let the engine infer it from the message.
  if (!input.requiredServices.length) {
    const guess = guessService(input)
    if (guess) input.requiredServices = [guess]
  }
  const errors = validateLead(input)
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Invalid inquiry.', details: errors })

  const t = new Date().toISOString()
  const lead: Lead = { ...input, id: leads.nextId(), status: 'new', assignedTo: null, createdBy: 'integration', createdAt: t, updatedAt: t, notes: '', intelligence: analyzeLead(input, 'new', settings.scoring()) }
  leads.save(lead)
  const dupes = findDuplicates(input, leads.all(), lead.id)
  logHistory(lead.id, 'integration', 'Lead created', `Captured automatically from ${input.source} form. Score ${lead.intelligence.score}/100.${dupes.length ? ` Possible duplicate of ${dupes[0].leadId}.` : ''}`)
  emitLeadEvent('lead.created', lead)
  res.status(201).json({ id: lead.id, score: lead.intelligence.score, priority: lead.intelligence.priority })
})
