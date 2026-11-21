import { useState } from 'react'
import { Check, Copy, Loader2, Mail, MessageCircle, Sparkles } from 'lucide-react'
import { aiSourceBadge } from '../../lib/format'
import { useData } from '../../store/data-context'
import type { FollowUpDraft, Lead } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Field, TextArea, TextInput } from '../ui/Fields'
import { Modal, Tabs } from '../ui/Misc'

/** Draft a follow-up email or WhatsApp message (Gemini or Claude AI when configured). The user reviews and sends it themselves. */
export function DraftMessageModal({ lead, open, onClose, initialPurpose = '' }: { lead: Lead; open: boolean; onClose: () => void; initialPurpose?: string }) {
  const { draftMessage } = useData()
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email')
  const [purpose, setPurpose] = useState(initialPurpose)
  const [draft, setDraft] = useState<FollowUpDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setBusy(true)
    try {
      setDraft(await draftMessage(lead.id, channel, purpose))
    } catch {
      /* toast shown */
    } finally {
      setBusy(false)
    }
  }

  const text = draft ? (draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body) : ''
  const phone = lead.phone.replace(/[^\d]/g, '')
  const openLink =
    draft && channel === 'email'
      ? `mailto:${lead.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
      : draft && phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(draft.body)}`
        : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Draft a follow-up message"
      subtitle={`To ${lead.contactName} · ${lead.companyName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {draft && (
            <Button variant="secondary" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }, () => undefined)}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
          {openLink && (
            <a href={openLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:from-brand-700">
              {channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />} {channel === 'email' ? 'Open in email' : 'Open WhatsApp'}
            </a>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <Tabs<'email' | 'whatsapp'> value={channel} onChange={(v) => { setChannel(v); setDraft(null) }} options={[{ value: 'email', label: 'Email' }, { value: 'whatsapp', label: 'WhatsApp' }]} />
        <Field label="What should the message do?" hint="Leave empty to use the recommended next action">
          <TextInput value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={lead.intelligence.nextAction} />
        </Field>
        <Button icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} disabled={busy} onClick={generate}>
          {busy ? 'Writing…' : draft ? 'Write again' : 'Write message'}
        </Button>
        {draft && (
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Draft (edit before sending)</p>
              <Badge tone={aiSourceBadge(draft.source).tone}>{aiSourceBadge(draft.source).label}</Badge>
            </div>
            {channel === 'email' && <TextInput value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} aria-label="Subject" />}
            <TextArea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} className="min-h-[200px]" aria-label="Message" />
            {channel === 'whatsapp' && !phone && <p className="text-xs text-amber-600">This lead has no phone number, so copy the message instead.</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
