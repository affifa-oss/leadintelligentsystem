import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { EmptyState } from './Misc'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | null
  align?: 'left' | 'right' | 'center'
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
}

const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' }
const align = { left: 'text-left', right: 'text-right', center: 'text-center' }

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  pageSize?: number
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  emptyTitle?: string
  emptyMessage?: string
}

export function DataTable<T>({ rows, columns, getRowId, onRowClick, pageSize = 10, initialSort, emptyTitle = 'No results', emptyMessage = 'Try a different search or filter.' }: Props<T>) {
  const [sort, setSort] = useState(initialSort ?? null)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const get = col.sortValue
    const dir = sort!.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      if (va === vb) return 0
      if (va === null) return 1
      if (vb === null) return -1
      return (va < vb ? -1 : 1) * dir
    })
  }, [rows, columns, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize)

  if (!rows.length) return <EmptyState title={emptyTitle} message={emptyMessage} />

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-brand-50/50">
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th key={c.key} scope="col" className={`whitespace-nowrap border-b border-slate-100 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-brand-900/55 ${align[c.align ?? 'left']} ${c.hideBelow ? hide[c.hideBelow] : ''}`}>
                    {c.sortValue ? (
                      <button type="button" onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'desc' }))} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-brand-700 ${active ? 'text-brand-700' : ''}`}>
                        {c.header}
                        {active ? sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={getRowId(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={`border-b border-slate-100 last:border-0 ${onRowClick ? 'cursor-pointer transition hover:bg-brand-50/40' : ''}`}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3.5 align-middle text-slate-700 ${align[c.align ?? 'left']} ${c.hideBelow ? hide[c.hideBelow] : ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row">
        <p>
          Showing <b className="text-ink">{current * pageSize + 1}</b>–<b className="text-ink">{Math.min((current + 1) * pageSize, sorted.length)}</b> of <b className="text-ink">{sorted.length}</b>
        </p>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" onClick={() => setPage(i)} aria-current={i === current ? 'page' : undefined} className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium ${i === current ? 'bg-brand-600 text-white' : 'hover:bg-slate-100'}`}>
                {i + 1}
              </button>
            ))}
            <button type="button" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
