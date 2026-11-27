/**
 * Email sending.
 *  1. Real SMTP when SMTP_HOST is set (Gmail app password, Outlook, Zoho Mail…).
 *  2. Otherwise a FREE TEST INBOX from Ethereal (https://ethereal.email): created automatically, no account or
 *     signup needed. Emails are really sent, but only to that test inbox, never to real people. Each email gets
 *     a preview link, and the whole inbox can be opened with the login shown in Settings → Email.
 *  3. If neither works (e.g. offline), the email is only saved in the outbox.
 * Every email is recorded in the outbox either way.
 */
import nodemailer, { type Transporter } from 'nodemailer'
import { getSetting, outbox, setSetting } from './db.ts'

// SMTP is used only when it is complete (a username without its password would just fail).
const host = process.env.SMTP_HOST && (!process.env.SMTP_USER || process.env.SMTP_PASS) ? process.env.SMTP_HOST : undefined
const port = Number(process.env.SMTP_PORT) || 587
const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'LeadIntel <no-reply@leadintel.local>'
const testInboxAllowed = process.env.EMAIL_TEST_INBOX !== 'false' && process.env.NODE_ENV !== 'test'

const transport = host
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null

interface TestAccount {
  user: string
  pass: string
  smtp: { host: string; port: number; secure: boolean }
}

let testTransport: Transporter | null = null

/** Creates (once) and reuses a free Ethereal test inbox. The login is stored so it stays the same. */
async function getTestTransport() {
  if (!testInboxAllowed) return null
  if (testTransport) return testTransport
  let account = getSetting<TestAccount | null>('ethereal_account', null)
  if (!account) {
    const a = await nodemailer.createTestAccount()
    account = { user: a.user, pass: a.pass, smtp: { host: a.smtp.host, port: a.smtp.port, secure: a.smtp.secure } }
    await setSetting('ethereal_account', account)
    console.log(`[email] Free test inbox created: ${account.user} (login at https://ethereal.email/login)`)
  }
  // Many networks block 587/465, so try the usual ports and keep the first that connects.
  const options = [
    { port: account.smtp.port, secure: account.smtp.secure },
    { port: 465, secure: true },
    { port: 2525, secure: false },
  ]
  for (const o of options) {
    const t = nodemailer.createTransport({ host: account.smtp.host, ...o, auth: { user: account.user, pass: account.pass }, connectionTimeout: 6000, greetingTimeout: 6000 })
    try {
      await t.verify()
      testTransport = t
      return t
    } catch {
      /* try the next port */
    }
  }
  throw new Error('Could not reach the test inbox on ports 587, 465 or 2525.')
}

export const emailConfigured = () => !!transport

export function emailStatus() {
  const account = getSetting<TestAccount | null>('ethereal_account', null)
  return {
    configured: !!transport,
    mode: transport ? ('smtp' as const) : testInboxAllowed ? ('test-inbox' as const) : ('off' as const),
    host: host ?? null,
    from,
    testInbox: !transport && account ? { user: account.user, pass: account.pass, loginUrl: 'https://ethereal.email/login' } : null,
  }
}

export async function sendEmail(to: string, subject: string, text: string) {
  if (transport) {
    try {
      await transport.sendMail({ from, to, subject, text })
      return outbox.add({ to, subject, text, status: 'sent' })
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      console.error('[email] send failed:', error)
      return outbox.add({ to, subject, text, status: 'failed', error })
    }
  }
  try {
    const test = await getTestTransport()
    if (test) {
      const info = await test.sendMail({ from: 'LeadIntel <no-reply@leadintel.test>', to, subject, text })
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined
      return outbox.add({ to, subject, text, status: 'test', previewUrl })
    }
  } catch (e) {
    console.warn('[email] test inbox unavailable (offline?), saved to outbox only:', e instanceof Error ? e.message : e)
  }
  return outbox.add({ to, subject, text, status: 'not-configured' })
}

export const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
