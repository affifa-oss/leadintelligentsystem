import { useState } from 'react'
import { AlertTriangle, HelpCircle, ListChecks, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { aiSourceBadge, relativeTime } from '../../lib/format'
import { useData } from '../../store/data-context'
import type { Lead } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'

/** AI inquiry summary (Gemini or Claude when configured, otherwise a template built from the lead data). */
export function AiInsightsCard({ lead }: { lead: Lead }) {
  const { generateAiSummary } = useData()
  const [busy, setBusy] = useState(false)
  const ai = lead.ai

  async function run() {
    setBusy(true)
    await generateAiSummary(lead.id).catch(() => undefined)
    setBusy(false)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="AI inquiry summary"
        subtitle={ai ? `Generated ${relativeTime(ai.generatedAt)}` : 'What the client wants, risks and questions to ask'}
        icon={<Sparkles className="h-[18px] w-[18px]" />}
        action={
          <div className="flex items-center gap-2">
            {ai && <Badge tone={aiSourceBadge(ai.source).tone}>{aiSourceBadge(ai.source).label}</Badge>}
            <Button size="sm" variant={ai ? 'ghost' : 'primary'} disabled={busy} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : ai ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} onClick={run}>
              {busy ? 'Thinking…' : ai ? 'Regenerate' : 'Generate summary'}
            </Button>
          </div>
        }
      />
      {ai ? (
        <div className="space-y-4 p-5">
          <p className="rounded-xl bg-gradient-to-r from-brand-50 to-white p-4 text-[15px] leading-relaxed text-ink ring-1 ring-brand-100">{ai.summary}</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Section icon={<ListChecks className="h-4 w-4 text-brand-600" />} title="Key needs" items={ai.keyNeeds} />
            <Section icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} title="Concerns" items={ai.concerns} empty="No major concerns." />
            <Section icon={<HelpCircle className="h-4 w-4 text-teal-500" />} title="Ask on the next call" items={ai.questionsToAsk} />
          </div>
          {ai.source === 'template' && <p className="text-xs text-slate-400">Add a free Gemini API key (GEMINI_API_KEY in backend/.env) to get AI-written summaries (see README).</p>}
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-slate-500">No summary yet. Generate one to get a quick brief before contacting the client.</p>
      )}
    </Card>
  )
}

function Section({ icon, title, items, empty = '—' }: { icon: React.ReactNode; title: string; items: string[]; empty?: string }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{icon}{title}</p>
      {items.length ? (
        <ul className="space-y-1.5 text-sm text-slate-700">{items.map((i) => <li key={i} className="flex gap-1.5"><span className="text-slate-300">•</span>{i}</li>)}</ul>
      ) : (
        <p className="text-sm text-slate-400">{empty}</p>
      )}
    </div>
  )
}
