import { useState } from 'react'
import { Boxes, Cloud, Code2, Info, Megaphone, Palette, Pencil, Plus, ShoppingCart, Smartphone, Sparkles, Trash2, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ChipPicker, Field, TagInput, TextArea, TextInput } from '../components/ui/Fields'
import { Modal, PageHeader } from '../components/ui/Misc'
import { INDUSTRIES } from '../data/catalog'
import { formatCompactMoney, formatMoney } from '../lib/format'
import { useData } from '../store/data-context'
import { useVisibleLeads } from '../store/useVisibleLeads'
import type { Service } from '../types'

const ICONS: Record<string, LucideIcon> = { web: Code2, ecom: ShoppingCart, mobile: Smartphone, uiux: Palette, seo: Megaphone, custom: Boxes, cloud: Cloud, ai: Sparkles }
const EMPTY: Service = { id: '', name: '', category: '', description: '', basePrice: 0, keywords: [], industries: [] }

export default function ServicesPage() {
  const { isAdmin } = useAuth()
  const { services, deleteService } = useData()
  const { leads } = useVisibleLeads()
  const [editing, setEditing] = useState<Service | null>(null)
  const [removing, setRemoving] = useState<Service | null>(null)

  return (
    <>
      <PageHeader
        title="Services"
        description="The service catalogue behind service-fit scoring and recommendations. Words in a client's inquiry are matched against each service's keywords."
        actions={isAdmin && <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing(EMPTY)}>Add service</Button>}
      />
      {isAdmin && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Make this list match the services and <b>starting prices your company actually offers</b>. Add the words clients use (e.g. “online store”, “app”, “SEO”) as keywords. Saving re-scores every lead immediately.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {services.map((s) => {
          const Icon = ICONS[s.id] ?? Boxes
          const fits = leads.filter((l) => l.intelligence.serviceFit.some((f) => f.serviceId === s.id))
          const best = leads.filter((l) => l.intelligence.serviceFit[0]?.serviceId === s.id)
          const value = best.filter((l) => !['won', 'lost'].includes(l.status)).reduce((a, l) => a + l.intelligence.potentialValue, 0)
          return (
            <Card key={s.id} className="group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/25"><Icon className="h-5 w-5" /></span>
                <div className="flex items-center gap-1">
                  <Badge tone="gray">{s.category}</Badge>
                  {isAdmin && (
                    <>
                      <button type="button" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                      <button type="button" aria-label={`Delete ${s.name}`} onClick={() => setRemoving(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
              <h3 className="mt-4 font-bold text-ink">{s.name}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-500">{s.description || 'No description yet.'}</p>
              <p className="mt-3 text-sm text-slate-600">From <b className="text-ink">{formatMoney(s.basePrice)}</b></p>
              <div className="mt-3 flex flex-wrap gap-1">
                {s.keywords.slice(0, 6).map((k) => <span key={k} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{k}</span>)}
                {s.keywords.length > 6 && <span className="text-[11px] text-slate-400">+{s.keywords.length - 6}</span>}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                <div><p className="text-lg font-bold text-ink">{fits.length}</p><p className="text-[11px] text-slate-500">Matching</p></div>
                <div><p className="text-lg font-bold text-brand-700">{best.length}</p><p className="text-[11px] text-slate-500">Best fit</p></div>
                <div><p className="text-lg font-bold text-ink">{formatCompactMoney(value)}</p><p className="text-[11px] text-slate-500">Open value</p></div>
              </div>
            </Card>
          )
        })}
      </div>

      {editing && <ServiceModal key={editing.id || 'new'} service={editing} onClose={() => setEditing(null)} />}

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        size="sm"
        title={`Delete ${removing?.name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { const id = removing!.id; setRemoving(null); deleteService(id).catch(() => undefined) }}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Leads will be re-scored without this service. A service that leads have requested cannot be deleted. Rename it instead.</p>
      </Modal>
    </>
  )
}

function ServiceModal({ service, onClose }: { service: Service; onClose: () => void }) {
  const { saveService } = useData()
  const isNew = !service.id
  const [form, setForm] = useState<Service>(service)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name.trim()) return setError('Service name is required.')
    if (!form.keywords.length) return setError('Add at least one keyword.')
    if (form.basePrice < 0) return setError('Starting price must be 0 or more.')
    setSaving(true)
    try {
      await saveService(form, isNew)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={isNew ? 'Add service' : `Edit ${service.name}`} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save service'}</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Service name" required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mobile App Development" /></Field>
        <Field label="Category"><TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Mobile" /></Field>
        <Field label="Starting price (USD)" required hint="Used to estimate potential value when the client gives no budget">
          <TextInput type="number" min={0} step={100} value={form.basePrice || ''} onChange={(e) => setForm({ ...form, basePrice: Math.max(0, Number(e.target.value) || 0) })} />
        </Field>
        <Field label="Short description" className="sm:col-span-2"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[70px]" /></Field>
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-medium text-slate-700">Keywords<span className="ml-0.5 text-rose-500">*</span> <span className="font-normal text-slate-400">: words clients use for this service</span></p>
        <TagInput value={form.keywords} onChange={(keywords) => setForm({ ...form, keywords })} placeholder="Type a keyword and press Enter" />
      </div>
      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-medium text-slate-700">Typical industries <span className="font-normal text-slate-400">(small fit bonus)</span></p>
        <ChipPicker options={INDUSTRIES.filter((i) => i !== 'Other').map((i) => ({ value: i, label: i }))} value={form.industries} onChange={(industries) => setForm({ ...form, industries })} />
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </Modal>
  )
}
