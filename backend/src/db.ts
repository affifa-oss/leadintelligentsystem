/**
 * Data access for the app: users, leads, follow-ups, history, services, settings, outbox and password resets.
 * Documents live in Firebase Firestore (or local SQLite for tests), see store.ts.
 * Settings are small and read on almost every request, so they are kept in memory and written through.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { DEFAULT_SCORING, DEFAULT_SERVICES, setServiceCatalog } from './shared.ts'
import type { FollowUp, HistoryEntry, Lead, ScoringSettings, Service, User } from './shared.ts'
import { store, type Doc } from './store.ts'

export { store }

const C = {
  users: 'users',
  leads: 'leads',
  followUps: 'followUps',
  history: 'history',
  services: 'services',
  settings: 'settings',
  outbox: 'outbox',
  passwordResets: 'passwordResets',
} as const

const desc = (key: string) => (a: Doc, b: Doc) => String(b[key] ?? '').localeCompare(String(a[key] ?? ''))

// ── users ─────────────────────────────────────────────────────────────────
interface UserDoc extends User {
  emailLower: string
  passwordHash: string
}
const toUser = (d: Doc): User => {
  const u = d as unknown as UserDoc
  return { id: u.id, name: u.name, email: u.email, role: u.role, title: u.title ?? '', active: !!u.active }
}
const byEmail = async (email: string) => (await store.where(C.users, 'emailLower', email.trim().toLowerCase()))[0] as unknown as UserDoc | undefined

export const users = {
  all: async () =>
    (await store.all(C.users)).map(toUser).sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
  byId: async (id: string) => {
    const d = await store.get(C.users, id)
    return d ? toUser(d) : undefined
  },
  /** Returns the user + password hash for login. */
  byEmailWithHash: async (email: string) => {
    const d = await byEmail(email)
    return d ? { user: toUser(d as unknown as Doc), hash: d.passwordHash } : undefined
  },
  emailTaken: async (email: string, exceptId?: string) => {
    const d = await byEmail(email)
    return !!d && d.id !== exceptId
  },
  count: () => store.count(C.users),
  upsert: async (u: User, password?: string) => {
    const existing = (await store.get(C.users, u.id)) as UserDoc | undefined
    const passwordHash = password ? bcrypt.hashSync(password, 10) : existing?.passwordHash
    if (!passwordHash) throw new Error('A password is required for a new user.')
    const doc: UserDoc = { ...u, emailLower: u.email.trim().toLowerCase(), passwordHash }
    await store.set(C.users, u.id, doc as unknown as Doc)
  },
  setPassword: async (id: string, password: string) => {
    const existing = await store.get(C.users, id)
    if (existing) await store.set(C.users, id, { ...existing, passwordHash: bcrypt.hashSync(password, 10) })
  },
}

// ── leads ─────────────────────────────────────────────────────────────────
const leadNumber = (id: string) => Number(id.replace(/\D/g, '')) || 0

export const leads = {
  all: async () => ((await store.all(C.leads)).sort(desc('createdAt')) as unknown as Lead[]),
  byId: async (id: string) => (await store.get(C.leads, id)) as Lead | undefined,
  save: (l: Lead) => store.set(C.leads, l.id, l as unknown as Doc),
  saveMany: (list: Lead[]) => store.setMany(C.leads, list.map((l) => ({ id: l.id, doc: l as unknown as Doc }))),
  /** Deletes the lead together with its follow-ups and history. */
  remove: async (id: string) => {
    const [fus, hist] = await Promise.all([store.where(C.followUps, 'leadId', id), store.where(C.history, 'leadId', id)])
    await Promise.all([
      store.remove(C.leads, [id]),
      store.remove(C.followUps, fus.map((f) => String(f.id))),
      store.remove(C.history, hist.map((h) => String(h.id))),
    ])
  },
  /** Reserves `count` new sequential ids (L-1001, L-1002, …). */
  nextIds: async (count = 1) => {
    const last = await store.increment('leadId', count, 1000)
    return Array.from({ length: count }, (_, i) => `L-${last - count + 1 + i}`)
  },
  nextId: async () => (await leads.nextIds(1))[0],
}

// ── follow-ups & history ──────────────────────────────────────────────────
export const followUps = {
  all: async () => (await store.all(C.followUps)) as unknown as FollowUp[],
  byId: async (id: string) => (await store.get(C.followUps, id)) as FollowUp | undefined,
  save: (f: FollowUp) => store.set(C.followUps, f.id, f as unknown as Doc),
  remove: (id: string) => store.remove(C.followUps, [id]),
}

export const history = {
  all: async () => ((await store.all(C.history)).sort(desc('at')) as unknown as HistoryEntry[]),
  add: (h: HistoryEntry) => store.set(C.history, h.id, h as unknown as Doc),
  addMany: (list: HistoryEntry[]) => store.setMany(C.history, list.map((h) => ({ id: h.id, doc: h as unknown as Doc }))),
}

// ── services (editable catalogue) ─────────────────────────────────────────
interface ServiceDoc extends Service {
  position: number
}
export const services = {
  all: async () =>
    ((await store.all(C.services)) as unknown as ServiceDoc[])
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(({ position: _p, ...svc }) => svc as Service),
  save: async (svc: Service, position?: number) => {
    const existing = (await store.get(C.services, svc.id)) as ServiceDoc | undefined
    await store.set(C.services, svc.id, { ...svc, position: position ?? existing?.position ?? Date.now() })
  },
  remove: (id: string) => store.remove(C.services, [id]),
  /** Push the database catalogue into the shared scoring engine. */
  activate: async () => setServiceCatalog(await services.all()),
  seedIfEmpty: async () => {
    if ((await store.count(C.services)) === 0) await store.setMany(C.services, DEFAULT_SERVICES.map((svc, i) => ({ id: svc.id, doc: { ...svc, position: i } })))
  },
}

// ── email outbox (every email is recorded; sent via SMTP when configured) ──
export interface OutboxEmail {
  id: string
  createdAt: string
  to: string
  subject: string
  text: string
  status: 'sent' | 'test' | 'not-configured' | 'failed'
  error?: string
  /** Link to view the email in the free Ethereal test inbox. */
  previewUrl?: string
}
const OUTBOX_KEEP = 200
export const outbox = {
  add: async (e: Omit<OutboxEmail, 'id' | 'createdAt'>) => {
    const item: OutboxEmail = { ...e, id: randomUUID(), createdAt: new Date().toISOString() }
    await store.set(C.outbox, item.id, item as unknown as Doc)
    if ((await store.count(C.outbox)) > OUTBOX_KEEP + 20) {
      const old = (await store.all(C.outbox)).sort(desc('createdAt')).slice(OUTBOX_KEEP)
      await store.remove(C.outbox, old.map((o) => String(o.id)))
    }
    return item
  },
  recent: async (limit = 50) => ((await store.all(C.outbox)).sort(desc('createdAt')).slice(0, limit) as unknown as OutboxEmail[]),
}

// ── password reset tokens (stored hashed, 30 minutes) ─────────────────────
const sha = (t: string) => createHash('sha256').update(t).digest('hex')
export const passwordResets = {
  create: async (userId: string) => {
    const token = randomBytes(32).toString('hex')
    const nowIso = new Date().toISOString()
    const stale = (await store.all(C.passwordResets)).filter((r) => r.userId === userId || String(r.expiresAt) < nowIso)
    await store.remove(C.passwordResets, stale.map((r) => String(r.id)))
    const id = sha(token)
    await store.set(C.passwordResets, id, { id, userId, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() })
    return token
  },
  /** Returns the user id and deletes the token (single use), or undefined if invalid/expired. */
  consume: async (token: string) => {
    const id = sha(token)
    const r = await store.get(C.passwordResets, id)
    if (!r) return undefined
    await store.remove(C.passwordResets, [id])
    return String(r.expiresAt) > new Date().toISOString() ? String(r.userId) : undefined
  },
}

// ── settings (cached in memory, written through) ──────────────────────────
const settingsCache = new Map<string, unknown>()

export function getSetting<T>(key: string, fallback: T): T {
  return settingsCache.has(key) ? (settingsCache.get(key) as T) : fallback
}
export function setSetting(key: string, value: unknown) {
  settingsCache.set(key, value)
  return store.set(C.settings, key, { key, value }).catch((e) => console.error(`[db] could not save setting "${key}":`, e))
}

const newCaptureKey = () => `lis_${randomBytes(18).toString('hex')}`

export const settings = {
  scoring: () => getSetting<ScoringSettings>('scoring', DEFAULT_SCORING),
  setScoring: (s: ScoringSettings) => setSetting('scoring', s),
  /** Secret for signing login tokens: from JWT_SECRET, otherwise generated once and stored. */
  jwtSecret: () => process.env.JWT_SECRET || getSetting<string>('jwt_secret', ''),
  /** API key for the public lead-capture endpoint (website forms / other systems). */
  captureKey: () => getSetting<string>('capture_key', ''),
  regenerateCaptureKey: async () => {
    const k = newCaptureKey()
    await setSetting('capture_key', k)
    return k
  },
}

// ── first start ───────────────────────────────────────────────────────────
/**
 * Loads settings and the service catalogue. The app ships without sample data: on an empty database the
 * first admin is created from ADMIN_EMAIL / ADMIN_PASSWORD (optional ADMIN_NAME) when set; otherwise the
 * login page offers a one-time "create admin account" step (see POST /api/auth/setup).
 */
export async function initDatabase() {
  for (const d of await store.all(C.settings)) settingsCache.set(String(d.key), d.value)
  if (!process.env.JWT_SECRET && !getSetting('jwt_secret', '')) await setSetting('jwt_secret', randomBytes(48).toString('hex'))
  if (!settings.captureKey()) await setSetting('capture_key', newCaptureKey())

  await services.seedIfEmpty()
  await services.activate()

  if ((await users.count()) > 0) return
  const email = process.env.ADMIN_EMAIL?.trim()
  const password = process.env.ADMIN_PASSWORD ?? ''
  if (email && password.length >= 8) {
    await users.upsert({ id: `u-${randomUUID().slice(0, 8)}`, name: process.env.ADMIN_NAME?.trim() || 'Admin', email, role: 'admin', title: 'Sales Manager', active: true }, password)
    console.log(`[db] Empty database: created admin account ${email}`)
  } else if (process.env.NODE_ENV !== 'test') {
    console.log('[db] Empty database: open the app and create the first admin account on the login page')
  }
}
