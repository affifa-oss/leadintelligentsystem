import { useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/Misc'
import { getServices } from '../data/catalog'
import { mapHeader, parseCsv, rowsToLeads, TEMPLATE_CSV } from '../lib/csv'
import { validateLead } from '../lib/validation'
import { sanitizeLeadInput } from '../lib/validation'
import { useData } from '../store/data-context'
import type { ImportResult } from '../store/data-context'

export default function ImportLeadsPage() {
  const { importLeads } = useData()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const lookup = (name: string) => getServices().find((s) => s.id === name.toLowerCase() || s.name.toLowerCase() === name.toLowerCase())?.id

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    setResult(null)
    setError('')
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return setError('File is larger than 2 MB.')
    const parsed = parseCsv(await file.text())
    if (parsed.length < 2) return setError('The file has no data rows. Use the template below.')
    if (parsed.length > 501) return setError('Import at most 500 leads at a time.')
    setFileName(file.name)
    setHeaders(parsed[0])
    setRows(rowsToLeads(parsed, lookup))
  }

  // Preview check (the server validates again and may infer a missing service from the inquiry)
  const checks = rows.map((r) => {
    const errors = validateLead({ ...sanitizeLeadInput(r), requiredServices: ['x'] })
    return Object.values(errors)
  })
  const valid = checks.filter((c) => !c.length).length

  async function submit() {
    setBusy(true)
    try {
      setResult(await importLeads(rows))
      setRows([])
    } catch {
      /* toast shown */
    } finally {
      setBusy(false)
    }
  }

  const template = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`
  const show = ['contactName', 'companyName', 'email', 'industry', 'budget'] as const

  return (
    <>
      <PageHeader
        title="Import leads"
        description="Upload a CSV (from Excel, Google Sheets or another CRM). Each row is validated, scored and prioritised automatically."
        back={<Link to="/leads" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800"><ArrowLeft className="h-4 w-4" /> Leads</Link>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="1. Choose a CSV file" icon={<FileSpreadsheet className="h-[18px] w-[18px]" />} />
          <div className="p-5">
            <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 px-6 py-10 text-center transition hover:border-brand-400 hover:bg-brand-50">
              <Upload className="h-8 w-8 text-brand-500" />
              <span className="font-semibold text-ink">{fileName || 'Click to choose a .csv file'}</span>
              <span className="text-xs text-slate-500">Max 500 rows · 2 MB. In Excel use “Save as → CSV UTF-8”.</span>
            </button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            {headers.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Columns found</p>
                <div className="flex flex-wrap gap-1.5">
                  {headers.map((h) => <Badge key={h} tone={mapHeader(h) ? 'blue' : 'gray'}>{h}{mapHeader(h) ? '' : ' (ignored)'}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Template" />
          <div className="space-y-3 p-5 text-sm text-slate-600">
            <p>Required columns: <b>Client name, Email, Company, Industry, Location, Inquiry</b>. Optional: phone, website, size, budget, timeline, urgency, technology, services, source.</p>
            <p>Missing services are guessed from the inquiry. Separate multiple values with <code>;</code>.</p>
            <a href={template} download="leadintel-import-template.csv" className="inline-flex items-center gap-2 font-semibold text-brand-600 hover:underline"><Download className="h-4 w-4" /> Download template</a>
          </div>
        </Card>
      </div>

      {rows.length > 0 && (
        <Card className="mt-6">
          <CardHeader
            title={`2. Review ${rows.length} rows`}
            subtitle={`${valid} ready · ${rows.length - valid} with problems (they will be skipped)`}
            action={<Button disabled={busy || !valid} icon={<Upload className="h-4 w-4" />} onClick={submit}>{busy ? 'Importing…' : `Import ${valid} leads`}</Button>}
          />
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-brand-50/90 text-left text-[11px] uppercase tracking-wider text-brand-900/55 backdrop-blur"><tr><th className="px-4 py-2.5">#</th>{show.map((f) => <th key={f} className="px-4 py-2.5">{f}</th>)}<th className="px-4 py-2.5">Check</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                    {show.map((f) => <td key={f} className="max-w-[180px] truncate px-4 py-2.5">{String(r[f] ?? '')}</td>)}
                    <td className="px-4 py-2.5">{checks[i].length ? <span className="text-xs text-rose-600">{checks[i][0]}</span> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {result && (
        <Card className="mt-6">
          <CardHeader title="Import finished" subtitle={`${result.created.length} imported · ${result.failed.length} skipped`} />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Imported</p>
              <ul className="space-y-1 text-sm">{result.created.slice(0, 20).map((c) => <li key={c.id}><Link to={`/leads/${c.id}`} className="text-brand-600 hover:underline">{c.id}</Link> · row {c.row} · score {c.score}</li>)}</ul>
            </div>
            {result.failed.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-700"><XCircle className="h-4 w-4" /> Skipped</p>
                <ul className="space-y-1 text-sm text-slate-600">{result.failed.slice(0, 20).map((f) => <li key={f.row}>Row {f.row}: {f.errors.join(' ')}</li>)}</ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  )
}
