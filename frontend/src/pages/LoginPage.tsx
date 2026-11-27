import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, User as UserIcon } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { AuthBackdrop, PulsingMark, authCard } from '../components/layout/AuthBackdrop'
import { api, ApiError, setToken } from '../lib/api'
import type { User } from '../types'

const field =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white/90 pl-11 pr-4 text-sm text-ink shadow-sm transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100'

export default function LoginPage() {
  const { user, login, setUser } = useAuth()
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  // First start: no accounts exist yet, so this page creates the admin account instead of signing in.
  const [needsSetup, setNeedsSetup] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    api<{ needsSetup: boolean }>('/auth/setup')
      .then((r) => setNeedsSetup(r.needsSetup))
      .catch(() => undefined)
  }, [])

  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (needsSetup) return createAdmin()
    if (!email.trim() || !password) return setError('Please enter your email and password.')
    setBusy(true)
    const err = await login(email, password, remember)
    setBusy(false)
    if (err) return setError(err)
    navigate(from, { replace: true })
  }

  async function createAdmin() {
    if (!name.trim() || !email.trim()) return setError('Please enter your name and email.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setBusy(true)
    try {
      const r = await api<{ token: string; user: User }>('/auth/setup', { body: { name, email, password } })
      setToken(r.token, remember)
      setUser(r.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setNeedsSetup(false)
      setError(err instanceof ApiError ? err.message : 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthBackdrop>
      <Link to="/" className="mx-auto mb-4 flex w-fit items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-brand-100 backdrop-blur transition hover:-translate-y-0.5 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
      <div className={authCard}>
        <PulsingMark />
        <h1 className="mt-6 text-center text-[28px] font-extrabold tracking-tight text-ink">
          {needsSetup ? 'Create your admin account' : 'Welcome back'} <span className="inline-block origin-[70%_70%] animate-[wave_2.4s_ease-in-out_1]">👋</span>
        </h1>
        <p className="mt-1.5 text-center text-sm text-slate-500">
          {needsSetup ? (
            <>First start of <span className="font-semibold text-brand-700">LeadIntel</span>: this account will manage your team and leads.</>
          ) : (
            <>Sign in to <span className="font-semibold text-brand-700">LeadIntel</span></>
          )}
        </p>

        <form onSubmit={submit} noValidate className="mt-8 space-y-4">
          {needsSetup && (
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
              <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" className={field} />
            </div>
          )}
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className={field} />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <input type={show ? 'text' : 'password'} autoComplete={needsSetup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={needsSetup ? 'Password (at least 8 characters)' : 'Password'} aria-label="Password" className={`${field} pr-12`} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-slate-600">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
              Remember me
            </label>
            {!needsSetup && <Link to="/forgot-password" className="font-medium text-brand-600 transition hover:text-brand-800">Forgot password?</Link>}
          </div>

          {error && <p role="alert" className="animate-fade-up rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}

          <button type="submit" disabled={busy} className="shine group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-600/35 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 active:translate-y-0 disabled:opacity-70">
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <>{needsSetup ? 'Create account' : 'Sign in'} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></>}
          </button>
        </form>

      </div>
      <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} LeadIntel · Lead Intelligence System</p>
    </AuthBackdrop>
  )
}
