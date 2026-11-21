import { Briefcase, Building2, Clock, ExternalLink, History, Lightbulb, MapPin, Package, Search, Sparkles, Target, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { aiSourceBadge } from '../../lib/format'
import type { WebsiteAnalysis } from '../../types'
import { Badge } from '../ui/Badge'

/** AI company profile + website history, shown above the technical website checks. */
export function CompanyProfileView({ analysis }: { analysis: WebsiteAnalysis }) {
  const p = analysis.companyProfile
  const h = analysis.domainHistory
  if (!p && !h) return null
  const badge = p ? aiSourceBadge(p.source) : null
  const years = h ? new Date(h.lastSeen).getFullYear() - new Date(h.firstSeen).getFullYear() : 0

  return (
    <section className="animate-fade-up space-y-4 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 via-white to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </span>
          Company profile
        </p>
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </div>

      {p && <p className="text-[15px] leading-relaxed text-ink">{p.overview}</p>}

      {/* quick facts */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {p && <Fact icon={<MapPin className="h-4 w-4" />} label="Location" value={p.location} />}
        {p && <Fact icon={<Users className="h-4 w-4" />} label="Customers" value={p.targetCustomers} />}
        {h ? (
          <Fact icon={<Clock className="h-4 w-4" />} label="Online since" value={`${h.firstSeen.slice(0, 4)} · ${years > 0 ? `${years}+ years` : 'this year'}`} />
        ) : analysis.copyrightYears ? (
          <Fact icon={<Clock className="h-4 w-4" />} label="Copyright" value={analysis.copyrightYears} />
        ) : null}
      </div>

      {p && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <List icon={<Briefcase className="h-4 w-4 text-brand-600" />} title="What they do" items={p.whatTheyDo} />
          <List icon={<Package className="h-4 w-4 text-teal-600" />} title="Products & services" items={p.productsAndServices} />
        </div>
      )}

      {/* history timeline */}
      {(p?.history.length || h) && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <History className="h-4 w-4 text-brand-600" /> History
          </p>
          {p && p.history.length > 0 && (
            <ol className="relative space-y-2 border-l-2 border-brand-100 pl-4">
              {p.history.map((item) => (
                <li key={item} className="relative text-sm text-slate-700">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-50" />
                  {item}
                </li>
              ))}
            </ol>
          )}
          {h && <ArchiveYears years={h.archivedYears} url={h.archiveUrl} />}
        </div>
      )}

      {p && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Target className="h-4 w-4 text-brand-600" /> Website purpose</p>
            <p className="text-sm text-slate-700">{p.websitePurpose}</p>
          </div>
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Search className="h-4 w-4 text-brand-600" /> SEO in plain words</p>
            <p className="text-sm text-slate-700">{p.seoSummary}</p>
          </div>
        </div>
      )}

      {p && p.salesAngle.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700"><Lightbulb className="h-4 w-4" /> How we can help</p>
          <ul className="space-y-1 text-sm text-ink">{p.salesAngle.map((s) => <li key={s}>• {s}</li>)}</ul>
        </div>
      )}

      {p?.generalKnowledge && (
        <p className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /> {p.generalKnowledge}
        </p>
      )}

      {(analysis.socialLinks?.length || analysis.contactEmails?.length || analysis.aboutPageUrl) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {analysis.aboutPageUrl && <LinkChip href={analysis.aboutPageUrl} label="About page" />}
          {analysis.socialLinks?.map((s) => <LinkChip key={s} href={s} label={socialName(s)} />)}
          {analysis.contactEmails?.map((e) => <LinkChip key={e} href={`mailto:${e}`} label={e} />)}
        </div>
      )}

      {p && p.source !== 'template' && (
        <p className="text-[11px] text-slate-400">Written by AI from the website's own pages and the Internet Archive. Check important facts before using them with the client.</p>
      )}
    </section>
  )
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-white p-3 ring-1 ring-slate-100">
      <span className="mt-0.5 text-brand-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  )
}

function List({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{icon}{title}</p>
      {items.length ? (
        <ul className="space-y-1 text-sm text-slate-700">{items.map((i) => <li key={i} className="flex gap-1.5"><span className="text-brand-400">•</span>{i}</li>)}</ul>
      ) : (
        <p className="text-sm text-slate-400">Not stated on the website</p>
      )}
    </div>
  )
}

/** One small bar per year from the first archive year to now; filled when the site was archived that year. */
function ArchiveYears({ years, url }: { years: number[]; url: string }) {
  const first = years[0]
  const last = Math.max(years[years.length - 1], new Date().getFullYear())
  const all = Array.from({ length: Math.min(last - first + 1, 40) }, (_, i) => last - Math.min(last - first, 39) + i)
  const set = new Set(years)
  return (
    <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Seen online in {years.length} year{years.length === 1 ? '' : 's'}</span>
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:text-brand-800">
          Internet Archive <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="flex items-end gap-[3px]" role="img" aria-label={`Archived in: ${years.join(', ')}`}>
        {all.map((y, i) => (
          <span
            key={y}
            title={`${y}${set.has(y) ? ': archived' : ''}`}
            className={`animate-rise h-6 flex-1 rounded-sm ${set.has(y) ? 'bg-gradient-to-t from-brand-600 to-brand-300' : 'bg-slate-100'}`}
            style={{ animationDelay: `${i * 18}ms` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{all[0]}</span>
        <span>{all[all.length - 1]}</span>
      </div>
    </div>
  )
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-brand-700 hover:ring-brand-200">
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  )
}

function socialName(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, '')
  const name = { 'facebook.com': 'Facebook', 'instagram.com': 'Instagram', 'linkedin.com': 'LinkedIn', 'twitter.com': 'X / Twitter', 'x.com': 'X / Twitter', 'youtube.com': 'YouTube', 'tiktok.com': 'TikTok', 'pinterest.com': 'Pinterest' }[host]
  return name ?? host
}
