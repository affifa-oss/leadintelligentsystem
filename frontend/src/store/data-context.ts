import { createContext, useContext } from 'react'
import type { FollowUp, FollowUpDraft, HistoryEntry, Lead, LeadAiInsights, LeadInput, LeadStatus, ScoringSettings, Service, User, WebsiteAnalysis } from '../types'

export interface DataState {
  leads: Lead[]
  followUps: FollowUp[]
  history: HistoryEntry[]
  users: User[]
  scoring: ScoringSettings
  services: Service[]
}

export interface SystemStatus {
  ai: { enabled: boolean; configured: boolean; provider: 'gemini' | 'claude' | null; model: string | null }
  email: {
    configured: boolean
    mode: 'smtp' | 'test-inbox' | 'off'
    host: string | null
    from: string
    testInbox: { user: string; pass: string; loginUrl: string } | null
  }
}

export interface OutboxEmail {
  id: string
  createdAt: string
  to: string
  subject: string
  text: string
  status: 'sent' | 'test' | 'not-configured' | 'failed'
  error?: string
  previewUrl?: string
}

export interface CrmConfig {
  webhookUrl: string
  webhookSecret: string
  webhookEvents: string[]
  hubspotConnected: boolean
  hubspotTokenPreview: string
  hubspotAutoPush: boolean
}

export interface ImportResult {
  created: { row: number; id: string; score: number }[]
  failed: { row: number; errors: string[] }[]
}

/** Every action calls the API, then refreshes the data. Errors are thrown as ApiError and also shown as a toast. */
export interface DataActions {
  addLead: (input: LeadInput, assignedTo: string | null) => Promise<Lead>
  updateLead: (id: string, input: LeadInput) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  setStatus: (id: string, status: LeadStatus) => Promise<void>
  assignLead: (id: string, userId: string | null) => Promise<void>
  setNotes: (id: string, notes: string) => Promise<void>
  runWebsiteAnalysis: (id: string) => Promise<void>
  analyzeUrl: (url: string) => Promise<WebsiteAnalysis>
  addFollowUp: (f: { leadId: string; type: FollowUp['type']; dueAt: string; note: string }) => Promise<void>
  completeFollowUp: (id: string) => Promise<void>
  deleteFollowUp: (id: string) => Promise<void>
  saveUser: (u: User, password?: string) => Promise<void>
  changePassword: (userId: string, password: string, currentPassword?: string) => Promise<void>
  setScoring: (s: ScoringSettings) => Promise<void>
  resetDemoData: () => Promise<void>
  getCaptureKey: () => Promise<string>
  regenerateCaptureKey: () => Promise<string>
  saveService: (s: Service, isNew: boolean) => Promise<void>
  deleteService: (id: string) => Promise<void>
  generateAiSummary: (leadId: string) => Promise<LeadAiInsights>
  draftMessage: (leadId: string, channel: 'email' | 'whatsapp', purpose: string) => Promise<FollowUpDraft>
  importLeads: (rows: Record<string, unknown>[]) => Promise<ImportResult>
  pushToHubspot: (leadId: string) => Promise<void>
  getStatus: () => Promise<SystemStatus>
  getEmailInfo: () => Promise<{ status: SystemStatus['email']; outbox: OutboxEmail[] }>
  sendTestEmail: (to: string) => Promise<OutboxEmail>
  runReminders: () => Promise<number>
  getCrm: () => Promise<{ config: CrmConfig; events: string[] }>
  saveCrm: (patch: Partial<CrmConfig> & { hubspotToken?: string; disconnectHubspot?: boolean }) => Promise<CrmConfig>
  testWebhook: () => Promise<{ ok: boolean; status: number }>
  refresh: () => Promise<void>
  notify: (message: string, tone?: 'success' | 'error') => void
}

export const DataContext = createContext<(DataState & DataActions) | null>(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
