import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, BellRing, Bot, Boxes, Check, ChevronDown, Clock, Copy, FileSpreadsheet, Gauge, Globe, History,
  Inbox, Lock, Mail, Menu, MessageCircle, Plug, Search, Send, ShieldCheck, Sparkles, Target, TrendingUp, Upload, UserCog, Users,
  Webhook, Workflow, X, Zap,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { Logo } from '../components/layout/Logo'

/* ───────────────────────── helpers ───────────────────────── */

/** Fades its children in once they scroll into view. */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-visible')
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function SectionHead({ eyebrow, title, text, center = true }: { eyebrow: string; title: ReactNode; text?: string; center?: boolean }) {
  return (
    <Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 ring-1 ring-brand-100">
        <Sparkles className="h-3 w-3" /> {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-[40px]">{title}</h2>
      {text && <p className="mt-4 text-base leading-relaxed text-slate-500 sm:text-lg">{text}</p>}
    </Reveal>
  )
}

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#scoring', label: 'Scoring' },
  { href: '#integrations', label: 'Integrations' },
  { href: '#faq', label: 'FAQ' },
]

/* ───────────────────────── nav ───────────────────────── */

function Nav() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled || open ? 'border-b border-brand-100 bg-white/80 shadow-sm shadow-brand-900/5 backdrop-blur-xl' : 'border-b border-transparent'}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-8">
        <a href="#top" aria-label="LeadIntel home"><Logo /></a>
        <nav className="hidden flex-1 items-center gap-7 text-sm font-medium text-slate-500 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-brand-700">{l.label}</a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {user ? (
            <Link to="/dashboard" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 px-4 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:-translate-y-0.5">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-700">Log in</Link>
              <Link to="/login" className="shine inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 px-4 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:-translate-y-0.5">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
        <button className="ml-auto rounded-xl p-2 text-ink lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="animate-fade-up border-t border-brand-100 bg-white px-5 pb-5 lg:hidden">
          <nav className="flex flex-col py-2">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-[15px] font-medium text-ink">{l.label}</a>
            ))}
          </nav>
          {user ? (
            <Link to="/dashboard" className="flex h-11 items-center justify-center rounded-xl bg-brand-600 font-semibold text-white">Open dashboard</Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link to="/login" className="flex h-11 items-center justify-center rounded-xl border border-brand-200 font-semibold text-brand-700">Log in</Link>
              <Link to="/login" className="flex h-11 items-center justify-center rounded-xl bg-brand-600 font-semibold text-white">Get started</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

/* ───────────────────────── hero preview ───────────────────────── */

const BREAKDOWN = [
  { label: 'Budget', value: 23, max: 25 },
  { label: 'Timeline', value: 13, max: 15 },
  { label: 'Company size', value: 12, max: 15 },
  { label: 'Service fit', value: 14, max: 15 },
  { label: 'Buying intent', value: 13, max: 15 },
]

function ScoreRing({ score }: { score: number }) {
  const r = 38
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#d7f7e9" strokeWidth="9" />
        <circle
          cx="48" cy="48" r={r} fill="none" stroke="url(#lp-ring)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100}
          className="animate-ring" style={{ ['--ring-full' as string]: `${c}` }}
        />
        <defs>
          <linearGradient id="lp-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#47cb9c" />
            <stop offset="100%" stopColor="#0f7357" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-ink">{score}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">score</span>
      </div>
    </div>
  )
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="pointer-events-none absolute -inset-8 rounded-[48px] bg-gradient-to-br from-brand-200/70 via-brand-100/40 to-transparent blur-3xl" />

      {/* main lead card */}
      <div className="relative animate-pop-in rounded-3xl border border-brand-100 bg-white/95 p-6 shadow-2xl shadow-brand-900/10 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white">NB</span>
            <div>
              <p className="font-bold text-ink">Northwind Bakery</p>
              <p className="text-xs text-slate-500">Food &amp; Beverage · 25 employees · Lahore</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-100">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> High priority
          </span>
        </div>

        <div className="mt-5 flex items-center gap-5">
          <ScoreRing score={86} />
          <div className="min-w-0 flex-1 space-y-2">
            {BREAKDOWN.map((b, i) => (
              <div key={b.label}>
                <div className="flex justify-between text-[11px]"><span className="text-slate-500">{b.label}</span><span className="font-semibold text-ink">{b.value}/{b.max}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-50">
                  <div className="animate-bar h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${(b.value / b.max) * 100}%`, animationDelay: `${300 + i * 110}ms` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-brand-50 pt-4 text-xs">
          <div>
            <p className="text-slate-400">Potential value</p>
            <p className="mt-0.5 text-sm font-bold text-ink">PKR 450,000</p>
          </div>
          <div>
            <p className="text-slate-400">Best service fit</p>
            <p className="mt-0.5 text-sm font-bold text-ink">Website redesign</p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-brand-50 p-3 text-xs text-brand-800">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <span><span className="font-semibold">Next action:</span> call today: budget confirmed, launch needed within a month.</span>
        </div>
      </div>

      {/* floating chips */}
      <div className="absolute -left-8 -top-5 hidden animate-float sm:block">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-xl shadow-brand-900/10 ring-1 ring-brand-100">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-50 text-brand-600"><Bot className="h-3.5 w-3.5" /></span>
          AI summary ready
        </div>
      </div>
      <div className="absolute -bottom-5 -right-4 hidden animate-float [animation-delay:-3s] sm:block">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-xl shadow-brand-900/10 ring-1 ring-brand-100">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-50 text-amber-600"><BellRing className="h-3.5 w-3.5" /></span>
          Follow-up due 3:00 PM
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── content ───────────────────────── */

const STEPS = [
  { icon: Inbox, title: 'Capture', text: 'Add leads by hand, import a CSV, or let your website forms send them in through the lead-capture API.' },
  { icon: Search, title: 'Analyse', text: 'LeadIntel classifies the industry, reads buying intent and visits the company website automatically.' },
  { icon: Target, title: 'Score & prioritise', text: 'Every lead gets a 0–100 score, a priority, potential value, best service fit and clear reasoning.' },
  { icon: Send, title: 'Follow up', text: 'AI drafts the email or WhatsApp message, and reminders make sure no hot lead goes cold.' },
]

const FEATURES = [
  { icon: Target, title: 'Lead scoring (0–100)', text: 'Seven weighted factors with a transparent breakdown, so your team knows exactly why a lead is hot.' },
  { icon: Globe, title: 'Automatic website analysis', text: 'HTTPS, speed, SEO tags, mobile readiness, technology used and Google Lighthouse performance.' },
  { icon: Bot, title: 'AI inquiry summaries', text: 'Long messages turned into a short, clear summary with Google Gemini (free) or Claude.' },
  { icon: MessageCircle, title: 'AI follow-up drafts', text: 'Personalised email or WhatsApp messages that open straight in your mail app or WhatsApp.' },
  { icon: Boxes, title: 'Service recommendations', text: 'An editable service catalogue matches each lead to the services you actually sell.' },
  { icon: BellRing, title: 'Follow-up reminders', text: 'A reminder bell and automatic emails for follow-ups due within the hour.' },
  { icon: Copy, title: 'Duplicate detection', text: 'Spots repeat leads by email, phone, company domain or company name.' },
  { icon: BarChart3, title: 'Analytics & reports', text: 'Dashboards for pipeline, priorities, industries and sources, with CSV export.' },
  { icon: History, title: 'Full lead history', text: 'Every change is logged on the server and shown per lead and across the team.' },
]

const SCORING = [
  { label: 'Budget', weight: 25 },
  { label: 'Timeline', weight: 15 },
  { label: 'Company size', weight: 15 },
  { label: 'Service fit', weight: 15 },
  { label: 'Buying intent', weight: 15 },
  { label: 'Urgency', weight: 10 },
  { label: 'Data completeness', weight: 5 },
]

const INTEGRATIONS = [
  { icon: Workflow, title: 'HubSpot', text: 'Push leads to HubSpot manually or automatically.' },
  { icon: Webhook, title: 'Signed webhooks', text: 'Connect Zapier, Make or n8n to reach Zoho, Salesforce, Sheets and more.' },
  { icon: Plug, title: 'Lead-capture API', text: 'Website forms create leads directly, protected with an API key.' },
  { icon: FileSpreadsheet, title: 'CSV import & export', text: 'Bring in existing lists and export reports in one click.' },
  { icon: Mail, title: 'Email', text: 'Reminder and password-reset emails via your own SMTP server.' },
]

const FAQ = [
  { q: 'What does LeadIntel do?', a: 'It turns raw inquiries into prioritised sales opportunities. Each lead gets a score, a priority, a potential value, the best-fitting service, the reasoning behind it, a next action and follow-up suggestions.' },
  { q: 'How is the lead score calculated?', a: 'A transparent rule-based engine weighs budget (25), timeline (15), company size (15), service fit (15), buying intent (15), urgency (10) and data completeness (5). High priority starts at 80, Medium at 55, and admins can change these thresholds.' },
  { q: 'Do I need a paid AI key?', a: 'No. AI summaries and follow-up drafts work with a free Google Gemini key. Claude is supported as a paid alternative, and without any key LeadIntel falls back to built-in templates.' },
  { q: 'What does the website analysis check?', a: 'It visits the lead’s website and checks HTTPS, response time, page size, SEO tags, mobile readiness and the technology used, adds Google Lighthouse performance, and builds a company profile with its history from the Internet Archive.' },
  { q: 'Can my sales team use it?', a: 'Yes. Admins (sales managers) see and manage everything; sales employees see the leads assigned to or created by them. Roles are enforced on the server.' },
  { q: 'How do I get started?', a: 'On first start the login page asks you to create the admin account. Then add your services, invite your sales team and import or capture your leads.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-2xl border bg-white transition ${open ? 'border-brand-200 shadow-lg shadow-brand-900/5' : 'border-slate-200/80'}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left">
        <span className="text-[15px] font-semibold text-ink">{q}</span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition ${open ? 'rotate-180 bg-brand-600 text-white' : 'bg-brand-50 text-brand-600'}`}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <p className="overflow-hidden px-5 pb-0 text-[15px] leading-relaxed text-slate-500 [&:not(:empty)]:pb-5">{a}</p>
      </div>
    </div>
  )
}

/* ───────────────────────── page ───────────────────────── */

export default function LandingPage() {
  const { user } = useAuth()
  const cta = user ? { to: '/dashboard', label: 'Open dashboard' } : { to: '/login', label: 'Get started' }

  return (
    <div id="top" className="min-h-screen overflow-x-clip text-ink">
      <Nav />

      {/* ── HERO ── */}
      <section className="relative pt-28 sm:pt-36">
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 animate-blob bg-brand-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-40 h-96 w-96 animate-blob bg-brand-300/30 blur-3xl [animation-delay:-8s]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div className="text-center lg:text-left">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-brand-700 shadow-sm ring-1 ring-brand-100">
              <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping-soft rounded-full bg-brand-400" /><span className="relative h-2 w-2 rounded-full bg-brand-500" /></span>
              Lead intelligence for sales teams
            </span>
            <h1 className="animate-page mt-6 text-[40px] font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
              Know which leads to{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 bg-gradient-to-r from-brand-500 to-brand-800 bg-clip-text text-transparent">call first.</span>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-full bg-brand-200/70 sm:h-4" />
              </span>
            </h1>
            <p className="animate-page mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-500 [animation-delay:100ms] sm:text-lg lg:mx-0">
              LeadIntel scores, categorises and prioritises every incoming inquiry, analyses the company’s website, and drafts the follow-up for you, so your team spends time on the deals that matter.
            </p>
            <div className="animate-page mt-9 flex flex-col items-center gap-3 [animation-delay:180ms] sm:flex-row sm:justify-center lg:justify-start">
              <Link to={cta.to} className="shine group inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-700 px-6 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:shadow-xl">
                {cta.label} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <a href="#how" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-6 text-[15px] font-semibold text-brand-800 transition hover:bg-brand-50">
                See how it works
              </a>
            </div>
            <ul className="animate-page mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-slate-500 [animation-delay:240ms] lg:justify-start">
              {['Role-based team access', 'Free AI with Gemini', 'Website analysis built in'].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-500" /> {t}</li>
              ))}
            </ul>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-brand-100 bg-white/70 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-5 py-12 sm:px-8 md:grid-cols-4">
          {[
            ['0–100', 'lead score with full breakdown'],
            ['7', 'weighted scoring factors'],
            ['3', 'priority levels: High, Medium, Low'],
            ['2', 'roles: Admin & Sales'],
          ].map(([n, l], i) => (
            <Reveal key={l} delay={i * 80} className="px-2 text-center">
              <p className="bg-gradient-to-r from-brand-500 to-brand-800 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">{n}</p>
              <p className="mt-1 text-sm text-slate-500">{l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="scroll-mt-20 py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHead eyebrow="How it works" title="From raw inquiry to next action" text="Four steps, done for every lead, automatically." />
          <div className="relative mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-8 hidden h-0.5 bg-gradient-to-r from-brand-100 via-brand-300 to-brand-100 lg:block" />
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 110} className="relative">
                <div className="h-full rounded-3xl border border-brand-100 bg-white p-6 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-900/5">
                  <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-600/25">
                    <Icon className="h-7 w-7" />
                    <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-brand-700 shadow ring-1 ring-brand-100">{i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="scroll-mt-20 bg-white/60 py-24 backdrop-blur sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHead eyebrow="Features" title={<>Everything your sales team needs, <span className="text-brand-600">in one place</span></>} />
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 90}>
                <div className="group h-full rounded-3xl border border-slate-200/70 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition group-hover:bg-brand-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCORING ── */}
      <section id="scoring" className="scroll-mt-20 py-24 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <SectionHead
              center={false}
              eyebrow="Transparent scoring"
              title="No black box. Every point is explained."
              text="LeadIntel uses a clear, rule-based engine, so managers and sales staff always see why a lead scored the way it did."
            />
            <Reveal delay={120}>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  ['High', '80 and above', 'bg-rose-50 text-rose-600 ring-rose-100'],
                  ['Medium', '55 to 79', 'bg-amber-50 text-amber-700 ring-amber-100'],
                  ['Low', 'below 55', 'bg-slate-100 text-slate-600 ring-slate-200'],
                ].map(([p, r, cls]) => (
                  <div key={p} className={`rounded-2xl px-4 py-3 ring-1 ${cls}`}>
                    <p className="text-sm font-bold">{p} priority</p>
                    <p className="text-xs opacity-80">{r}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-500">Admins can adjust the thresholds at any time.</p>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div className="rounded-3xl border border-brand-100 bg-white p-7 shadow-xl shadow-brand-900/5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-ink">Scoring weights</p>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">Total 100</span>
              </div>
              <div className="mt-6 space-y-4">
                {SCORING.map((s, i) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm"><span className="text-slate-600">{s.label}</span><span className="font-bold text-ink">{s.weight}</span></div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-brand-50">
                      <div className="animate-bar h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-600" style={{ width: `${(s.weight / 25) * 100}%`, animationDelay: `${i * 90}ms` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── WEBSITE ANALYSIS ── */}
      <section className="pb-24 sm:pb-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-6 py-14 text-white sm:px-14 sm:py-16">
            <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 animate-blob bg-brand-400/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-10 h-80 w-80 animate-blob bg-brand-300/25 blur-3xl [animation-delay:-6s]" />
            <div className="relative grid items-center gap-12 lg:grid-cols-2">
              <Reveal>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-100 ring-1 ring-white/20">
                  <Globe className="h-3 w-3" /> Website analysis
                </span>
                <h2 className="mt-4 text-3xl font-extrabold leading-tight sm:text-[40px]">Understand a company before the first call</h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-brand-50/80">
                  Paste a website and LeadIntel checks its health, reads its About page and domain history, and writes a plain-language profile with how you can help.
                </p>
                <ul className="mt-7 grid gap-3 text-[15px] text-white/90 sm:grid-cols-2">
                  {['HTTPS & response time', 'SEO tags & mobile readiness', 'Technology detection', 'Google Lighthouse score', 'Company history timeline', 'AI-written company profile'].map((x) => (
                    <li key={x} className="flex items-center gap-2.5"><span className="grid h-5 w-5 place-items-center rounded-full bg-brand-400/30"><Check className="h-3 w-3" /></span> {x}</li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={120}>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80">
                    <Globe className="h-4 w-4 text-brand-200" /> northwindbakery.example
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    {[['Performance', '72', Gauge], ['SEO', 'Good', Search], ['Mobile', 'Ready', Check]].map(([l, v, I]) => {
                      const Icon = I as typeof Gauge
                      return (
                        <div key={l as string} className="rounded-2xl bg-white/10 p-3">
                          <Icon className="mx-auto h-4 w-4 text-brand-200" />
                          <p className="mt-2 text-lg font-extrabold">{v as string}</p>
                          <p className="text-[11px] text-white/60">{l as string}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-5 rounded-2xl bg-white/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-100"><Clock className="h-4 w-4" /> Online since 2016 · 10 years active</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/75">A family bakery selling fresh bread and custom cakes. The site is slow on mobile, so a faster redesign with online ordering is a strong fit.</p>
                  </div>
                  <p className="mt-3 text-center text-[11px] text-white/45">Illustrative example</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section id="integrations" className="scroll-mt-20 bg-white/60 py-24 backdrop-blur sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHead eyebrow="Integrations" title="Fits into the tools you already use" text="Bring leads in from anywhere and send them on to your CRM." />
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {INTEGRATIONS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="h-full rounded-3xl border border-slate-200/70 bg-white p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700"><Icon className="h-5 w-5" /></span>
                  <p className="mt-4 font-bold text-ink">{title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionHead eyebrow="Built for teams" title="The right view for every role" />
          <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
            {[
              { icon: UserCog, title: 'Admin / Sales manager', points: ['Sees every lead and every team member', 'Edits the service catalogue and scoring thresholds', 'Manages integrations and users', 'Full analytics and reports'] },
              { icon: Users, title: 'Sales employee', points: ['Sees leads assigned to or created by them', 'Gets reminders for their own follow-ups', 'AI summaries and message drafts', 'Logs every update to lead history'] },
            ].map(({ icon: Icon, title, points }, i) => (
              <Reveal key={title} delay={i * 120}>
                <div className="h-full rounded-3xl border border-brand-100 bg-white p-7 shadow-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25"><Icon className="h-6 w-6" /></span>
                  <h3 className="mt-5 text-xl font-bold text-ink">{title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[15px] text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {p}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={150} className="mt-8 flex justify-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm text-brand-800 ring-1 ring-brand-100">
              <ShieldCheck className="h-4 w-4" /> Roles are enforced on the server, and passwords are securely hashed
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="scroll-mt-20 bg-white/60 py-24 backdrop-blur sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.5fr]">
          <SectionHead center={false} eyebrow="FAQ" title="Questions, answered" text="Still curious? Sign in and score your first lead in minutes." />
          <Reveal delay={100}>
            <div className="space-y-3">
              {FAQ.map((f) => <FaqItem key={f.q} {...f} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-400 via-brand-600 to-brand-800 px-6 py-16 text-center text-white shadow-2xl shadow-brand-700/30 sm:px-12">
              <div className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 animate-blob bg-white/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 animate-blob bg-brand-900/40 blur-3xl [animation-delay:-7s]" />
              <TrendingUp className="relative mx-auto h-10 w-10 animate-float text-brand-100" />
              <h2 className="relative mx-auto mt-5 max-w-2xl text-3xl font-extrabold leading-tight sm:text-[44px]">Stop guessing. Start closing.</h2>
              <p className="relative mx-auto mt-4 max-w-lg text-base text-white/85">Sign in and see your next best lead in seconds.</p>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to={cta.to} className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 text-[15px] font-semibold text-brand-700 shadow-lg transition hover:-translate-y-0.5">
                  {cta.label} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                {!user && (
                  <Link to="/login" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/40 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10">
                    <Lock className="h-4 w-4" /> Log in
                  </Link>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-brand-100 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-slate-500">Understand, score, categorise and prioritise incoming leads.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <p className="font-bold text-ink">Product</p>
              <div className="mt-3 flex flex-col gap-2 text-slate-500">
                <a href="#features" className="hover:text-brand-700">Features</a>
                <a href="#scoring" className="hover:text-brand-700">Scoring</a>
                <a href="#integrations" className="hover:text-brand-700">Integrations</a>
              </div>
            </div>
            <div>
              <p className="font-bold text-ink">Get started</p>
              <div className="mt-3 flex flex-col gap-2 text-slate-500">
                {user ? <Link to="/dashboard" className="hover:text-brand-700">Dashboard</Link> : <Link to="/login" className="hover:text-brand-700">Log in</Link>}
                <a href="#how" className="hover:text-brand-700">How it works</a>
              </div>
            </div>
            <div>
              <p className="font-bold text-ink">Help</p>
              <div className="mt-3 flex flex-col gap-2 text-slate-500">
                <a href="#faq" className="hover:text-brand-700">FAQ</a>
                <Link to="/forgot-password" className="hover:text-brand-700">Reset password</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-brand-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:px-8">
            <p>© {new Date().getFullYear()} LeadIntel · Lead Intelligence System</p>
            <p className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Built with React, Node.js, SQLite and AI</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
