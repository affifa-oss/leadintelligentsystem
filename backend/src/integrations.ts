/**
 * Outgoing CRM integrations.
 *  - Webhook: POSTs lead events (signed with HMAC-SHA256) to any URL, e.g. Zapier / Make / n8n,
 *    which can forward them to Zoho, Salesforce, Google Sheets, Slack, etc.
 *  - HubSpot: pushes a lead as a HubSpot contact using a Private App access token.
 * Secrets are stored in the database and never sent back to the browser in full.
 */
import { createHmac, randomBytes } from 'node:crypto'
import { getSetting, leads, setSetting } from './db.ts'
import { serviceName } from './shared.ts'
import type { Lead } from './shared.ts'

export interface IntegrationConfig {
  webhookUrl: string
  webhookSecret: string
  webhookEvents: string[]
  hubspotToken: string
  hubspotAutoPush: boolean
}

export const WEBHOOK_EVENTS = ['lead.created', 'lead.updated', 'lead.status_changed', 'lead.assigned'] as const

const DEFAULTS: IntegrationConfig = { webhookUrl: '', webhookSecret: '', webhookEvents: ['lead.created', 'lead.status_changed'], hubspotToken: '', hubspotAutoPush: false }

export const integrationConfig = (): IntegrationConfig => ({ ...DEFAULTS, ...getSetting<Partial<IntegrationConfig>>('integrations', {}) })

export function saveIntegrationConfig(patch: Partial<IntegrationConfig>) {
  const cfg = { ...integrationConfig(), ...patch }
  if (cfg.webhookUrl && !cfg.webhookSecret) cfg.webhookSecret = `whsec_${randomBytes(18).toString('hex')}`
  setSetting('integrations', cfg)
  return cfg
}

/** Safe view for the browser (secrets masked). */
export function publicIntegrationConfig() {
  const c = integrationConfig()
  const mask = (s: string) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : '')
  return { webhookUrl: c.webhookUrl, webhookSecret: c.webhookSecret, webhookEvents: c.webhookEvents, hubspotConnected: !!c.hubspotToken, hubspotTokenPreview: mask(c.hubspotToken), hubspotAutoPush: c.hubspotAutoPush }
}

function leadPayload(lead: Lead) {
  const i = lead.intelligence
  return {
    id: lead.id,
    company: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    industry: i.industryCategory,
    status: lead.status,
    score: i.score,
    priority: i.priority,
    potentialValue: i.potentialValue,
    bestService: i.serviceFit[0] ? serviceName(i.serviceFit[0].serviceId) : null,
    nextAction: i.nextAction,
    assignedTo: lead.assignedTo,
    createdAt: lead.createdAt,
  }
}

/** Fire-and-forget: never blocks or fails the user's action. */
export function emitLeadEvent(event: (typeof WEBHOOK_EVENTS)[number], lead: Lead) {
  const cfg = integrationConfig()
  if (cfg.webhookUrl && cfg.webhookEvents.includes(event)) void sendWebhook(cfg, event, leadPayload(lead))
  if (event === 'lead.created' && cfg.hubspotToken && cfg.hubspotAutoPush) void pushToHubspot(lead).catch((e) => console.warn('[hubspot]', e.message))
}

export async function sendWebhook(cfg: IntegrationConfig, event: string, data: unknown) {
  const body = JSON.stringify({ event, sentAt: new Date().toISOString(), data })
  const signature = createHmac('sha256', cfg.webhookSecret).update(body).digest('hex')
  try {
    const res = await fetch(cfg.webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json', 'x-leadintel-event': event, 'x-leadintel-signature': `sha256=${signature}` }, body, signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    console.warn('[webhook]', e instanceof Error ? e.message : e)
    return { ok: false, status: 0 }
  }
}

export class HubspotError extends Error {}

/** Create (or find) the contact in HubSpot and remember its id on the lead. */
export async function pushToHubspot(lead: Lead): Promise<string> {
  const token = integrationConfig().hubspotToken
  if (!token) throw new HubspotError('HubSpot is not connected. Add a Private App token in Settings → Integrations.')
  const [firstname, ...rest] = lead.contactName.split(' ')
  const properties: Record<string, string> = {
    email: lead.email,
    firstname,
    lastname: rest.join(' '),
    company: lead.companyName,
    phone: lead.phone,
    website: lead.website,
    jobtitle: lead.jobTitle,
    city: lead.location.split(',')[0]?.trim() ?? '',
    hs_lead_status: lead.status === 'new' ? 'NEW' : lead.status === 'contacted' ? 'ATTEMPTED_TO_CONTACT' : lead.status === 'lost' ? 'UNQUALIFIED' : 'OPEN',
  }
  for (const k of Object.keys(properties)) if (!properties[k]) delete properties[k]
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', { method: 'POST', headers, body: JSON.stringify({ properties }), signal: AbortSignal.timeout(15_000) })
  let id: string | undefined
  if (res.status === 409) {
    // Contact already exists: HubSpot returns its id in the message ("Existing ID: 123")
    const msg = ((await res.json().catch(() => ({}))) as { message?: string }).message ?? ''
    id = msg.match(/Existing ID:\s*(\d+)/)?.[1]
  } else if (res.ok) {
    id = ((await res.json()) as { id: string }).id
  } else if (res.status === 401 || res.status === 403) {
    throw new HubspotError('HubSpot rejected the token. Check that the Private App has the crm.objects.contacts.write scope.')
  } else {
    throw new HubspotError(`HubSpot returned an error (${res.status}).`)
  }
  if (!id) throw new HubspotError('Could not read the HubSpot contact id.')
  const fresh = await leads.byId(lead.id)
  if (fresh) await leads.save({ ...fresh, hubspotId: id })
  return id
}
