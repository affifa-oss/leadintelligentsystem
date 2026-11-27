/**
 * Low-level document storage with two drivers:
 *  - Firestore (Firebase) when a service-account key is available: the real, persistent database.
 *  - SQLite (Node's built-in `node:sqlite`) for tests and for running without Firebase.
 * Both store plain JSON documents in named collections, so db.ts works the same on either.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore'

export type Doc = Record<string, unknown>

export interface Store {
  readonly driver: 'firestore' | 'sqlite'
  get(col: string, id: string): Promise<Doc | undefined>
  all(col: string): Promise<Doc[]>
  /** Documents whose `field` equals `value`. */
  where(col: string, field: string, value: unknown): Promise<Doc[]>
  set(col: string, id: string, doc: Doc): Promise<void>
  setMany(col: string, docs: { id: string; doc: Doc }[]): Promise<void>
  remove(col: string, ids: string[]): Promise<void>
  count(col: string): Promise<number>
  /** Atomically adds `by` to a named counter (starting from `floor`) and returns the new value. */
  increment(name: string, by: number, floor: number): Promise<number>
}

const here = dirname(fileURLToPath(import.meta.url))
const strip = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

// ── Firestore ─────────────────────────────────────────────────────────────
const BATCH_LIMIT = 450

class FirestoreStore implements Store {
  readonly driver = 'firestore' as const
  private fs: Firestore
  private prefix: string
  constructor(account: ServiceAccount, prefix = '') {
    const app = getApps()[0] ?? initializeApp({ credential: cert(account) })
    this.fs = getFirestore(app)
    this.fs.settings({ ignoreUndefinedProperties: true })
    this.prefix = prefix
  }
  private c(col: string) {
    return this.fs.collection(this.prefix + col)
  }
  async get(col: string, id: string) {
    const s = await this.c(col).doc(id).get()
    return s.exists ? (s.data() as Doc) : undefined
  }
  async all(col: string) {
    return (await this.c(col).get()).docs.map((d) => d.data() as Doc)
  }
  async where(col: string, field: string, value: unknown) {
    return (await this.c(col).where(field, '==', value).get()).docs.map((d) => d.data() as Doc)
  }
  async set(col: string, id: string, doc: Doc) {
    await this.c(col).doc(id).set(strip(doc))
  }
  async setMany(col: string, docs: { id: string; doc: Doc }[]) {
    for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
      const batch = this.fs.batch()
      for (const { id, doc } of docs.slice(i, i + BATCH_LIMIT)) batch.set(this.c(col).doc(id), strip(doc))
      await batch.commit()
    }
  }
  async remove(col: string, ids: string[]) {
    for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
      const batch = this.fs.batch()
      for (const id of ids.slice(i, i + BATCH_LIMIT)) batch.delete(this.c(col).doc(id))
      await batch.commit()
    }
  }
  async count(col: string) {
    return (await this.c(col).count().get()).data().count
  }
  async increment(name: string, by: number, floor: number) {
    const ref = this.c('counters').doc(name)
    return this.fs.runTransaction(async (t) => {
      const s = await t.get(ref)
      const value = Math.max(floor, Number(s.data()?.value ?? 0)) + by
      t.set(ref, { value, updatedAt: FieldValue.serverTimestamp() })
      return value
    })
  }
}

// ── SQLite ────────────────────────────────────────────────────────────────
class SqliteStore implements Store {
  readonly driver = 'sqlite' as const
  private db: DatabaseSync
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (col, id));
      CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL);
    `)
  }
  private rows(sql: string, ...args: (string | number)[]) {
    return (this.db.prepare(sql).all(...args) as { data: string }[]).map((r) => JSON.parse(r.data) as Doc)
  }
  async get(col: string, id: string) {
    return this.rows('SELECT data FROM docs WHERE col = ? AND id = ?', col, id)[0]
  }
  async all(col: string) {
    return this.rows('SELECT data FROM docs WHERE col = ? ORDER BY rowid', col)
  }
  async where(col: string, field: string, value: unknown) {
    return (await this.all(col)).filter((d) => d[field] === value)
  }
  async set(col: string, id: string, doc: Doc) {
    this.db.prepare('INSERT INTO docs (col, id, data) VALUES (?, ?, ?) ON CONFLICT(col, id) DO UPDATE SET data = excluded.data').run(col, id, JSON.stringify(doc))
  }
  async setMany(col: string, docs: { id: string; doc: Doc }[]) {
    this.db.exec('BEGIN')
    try {
      for (const { id, doc } of docs) await this.set(col, id, doc)
      this.db.exec('COMMIT')
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }
  async remove(col: string, ids: string[]) {
    const del = this.db.prepare('DELETE FROM docs WHERE col = ? AND id = ?')
    for (const id of ids) del.run(col, id)
  }
  async count(col: string) {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM docs WHERE col = ?').get(col) as { n: number }).n
  }
  async increment(name: string, by: number, floor: number) {
    const r = this.db.prepare('SELECT value FROM counters WHERE name = ?').get(name) as { value: number } | undefined
    const value = Math.max(floor, r?.value ?? 0) + by
    this.db.prepare('INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value').run(name, value)
    return value
  }
}

// ── driver selection ──────────────────────────────────────────────────────
/**
 * Firebase key, first match wins:
 *  1. FIREBASE_SERVICE_ACCOUNT: the key file's JSON as one environment variable
 *  2. GOOGLE_APPLICATION_CREDENTIALS: path to the key file (e.g. a Render secret file)
 *  3. backend/firebase-service-account.json
 */
function firebaseAccount(): ServiceAccount | undefined {
  if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim()) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS || resolve(here, '../firebase-service-account.json')
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as ServiceAccount) : undefined
}

function createStore(): Store {
  // Tests never touch the real Firebase database.
  const forceSqlite = process.env.NODE_ENV === 'test' || process.env.DB_DRIVER === 'sqlite'
  const account = forceSqlite ? undefined : firebaseAccount()
  if (account) {
    const s = new FirestoreStore(account, process.env.FIRESTORE_COLLECTION_PREFIX ?? '')
    console.log(`[db] Using Firebase Firestore (project ${(account as { project_id?: string }).project_id ?? account.projectId})`)
    return s
  }
  if (process.env.DB_DRIVER === 'firestore') throw new Error('DB_DRIVER=firestore but no Firebase service-account key was found.')
  const path = process.env.DB_PATH ?? resolve(here, '../data/leadintel.db')
  if (process.env.NODE_ENV !== 'test') console.log(`[db] Firebase key not found: using local SQLite file ${path}`)
  return new SqliteStore(path)
}

export const store: Store = createStore()
