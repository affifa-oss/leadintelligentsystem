import { useState, type FormEvent } from 'react'
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthBackdrop, PulsingMark, authCard } from '../components/layout/AuthBackdrop'
import { api, ApiError } from '../lib/api'

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <AuthBackdrop>
      <div className={authCard}>
        <PulsingMark />
        <h1 className="mt-6 text-center text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mt-1.5 text-center text-sm text-slate-500">{subtitle}</p>
        <div className="mt-7">{children}</div>
        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:-translate-x-0.5 hover:text-brand-800"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
        </div>
      </div>
    </AuthBackdrop>
  )
}

const input = 'h-12 w-full rounded-2xl border border-slate-200 bg-white/90 pl-10 pr-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100'
const button = 'shine flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 disabled:opacity-60'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.')
    setBusy(true)
    setError('')
    try {
      setSent((await api<{ message: string }>('/auth/forgot', { body: { email: email.trim() } })).message)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell title="Forgot password?" subtitle="Enter your work email and we'll send you a link to set a new password.">
      {sent ? (
        <p className="flex gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" /> {sent}</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" aria-label="Email" className={input} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={button}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </Shell>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    setError('')
    try {
      await api('/auth/reset', { body: { token, password } })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) return <Shell title="Invalid link" subtitle="This reset link is missing its token. Request a new one."><Link to="/forgot-password" className={button}>Request a new link</Link></Shell>

  return (
    <Shell title="Choose a new password" subtitle="Use at least 8 characters.">
      {done ? (
        <p className="flex gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" /> Password changed. Taking you to sign in…</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {[{ v: password, set: setPassword, label: 'New password' }, { v: confirm, set: setConfirm, label: 'Confirm new password' }].map((f) => (
            <div key={f.label} className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="password" autoComplete="new-password" value={f.v} onChange={(e) => f.set(e.target.value)} placeholder={f.label} aria-label={f.label} className={input} />
            </div>
          ))}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={button}>{busy ? 'Saving…' : 'Set new password'}</button>
        </form>
      )}
    </Shell>
  )
}
