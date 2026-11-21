/**
 * SQLite storage using Node's built-in `node:sqlite` (no database server to install).
 * Leads, follow-ups and history are stored as JSON documents next to indexed columns.
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import { createHash, randomUUID } from 'node:crypto'
import { buildSeedData, DEFAULT_SCORING, DEFAULT_SERVICES, DEMO_PASSWORD, setServiceCatalog } from './shared.ts'
import type { FollowUp, HistoryEntry, Lead, ScoringSettings, Service, User } from './shared.ts'

const here = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH ?? resolve(here, '../data/leadintel.db')
mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS follow_ups (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, at TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, position INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS password_resets (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_fu_lead ON follow_ups(lead_id);
  CREATE INDEX IF NOT EXISTS idx_hist_lead ON history(lead_id);
`)

type Row = Record<string, unknown>
const parse = <T>(rows: unknown[]) => (rows as Row[]).map((r) => JSON.parse(r.data as string) as T)

// ── users ─────────────────────────────────────────────────────────────────
const toUser = (r: Row): User => ({ id: r.id as string, name: r.name as string, email: r.email as string, role: r.role as User['role'], title: r.title as string, active: !!r.active })

export const users = {
  all: () => (db.prepare('SELECT * FROM users ORDER BY role, name').all() as Row[]).map(toUser),
  byId: (id: string) => {
    const r = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined
    return r ? toUser(r) : undefined
  },
  /** Returns the user + password hash for login. */
  byEmailWithHash: (email: string) => {
    const r = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Row | undefined
    return r ? { user: toUser(r), hash: r.password_hash as string } : undefined
  },
  emailTaken: (email: string, exceptId?: string) => !!db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, exceptId ?? ''),
  upsert: (u: User, password?: string) => {
    const existing = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(u.id) as Row | undefined
    const hash = password ? bcrypt.hashSync(password, 10) : ((existing?.password_hash as string) ?? bcrypt.hashSync(DEMO_PASSWORD, 10))
    db.prepare(
      `INSERT INTO users (id, name, email, role, title, active, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, email = excluded.email, role = excluded.role, title = excluded.title, active = excluded.active, password_hash = excluded.password_hash`,
    ).run(u.id, u.name, u.email, u.role, u.title, u.active ? 1 : 0, hash)
  },
  setPassword: (id: string, password: string) => db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), id),
}

// ── leads ─────────────────────────────────────────────────────────────────
export const leads = {
  all: () => parse<Lead>(db.prepare('SELECT data FROM leads ORDER BY created_at DESC').all()),
  byId: (id: string) => {
    const r = db.prepare('SELECT data FROM leads WHERE id = ?').get(id) as Row | undefined
    return r ? (JSON.parse(r.data as string) as Lead) : undefined
  },
  save: (l: Lead) => db.prepare('INSERT INTO leads (id, created_at, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(l.id, l.createdAt, JSON.stringify(l)),
  remove: (id: string) => {
    db.prepare('DELETE FROM leads WHERE id = ?').run(id)
    db.prepare('DELETE FROM follow_ups WHERE lead_id = ?').run(id)
    db.prepare('DELETE FROM history WHERE lead_id = ?').run(id)
  },
  nextId: () => {
    const ids = (db.prepare('SELECT id FROM leads').all() as Row[]).map((r) => Number(String(r.id).replace(/\D/g, '')) || 0)
    return `L-${Math.max(1000, ...ids) + 1}`
  },
}

// ── follow-ups & history ──────────────────────────────────────────────────
export const followUps = {
  all: () => parse<FollowUp>(db.prepare('SELECT data FROM follow_ups').all()),
  byId: (id: string) => {
    const r = db.prepare('SELECT data FROM follow_ups WHERE id = ?').get(id) as Row | undefined
    return r ? (JSON.parse(r.data as string) as FollowUp) : undefined
  },
  save: (f: FollowUp) => db.prepare('INSERT INTO follow_ups (id, lead_id, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(f.id, f.leadId, JSON.stringify(f)),
  remove: (id: string) => db.prepare('DELETE FROM follow_ups WHERE id = ?').run(id),
}

export const history = {
  all: () => parse<HistoryEntry>(db.prepare('SELECT data FROM history ORDER BY at DESC').all()),
  add: (h: HistoryEntry) => db.prepare('INSERT INTO history (id, lead_id, at, data) VALUES (?, ?, ?, ?)').run(h.id, h.leadId, h.at, JSON.stringify(h)),
}

// ── services (editable catalogue) ─────────────────────────────────────────
export const services = {
  all: () => parse<Service>(db.prepare('SELECT data FROM services ORDER BY position, rowid').all()),
  save: (svc: Service, position?: number) =>
    db.prepare('INSERT INTO services (id, position, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(svc.id, position ?? Date.now(), JSON.stringify(svc)),
  remove: (id: string) => db.prepare('DELETE FROM services WHERE id = ?').run(id),
  /** Push the database catalogue into the shared scoring engine. */
  activate: () => setServiceCatalog(services.all()),
  seedIfEmpty: () => {
    const n = (db.prepare('SELECT COUNT(*) AS n FROM services').get() as Row).n as number
    if (n === 0) DEFAULT_SERVICES.forEach((svc, i) => services.save(svc, i))
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
export const outbox = {
  add: (e: Omit<OutboxEmail, 'id' | 'createdAt'>) => {
    const item: OutboxEmail = { ...e, id: randomUUID(), createdAt: new Date().toISOString() }
    db.prepare('INSERT INTO outbox (id, created_at, data) VALUES (?, ?, ?)').run(item.id, item.createdAt, JSON.stringify(item))
    db.prepare('DELETE FROM outbox WHERE id NOT IN (SELECT id FROM outbox ORDER BY created_at DESC LIMIT 200)').run()
    return item
  },
  recent: (limit = 50) => parse<OutboxEmail>(db.prepare('SELECT data FROM outbox ORDER BY created_at DESC LIMIT ?').all(limit)),
}

// ── password reset tokens (stored hashed, 30 minutes) ─────────────────────
const sha = (t: string) => createHash('sha256').update(t).digest('hex')
export const passwordResets = {
  create: (userId: string) => {
    const token = randomBytes(32).toString('hex')
    db.prepare('DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?').run(userId, new Date().toISOString())
    db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha(token), userId, new Date(Date.now() + 30 * 60_000).toISOString())
    return token
  },
  /** Returns the user id and deletes the token (single use), or undefined if invalid/expired. */
  consume: (token: string) => {
    const r = db.prepare('SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?').get(sha(token)) as Row | undefined
    if (!r) return undefined
    db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(sha(token))
    return (r.expires_at as string) > new Date().toISOString() ? (r.user_id as string) : undefined
  },
}

// ── settings ──────────────────────────────────────────────────────────────
export function getSetting<T>(key: string, fallback: T): T {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as Row | undefined
  return r ? (JSON.parse(r.value as string) as T) : fallback
}
export function setSetting(key: string, value: unknown) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value))
}

export const settings = {
  scoring: () => getSetting<ScoringSettings>('scoring', DEFAULT_SCORING),
  setScoring: (s: ScoringSettings) => setSetting('scoring', s),
  /** Secret for signing login tokens: from JWT_SECRET, otherwise generated once and stored. */
  jwtSecret: () => {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET
    let s = getSetting<string | null>('jwt_secret', null)
    if (!s) {
      s = randomBytes(48).toString('hex')
      setSetting('jwt_secret', s)
    }
    return s
  },
  /** API key for the public lead-capture endpoint (website forms / other systems). */
  captureKey: () => {
    let k = getSetting<string | null>('capture_key', null)
    if (!k) {
      k = `lis_${randomBytes(18).toString('hex')}`
      setSetting('capture_key', k)
    }
    return k
  },
  regenerateCaptureKey: () => {
    const k = `lis_${randomBytes(18).toString('hex')}`
    setSetting('capture_key', k)
    return k
  },
}

// ── seed / reset ──────────────────────────────────────────────────────────
export function loadDemoData() {
  const seed = buildSeedData()
  db.exec('BEGIN')
  try {
    db.exec('DELETE FROM leads; DELETE FROM follow_ups; DELETE FROM history; DELETE FROM services;')
    DEFAULT_SERVICES.forEach((svc, i) => services.save(svc, i))
    for (const u of seed.users) users.upsert(u, DEMO_PASSWORD)
    for (const l of seed.leads) leads.save(l)
    for (const f of seed.followUps) followUps.save(f)
    for (const h of seed.history) history.add(h)
    settings.setScoring(DEFAULT_SCORING)
    db.exec('COMMIT')
    services.activate()
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function seedIfEmpty() {
  services.seedIfEmpty()
  services.activate()
  const n = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as Row).n as number
  if (n === 0) {
    loadDemoData()
    console.log('[db] Empty database: loaded demo data (password for demo accounts: demo123)')
  }
}
