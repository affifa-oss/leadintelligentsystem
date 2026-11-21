import { useMemo, useState, type FormEvent } from 'react'
import { Globe, Info, Loader2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { WebsiteAnalysisView } from '../components/leads/WebsiteAnalysisCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { TextInput } from '../components/ui/Fields'
import { EmptyState, PageHeader } from '../components/ui/Misc'
import { formatDate } from '../lib/format'
import { useData } from '../store/data-context'
import { useVisibleLeads } from '../store/useVisibleLeads'
import type { WebsiteAnalysis } from '../types'

export default function WebsiteAnalysisPage() {
  const { runWebsiteAnalysis, analyzeUrl } = useData()
  const [running, setRunning] = useState<string | null>(null)
  const { leads } = useVisibleLeads()
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<WebsiteAnalysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const withSite = useMemo(() => leads.filter((l) => l.website), [leads])
  const analysed = withSite.filter((l) => l.websiteAnalysis)
  const pending = withSite.filter((l) => !l.websiteAnalysis)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+/i.test(url.trim())) return setError('Enter a valid website, e.g. example.com')
    setError('')
    setBusy(true)
    try {
      setResult(await analyzeUrl(url.trim()))
    } catch {
      setResult(null)
    } finally {
      setBusy(false)
    }
  }

  async function analyseLead(id: string) {
    setRunning(id)
    await runWebsiteAnalysis(id).catch(() => undefined)
    setRunning(null)
  }

  return (
    <>
      <PageHeader title="Website Analysis" description="Check a company website to understand its technology, performance and SEO, and spot services you can offer." />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>The server visits the public home page and checks HTTPS, response time, page size, SEO tags, mobile readiness and technology used. Performance is an <b>estimate</b> from response time and page weight, not a full Lighthouse audit.</p>
      </div>

      <Card className="mb-6">
        <CardHeader title="Analyse any website" icon={<Globe className="h-[18px] w-[18px]" />} />
        <form onSubmit={submit} className="flex flex-col gap-3 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="pl-10" invalid={!!error} />
          </div>
          <Button type="submit" icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} disabled={busy} className="h-11">
            {busy ? 'Analysing…' : 'Analyse'}
          </Button>
        </form>
        {error && <p className="-mt-2 px-5 pb-4 text-sm text-rose-600">{error}</p>}
        {result && <div className="border-t border-slate-100 p-5"><WebsiteAnalysisView analysis={result} website={result.url} /></div>}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Analysed lead websites" subtitle={`${analysed.length} of ${withSite.length} leads with a website`} />
          {analysed.length ? (
            <ul className="divide-y divide-slate-100">
              {analysed.map((l) => (
                <li key={l.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link to={`/leads/${l.id}`} className="font-semibold text-ink hover:text-brand-700">{l.companyName}</Link>
                    <p className="truncate text-xs text-slate-500">{l.websiteAnalysis!.url} · {formatDate(l.websiteAnalysis!.analyzedAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={l.websiteAnalysis!.performanceScore >= 60 ? 'green' : 'amber'}>Speed {l.websiteAnalysis!.performanceScore}</Badge>
                    <Badge tone={l.websiteAnalysis!.seoScore >= 55 ? 'green' : 'amber'}>SEO {l.websiteAnalysis!.seoScore}</Badge>
                    <Badge tone="blue">{l.websiteAnalysis!.opportunities.length} opportunities</Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No lead websites analysed yet" message="Run an analysis from the list on the right." />
          )}
        </Card>
        <Card>
          <CardHeader title="Waiting for analysis" />
          {pending.length ? (
            <ul className="divide-y divide-slate-100">
              {pending.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{l.companyName}</p>
                    <p className="truncate text-xs text-slate-500">{l.website.replace(/^https?:\/\//, '')}</p>
                  </div>
                  <Button size="sm" variant="secondary" disabled={running !== null} icon={running === l.id ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined} onClick={() => analyseLead(l.id)}>{running === l.id ? 'Analysing…' : 'Analyse'}</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-slate-500">All lead websites are analysed.</p>
          )}
        </Card>
      </div>
    </>
  )
}
