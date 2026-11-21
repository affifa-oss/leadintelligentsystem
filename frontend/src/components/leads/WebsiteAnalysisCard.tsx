import { CheckCircle2, Globe, Lightbulb, Loader2, ShieldAlert, Smartphone, XCircle } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime } from '../../lib/format'
import type { WebsiteAnalysis } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/Misc'
import { CompanyProfileView } from './CompanyProfileView'

/** Displays a website analysis result, or a button to run one. */
export function WebsiteAnalysisView({ analysis, website, onRun }: { analysis?: WebsiteAnalysis; website: string; onRun?: () => Promise<void> }) {
  const [running, setRunning] = useState(false)

  async function run() {
    if (!onRun) return
    setRunning(true)
    try {
      await onRun()
    } catch {
      /* error toast is shown by the data provider */
    } finally {
      setRunning(false)
    }
  }

  if (!website) return <p className="text-sm text-slate-500">No website was provided for this lead.</p>

  if (!analysis)
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {running ? <>Visiting <b className="text-ink">{website}</b>, reading its pages and history, and writing a company profile… this can take 10–20 seconds.</> : <>Analyse <b className="text-ink">{website}</b> to learn who the company is, its history, technology, speed, SEO and sales opportunities.</>}
        </p>
        {onRun && (
          <Button size="sm" icon={running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} onClick={run} disabled={running}>
            {running ? 'Analysing…' : 'Analyse website'}
          </Button>
        )}
      </div>
    )


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={analysis.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-600 hover:underline">{analysis.url}</a>
        <div className="flex items-center gap-2">
          {analysis.simulated ? <Badge tone="amber">Sample</Badge> : <Badge tone="green" dot>Live check</Badge>}
          <span className="text-xs text-slate-400">{formatDateTime(analysis.analyzedAt)}</span>
          {onRun && <Button size="sm" variant="ghost" onClick={run} disabled={running}>{running ? 'Analysing…' : 'Re-run'}</Button>}
        </div>
      </div>
      <CompanyProfileView analysis={analysis} />
      {(analysis.title || analysis.description) && (
        <div className="rounded-xl border border-slate-100 p-3">
          {analysis.title && <p className="truncate text-sm font-semibold text-ink">{analysis.title}</p>}
          {analysis.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{analysis.description}</p>}
        </div>
      )}
      {analysis.responseTimeMs !== undefined && (
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {[
            { k: 'Response time', v: `${analysis.responseTimeMs} ms` },
            { k: 'Page size', v: `${analysis.pageSizeKb} KB` },
            { k: 'HTTPS', v: analysis.hasSsl ? 'Yes' : 'No' },
            { k: 'Mobile ready', v: analysis.mobileFriendly ? 'Yes' : 'No' },
          ].map((x) => (
            <div key={x.k} className="rounded-xl bg-brand-50/60 px-2 py-2.5">
              <p className="text-sm font-bold text-ink">{x.v}</p>
              <p className="text-[11px] text-slate-500">{x.k}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: analysis.performanceSource === 'lighthouse' ? 'Performance (Google Lighthouse)' : 'Performance (estimate)', value: analysis.performanceScore },
          { label: 'SEO', value: analysis.seoScore },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-slate-50 p-3">
            <div className="mb-1.5 flex justify-between text-sm"><span className="font-medium text-slate-700">{m.label}</span><b className="text-ink">{m.value}/100</b></div>
            <ProgressBar value={m.value} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <Check ok={analysis.hasSsl} label="HTTPS" icon={ShieldAlert} />
        <Check ok={analysis.mobileFriendly} label="Mobile friendly" icon={Smartphone} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Detected technology</p>
        <div className="flex flex-wrap gap-1.5">{analysis.detectedTech.length ? analysis.detectedTech.map((t) => <Badge key={t} tone="gray">{t}</Badge>) : <span className="text-sm text-slate-400">None detected</span>}</div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Observations</p>
          <ul className="space-y-1 text-sm text-slate-600">{analysis.observations.map((o) => <li key={o}>• {o}</li>)}</ul>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">Sales opportunities</p>
          <ul className="space-y-1 text-sm text-ink">{analysis.opportunities.map((o) => <li key={o} className="flex gap-1.5"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{o}</li>)}</ul>
        </div>
      </div>
    </div>
  )
}

function Check({ ok, label, icon: Icon }: { ok: boolean; label: string; icon: typeof CheckCircle2 }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${ok ? 'text-emerald-700' : 'text-rose-600'}`}>
      <Icon className="h-4 w-4" /> {label}
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
    </span>
  )
}
