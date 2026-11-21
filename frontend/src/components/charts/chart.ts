import type { LeadStatus, Priority } from '../../types'

export const BLUE = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']

export const PRIORITY_COLORS: Record<Priority, string> = { high: '#1d4ed8', medium: '#60a5fa', low: '#cbd5e1' }

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: '#93c5fd',
  contacted: '#60a5fa',
  qualified: '#3b82f6',
  proposal: '#2563eb',
  negotiation: '#1d4ed8',
  won: '#10b981',
  lost: '#cbd5e1',
}

export const axis = { stroke: '#94a3b8', fontSize: 12, tickLine: false, axisLine: false } as const
export const grid = '#eef2f7'
export const tooltip = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 28px -12px rgba(15,23,42,0.25)', fontSize: 13, padding: '8px 12px' },
  labelStyle: { fontWeight: 600, color: '#0f172a', marginBottom: 4 },
  cursor: { fill: 'rgba(37,99,235,0.05)' },
} as const
