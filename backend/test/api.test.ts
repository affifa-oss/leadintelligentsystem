/** API tests: run the real Express app against a temporary SQLite database. */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { buildSeedData, DEMO_PASSWORD } from './fixtures/demoData.ts'

const dir = mkdtempSync(join(tmpdir(), 'leadintel-test-'))
process.env.DB_PATH = join(dir, 'test.db')
process.env.NODE_ENV = 'test'
process.env.AI_ENABLED = 'false'
process.env.PAGESPEED_ENABLED = 'false'

let base = ''
let close = () => {}

before(async () => {
  const { app } = await import('../src/app.ts')
  const server = app.listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
  close = () => server.close()

  // The app starts empty: check the first-admin setup, then load the test fixture.
  assert.equal((await call('/auth/setup')).data.needsSetup, true)
  assert.equal((await call('/auth/setup', { body: { name: 'Owner', email: 'owner@test-co.test', password: 'short' } })).status, 400)
  const setup = await call('/auth/setup', { body: { name: 'Owner', email: 'owner@test-co.test', password: 'owner-pass-123' } })
  assert.equal(setup.status, 201)
  assert.equal(setup.data.user.role, 'admin')
  assert.ok(setup.data.token)
  assert.equal((await call('/auth/setup')).data.needsSetup, false)
  assert.equal((await call('/auth/setup', { body: { name: 'Intruder', email: 'x@test-co.test', password: 'intruder-123' } })).status, 409)

  const db = await import('../src/db.ts')
  const seed = buildSeedData()
  assert.equal(db.store.driver, 'sqlite')
  for (const u of seed.users) await db.users.upsert(u, DEMO_PASSWORD)
  await db.leads.saveMany(seed.leads)
  for (const f of seed.followUps) await db.followUps.save(f)
  await db.history.addMany(seed.history)
  await db.store.increment('leadId', 0, 1000 + seed.leads.length)
})
after(() => {
  close()
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch {
    /* Windows may keep the SQLite file locked briefly */
  }
})

async function call(path: string, opts: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {}) {
  const res = await fetch(base + path, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  return { status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, any> }
}
const login = async (email: string) => (await call('/auth/login', { body: { email, password: 'demo123' } })).data.token as string

const newLead = {
  contactName: 'Api Test',
  email: 'api@test-co.test',
  companyName: 'Test Co',
  industry: 'Education',
  location: 'Islamabad',
  inquiry: 'We need a school website with online admissions. Please send a quote.',
  budget: 4000,
  requiredServices: ['web'],
}

describe('authentication', () => {
  it('rejects a wrong password', async () => {
    assert.equal((await call('/auth/login', { body: { email: 'admin@leadintel.dev', password: 'wrong' } })).status, 401)
  })
  it('requires a token for data', async () => {
    assert.equal((await call('/bootstrap')).status, 401)
  })
  it('signs in a demo admin and returns a token', async () => {
    assert.ok(await login('admin@leadintel.dev'))
  })
})

describe('role-based access', () => {
  it('admin sees all leads, a sales employee only their own', async () => {
    const all = (await call('/bootstrap', { token: await login('admin@leadintel.dev') })).data.leads.length
    const mine = (await call('/bootstrap', { token: await login('sara@leadintel.dev') })).data.leads as { assignedTo: string; createdBy: string }[]
    assert.ok(mine.length > 0 && mine.length < all)
    assert.ok(mine.every((l) => l.assignedTo === 'u-sara' || l.createdBy === 'u-sara'))
  })
  it('a sales employee cannot delete leads or manage services', async () => {
    const t = await login('sara@leadintel.dev')
    assert.equal((await call('/leads/L-1001', { method: 'DELETE', token: t })).status, 403)
    assert.equal((await call('/services', { body: { name: 'X', keywords: ['x'] }, token: t })).status, 403)
  })
  it('a sales employee cannot change a lead assigned to someone else', async () => {
    const res = await call('/leads/L-1002/status', { method: 'PATCH', body: { status: 'won' }, token: await login('sara@leadintel.dev') })
    assert.equal(res.status, 404)
  })
})

describe('leads', () => {
  it('validates input on the server', async () => {
    const r = await call('/leads', { body: { input: { contactName: '' } }, token: await login('admin@leadintel.dev') })
    assert.equal(r.status, 422)
    assert.ok(r.data.details.email)
  })
  it('creates, scores and logs a new lead', async () => {
    const t = await login('admin@leadintel.dev')
    const r = await call('/leads', { body: { input: newLead }, token: t })
    assert.equal(r.status, 201)
    assert.ok(r.data.lead.intelligence.score > 0)
    const boot = (await call('/bootstrap', { token: t })).data
    assert.ok(boot.history.some((h: { leadId: string; action: string }) => h.leadId === r.data.lead.id && h.action === 'Lead created'))
  })
  it('imports valid rows and reports invalid ones', async () => {
    const r = await call('/leads/import', { body: { rows: [{ ...newLead, email: 'row1@test-co.test' }, { contactName: '' }] }, token: await login('admin@leadintel.dev') })
    assert.equal(r.data.created.length, 1)
    assert.equal(r.data.failed.length, 1)
  })
  it('produces an inquiry summary and a draft (template mode without an AI key)', async () => {
    const t = await login('admin@leadintel.dev')
    const s = await call('/leads/L-1001/ai-summary', { body: {}, token: t })
    assert.equal(s.data.ai.source, 'template')
    assert.ok(s.data.ai.summary.includes('Bloom Organics'))
    const d = await call('/leads/L-1001/ai-draft', { body: { channel: 'whatsapp' }, token: t })
    assert.ok(d.data.draft.body.length > 20)
  })
})

describe('services', () => {
  it('adds a service and re-scores leads', async () => {
    const t = await login('admin@leadintel.dev')
    const r = await call('/services', { body: { name: 'Chatbot Setup', basePrice: 900, keywords: ['chatbot', 'whatsapp bot'] }, token: t })
    assert.equal(r.status, 201)
    assert.equal(r.data.service.id, 'chatbot-setup')
  })
  it('refuses to delete a service that leads use', async () => {
    assert.equal((await call('/services/web', { method: 'DELETE', token: await login('admin@leadintel.dev') })).status, 409)
  })
})

describe('integrations & security', () => {
  it('rejects lead capture without the API key', async () => {
    assert.equal((await call('/public/leads', { body: newLead, headers: { 'x-api-key': 'nope' } })).status, 401)
  })
  it('captures a lead with the API key and infers a service', async () => {
    const key = (await call('/settings/integration', { token: await login('admin@leadintel.dev') })).data.apiKey
    const r = await call('/public/leads', { body: { name: 'Form Visitor', company: 'Shop', email: 'v@shop.test', message: 'We need an online store with checkout.' }, headers: { 'x-api-key': key } })
    assert.equal(r.status, 201)
  })
  it('blocks website analysis of local addresses', async () => {
    const t = await login('admin@leadintel.dev')
    assert.equal((await call('/website-analysis', { body: { url: 'http://localhost' }, token: t })).status, 422)
    assert.equal((await call('/website-analysis', { body: { url: 'http://192.168.1.1' }, token: t })).status, 422)
  })
  it('password reset: unknown emails get the same answer; bad tokens are rejected', async () => {
    const r = await call('/auth/forgot', { body: { email: 'nobody@nowhere.test' } })
    assert.equal(r.status, 200)
    assert.equal((await call('/auth/reset', { body: { token: 'bad', password: 'newpassword1' } })).status, 400)
  })
})
