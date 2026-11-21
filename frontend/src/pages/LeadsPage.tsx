import { useMemo } from 'react'
import { Download, Plus, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { Badge, PriorityBadge, ScorePill, StatusBadge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DataTable, type Column } from '../components/ui/DataTable'
import { FilterSelect, SearchBox } from '../components/ui/Fields'
import { Avatar, PageHeader, Tabs } from '../components/ui/Misc'
import { INDUSTRIES, serviceName, SOURCES, STATUSES, statusLabel } from '../data/catalog'
import { downloadCsv, formatDate, formatMoney, relativeTime } from '../lib/format'
import { useQueryState } from '../lib/useQueryState'
import { useData } from '../store/data-context'
import { useVisibleLeads } from '../store/useVisibleLeads'
import type { Lead, Priority } from '../types'

export default function LeadsPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { users } = useData()
  const { leads } = useVisibleLeads()
  const [q, setQ] = useQueryState('q')
  const [priority, setPriority] = useQueryState('priority', 'all')
  const [status, setStatus] = useQueryState('status', 'all')
  const [industry, setIndustry] = useQueryState('industry', 'all')
  const [source, setSource] = useQueryState('source', 'all')
  const [owner, setOwner] = useQueryState('owner', 'all')

  const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? null

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return leads.filter(
      (l) =>
        (priority === 'all' || l.intelligence.priority === priority) &&
        (status === 'all' || l.status === status) &&
        (industry === 'all' || l.intelligence.industryCategory === industry) &&
        (source === 'all' || l.source === source) &&
        (owner === 'all' || (owner === 'none' ? !l.assignedTo : l.assignedTo === owner)) &&
        (!needle || [l.contactName, l.companyName, l.email, l.location, l.id].some((v) => v.toLowerCase().includes(needle))),
    )
  }, [leads, q, priority, status, industry, source, owner])

  const count = (p: Priority) => leads.filter((l) => l.intelligence.priority === p).length

  const columns: Column<Lead>[] = [
    { key: 'score', header: 'Score', sortValue: (l) => l.intelligence.score, render: (l) => <ScorePill score={l.intelligence.score} /> },
    {
      key: 'lead',
      header: 'Lead',
      sortValue: (l) => l.companyName.toLowerCase(),
      render: (l) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-ink">{l.companyName}</p>
          <p className="text-xs text-slate-500">{l.contactName} · {l.location.split(',')[0]}</p>
        </div>
      ),
    },
    { key: 'industry', header: 'Industry', sortValue: (l) => l.intelligence.industryCategory, render: (l) => <span className="whitespace-nowrap text-slate-600">{l.intelligence.industryCategory}</span>, hideBelow: 'xl' },
    {
      key: 'fit',
      header: 'Best service fit',
      render: (l) => (l.intelligence.serviceFit[0] ? <Badge tone="blue">{serviceName(l.intelligence.serviceFit[0].serviceId)}</Badge> : <span className="text-slate-300">—</span>),
      hideBelow: 'lg',
    },
    { key: 'value', header: 'Potential value', align: 'right', sortValue: (l) => l.intelligence.potentialValue, render: (l) => <span className="font-semibold tabular-nums text-ink">{formatMoney(l.intelligence.potentialValue)}</span>, hideBelow: 'md' },
    { key: 'priority', header: 'Priority', sortValue: (l) => l.intelligence.score, render: (l) => <PriorityBadge priority={l.intelligence.priority} /> },
    { key: 'status', header: 'Status', sortValue: (l) => STATUSES.findIndex((s) => s.value === l.status), render: (l) => <StatusBadge status={l.status} />, hideBelow: 'sm' },
    {
      key: 'owner',
      header: 'Assigned to',
      sortValue: (l) => userName(l.assignedTo) ?? '~',
      render: (l) => {
        const n = userName(l.assignedTo)
        return n ? (
          <span className="inline-flex items-center gap-2 whitespace-nowrap"><Avatar name={n} size="sm" />{n.split(' ')[0]}</span>
        ) : (
          <Badge tone="amber">Unassigned</Badge>
        )
      },
      hideBelow: 'lg',
    },
    { key: 'created', header: 'Received', sortValue: (l) => l.createdAt, render: (l) => <span className="whitespace-nowrap text-slate-500" title={formatDate(l.createdAt)}>{relativeTime(l.createdAt)}</span>, hideBelow: 'xl' },
  ]

  function exportCsv() {
    downloadCsv(
      'leads.csv',
      filtered.map((l) => ({
        id: l.id,
        company: l.companyName,
        contact: l.contactName,
        email: l.email,
        industry: l.intelligence.industryCategory,
        budget: l.budget,
        score: l.intelligence.score,
        priority: l.intelligence.priority,
        potential_value: l.intelligence.potentialValue,
        best_service: l.intelligence.serviceFit[0] ? serviceName(l.intelligence.serviceFit[0].serviceId) : '',
        status: statusLabel(l.status),
        assigned_to: userName(l.assignedTo) ?? '',
        next_action: l.intelligence.nextAction,
      })),
    )
  }

  return (
    <>
      <PageHeader
        title={isAdmin ? 'Leads' : 'My leads'}
        description={isAdmin ? 'All incoming leads, automatically scored and prioritised.' : 'Leads assigned to you or added by you.'}
        actions={
          <>
            <ButtonLink to="/leads/import" variant="secondary" icon={<Upload className="h-4 w-4" />}>Import</ButtonLink>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv}>Export</Button>
            <ButtonLink to="/leads/new" icon={<Plus className="h-4 w-4" />}>Add lead</ButtonLink>
          </>
        }
      />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Tabs
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'all', label: 'All', count: leads.length },
              { value: 'high', label: 'High priority', count: count('high') },
              { value: 'medium', label: 'Medium', count: count('medium') },
              { value: 'low', label: 'Low', count: count('low') },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchBox value={q} onChange={setQ} placeholder="Search name, company, email…" />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Any' }, ...STATUSES]} />
          <FilterSelect label="Industry" value={industry} onChange={setIndustry} options={[{ value: 'all', label: 'Any' }, ...INDUSTRIES.map((i) => ({ value: i, label: i }))]} />
          <FilterSelect label="Source" value={source} onChange={setSource} options={[{ value: 'all', label: 'Any' }, ...SOURCES.map((s) => ({ value: s, label: s }))]} />
          {isAdmin && (
            <FilterSelect
              label="Owner"
              value={owner}
              onChange={setOwner}
              options={[{ value: 'all', label: 'Anyone' }, { value: 'none', label: 'Unassigned' }, ...users.filter((u) => u.role === 'sales').map((u) => ({ value: u.id, label: u.name }))]}
            />
          )}
        </div>
        <DataTable rows={filtered} columns={columns} getRowId={(l) => l.id} onRowClick={(l) => navigate(`/leads/${l.id}`)} initialSort={{ key: 'score', dir: 'desc' }} emptyTitle="No leads found" />
      </Card>
    </>
  )
}
