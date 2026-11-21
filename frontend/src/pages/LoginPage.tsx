import { useState, type FormEvent } from 'react'
import { ArrowRight, BellRing, Eye, EyeOff, Lock, Mail, Sparkles, Target, TrendingUp } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { Logo } from '../components/layout/Logo'
import { DEMO_PASSWORD, SEED_USERS } from '../data/mockData'

// Demo accounts created by the backend on first start (shown to make testing easy).
const DEMO = SEED_USERS.filter((u) => u.active).slice(0, 3)

const FEATURES = [
  { icon: Target, title: 'Automatic lead scoring', text: 'Every inquiry gets a 0–100 score with clear reasoning.' },
  { icon: TrendingUp, title: 'Priority & service fit', text: 'Know which leads to call first and what to offer them.' },
  { icon: BellRing, title: 'Follow-up reminders', text: 'Never miss a promised call, email or demo again.' },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Please enter your email and password.')
    setBusy(true)
    const err = await login(email, password, remember)
    setBusy(false)
    if (err) return setError(err)
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-10 text-white lg:flex xl:p-14">
        <span className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/[0.06]" />
        <span className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />

        <div className="relative">
          <Logo light />
        </div>

        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
            <Sparkles className="h-3.5 w-3.5" /> Lead Intelligence System
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">Turn raw inquiries into sales opportunities.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-brand-100">Understand, score, categorise and prioritise every incoming lead, all in one place.</p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-brand-100/90">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">© {new Date().getFullYear()} Lead Intelligence System · Internship project</p>
      </aside>

      {/* Form */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h2 className="mt-8 text-3xl font-bold tracking-tight text-ink lg:mt-0">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Welcome back. Sign in to manage your leads.</p>

          <form onSubmit={submit} noValidate className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-12 text-sm focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
              Keep me signed in
            </label>
            <div className="-mt-2 text-right">
              <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-800">Forgot password?</Link>
            </div>

            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}

            <button type="submit" disabled={busy} className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:from-brand-700 hover:to-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-70">
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <>Sign in <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Demo accounts</p>
            <p className="mt-1 text-xs text-slate-500">Password for all: <code className="rounded bg-white px-1.5 py-0.5 font-semibold text-ink">{DEMO_PASSWORD}</code></p>
            <div className="mt-3 space-y-1.5">
              {DEMO.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setEmail(u.email)
                    setPassword(DEMO_PASSWORD)
                    setError('')
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-sm ring-1 ring-slate-200 transition hover:ring-brand-300"
                >
                  <span className="truncate text-slate-700">{u.email}</span>
                  <span className="ml-2 shrink-0 rounded-md bg-brand-100 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">{u.role === 'admin' ? 'Admin' : 'Sales'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
