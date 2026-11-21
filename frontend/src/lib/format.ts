/** Current time in ms (wrapper so components don't call Date.now() directly). */
export const nowMs = () => Date.now()

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' })

export const formatMoney = (n: number) => money.format(n)
export const formatCompactMoney = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `$${n}`)
export const formatDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—')
export const formatDateTime = (iso?: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : '—')
export const formatShortDate = (d: string | Date) => shortFmt.format(typeof d === 'string' ? new Date(d) : d)

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const future = diff < 0
  const min = Math.round(Math.abs(diff) / 60_000)
  let text: string
  if (min < 1) return 'just now'
  if (min < 60) text = `${min} min`
  else if (min < 60 * 24) text = `${Math.round(min / 60)} h`
  else text = `${Math.round(min / 1440)} day${Math.round(min / 1440) > 1 ? 's' : ''}`
  return future ? `in ${text}` : `${text} ago`
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

export const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const domainOf = (urlOrEmail: string) =>
  urlOrEmail
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^[^@]*@/, '')
    .split('/')[0]

export const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Download rows as a CSV file. */
export function downloadCsv(filename: string, rows: Record<string, string | number | null>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const esc = (v: string | number | null) => {
    const s = v === null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Badge label and colour for where an AI result came from. */
export function aiSourceBadge(source: 'gemini' | 'claude' | 'template'): { label: string; tone: 'blue' | 'violet' | 'gray' } {
  if (source === 'gemini') return { label: 'Gemini AI', tone: 'blue' }
  if (source === 'claude') return { label: 'Claude AI', tone: 'violet' }
  return { label: 'Template', tone: 'gray' }
}
