import { useState } from 'react'
import { nowMs } from '../../lib/format'
import { CalendarPlus } from 'lucide-react'
import { useData } from '../../store/data-context'
import type { FollowUpType, Lead } from '../../types'
import { Button } from '../ui/Button'
import { Field, SelectInput, TextArea, TextInput } from '../ui/Fields'
import { Modal } from '../ui/Misc'

const TYPES: { value: FollowUpType; label: string }[] = [
  { value: 'call', label: 'Phone call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'demo', label: 'Demo' },
]

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Schedule a follow-up for one lead (or pick the lead when `leads` is given). */
export function FollowUpModal({ open, onClose, lead, leads, initialNote = '' }: { open: boolean; onClose: () => void; lead?: Lead; leads?: Lead[]; initialNote?: string }) {
  const { addFollowUp } = useData()
  const tomorrow = new Date(nowMs() + 86_400_000)
  tomorrow.setHours(10, 0, 0, 0)
  const [leadId, setLeadId] = useState(lead?.id ?? '')
  const [type, setType] = useState<FollowUpType>('call')
  const [due, setDue] = useState(toLocalInput(tomorrow))
  const [note, setNote] = useState(initialNote)
  const [error, setError] = useState('')

  const [saving, setSaving] = useState(false)

  async function save() {
    const target = lead?.id ?? leadId
    if (!target) return setError('Choose a lead.')
    if (!due) return setError('Choose a date and time.')
    setSaving(true)
    try {
      await addFollowUp({ leadId: target, type, dueAt: new Date(due).toISOString(), note: note.trim() })
      onClose()
    } catch {
      setSaving(false) // error toast already shown
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule follow-up"
      subtitle={lead ? `${lead.companyName} · ${lead.contactName}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save follow-up'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {!lead && leads && (
          <Field label="Lead" required>
            <SelectInput value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">Select a lead</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.companyName} — {l.contactName}</option>)}
            </SelectInput>
          </Field>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type">
            <SelectInput value={type} onChange={(e) => setType(e.target.value as FollowUpType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </SelectInput>
          </Field>
          <Field label="Date & time" required>
            <TextInput type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should be discussed?" className="min-h-[90px]" />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </Modal>
  )
}
