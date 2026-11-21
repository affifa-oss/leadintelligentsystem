import type { LeadStatus, Priority } from '../../types'

export const BLUE /* mint palette (name kept for imports) */ = ['#0f7357', '#12906a', '#20b082', '#47cb9c', '#7fe0bb', '#b0eed5']

export const PRIORITY_COLORS: Record<Priority, string> = { high: '#0f7357', medium: '#47cb9c', low: '#cbd5e1' }

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: '#7fe0bb',
  contacted: '#47cb9c',
  qualified: '#20b082',
  proposal: '#12906a',
  negotiation: '#0f7357',
  won: '#0d9488',
  lost: '#cbd5e1',
}

export const axis = { stroke: '#94a3b8', fontSize: 12, tickLine: false, axisLine: false } as const
export const grid = '#e8f5ef'
export const tooltip = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 28px -12px rgba(15,23,42,0.25)', fontSize: 13, padding: '8px 12px' },
  labelStyle: { fontWeight: 600, color: '#0d2a22', marginBottom: 4 },
  cursor: { fill: 'rgba(18,144,106,0.05)' },
} as const
