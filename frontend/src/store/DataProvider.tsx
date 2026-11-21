/**
 * Loads data from the LeadIntel API and exposes actions that call it.
 * The server enforces roles; this provider only shows what the API returns.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, RotateCw } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { FullPageLoader } from '../auth/AuthProvider'
import { api, ApiError } from '../lib/api'
import { DEFAULT_SCORING } from '../lib/intelligence'
import { DEFAULT_SERVICES, setServiceCatalog } from '../data/catalog'
import type { FollowUpDraft, Lead, LeadAiInsights, Service, User, WebsiteAnalysis } from '../types'
import { DataContext, type CrmConfig, type DataActions, type DataState, type ImportResult, type OutboxEmail, type SystemStatus } from './data-context'

const EMPTY: DataState = { leads: [], followUps: [], history: [], users: [], scoring: DEFAULT_SCORING, services: DEFAULT_SERVICES }

/** Load the live service catalogue into the scoring engine before React renders the new data. */
function accept(d: DataState): DataState {
  const services = d.services?.length ? d.services : DEFAULT_SERVICES
  setServiceCatalog(services)
  return { ...d, services }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth()
  const [loaded, setLoaded] = useState<{ userId: string; state: DataState } | null>(null)
  const [failed, setFailed] = useState<{ userId: string; message: string } | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setToast({ message, tone })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const userId = user?.id
  const refresh = useCallback(async () => {
    if (!userId) return
    const d = accept(await api<DataState>('/bootstrap'))
    setLoaded({ userId, state: d })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    api<DataState>('/bootstrap')
      .then((d) => !cancelled && setLoaded({ userId, state: accept(d) }))
      .catch((e) => !cancelled && setFailed({ userId, message: e instanceof ApiError ? e.message : 'Could not load data.' }))
    return () => {
      cancelled = true
    }
  }, [userId])

  const state = loaded && loaded.userId === userId ? loaded.state : EMPTY
  const loadError = failed && failed.userId === userId ? failed.message : ''
  const loading = !!userId && loaded?.userId !== userId && !loadError

  /** Run an API call, refresh data, show errors as a toast and re-throw them for forms. */
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T> => {
      try {
        const result = await fn()
        await refresh()
        if (success) notify(success)
        return result
      } catch (e) {
        notify(e instanceof ApiError ? e.message : 'Something went wrong.', 'error')
        throw e
      }
    },
    [refresh, notify],
  )

  const actions: DataActions = useMemo(
    () => ({
      refresh,
      notify,
      addLead: (input, assignedTo) => run(async () => (await api<{ lead: Lead }>('/leads', { body: { input, assignedTo } })).lead, 'Lead saved and scored'),
      updateLead: (id, input) => run(async () => void (await api(`/leads/${id}`, { method: 'PUT', body: { input } })), 'Lead updated'),
      deleteLead: (id) => run(async () => void (await api(`/leads/${id}`, { method: 'DELETE' })), 'Lead deleted'),
      setStatus: (id, s) => run(async () => void (await api(`/leads/${id}/status`, { method: 'PATCH', body: { status: s } })), 'Status updated'),
      assignLead: (id, uid) => run(async () => void (await api(`/leads/${id}/assign`, { method: 'PATCH', body: { userId: uid } })), uid ? 'Lead assigned' : 'Assignment removed'),
      setNotes: (id, notes) => run(async () => void (await api(`/leads/${id}/notes`, { method: 'PATCH', body: { notes } })), 'Notes saved'),
      runWebsiteAnalysis: (id) => run(async () => void (await api(`/leads/${id}/website-analysis`, { method: 'POST', body: {} })), 'Website analysed'),
      analyzeUrl: async (url) => {
        try {
          return (await api<{ websiteAnalysis: WebsiteAnalysis }>('/website-analysis', { body: { url } })).websiteAnalysis
        } catch (e) {
          notify(e instanceof ApiError ? e.message : 'Website analysis failed.', 'error')
          throw e
        }
      },
      addFollowUp: (f) => run(async () => void (await api('/follow-ups', { body: f })), 'Follow-up scheduled'),
      completeFollowUp: (id) => run(async () => void (await api(`/follow-ups/${id}/complete`, { method: 'PATCH', body: {} })), 'Follow-up completed'),
      deleteFollowUp: (id) => run(async () => void (await api(`/follow-ups/${id}`, { method: 'DELETE' })), 'Follow-up removed'),
      saveUser: (u, password) =>
        run(async () => {
          const exists = state.users.some((x) => x.id === u.id)
          const r = await api<{ user: User }>(exists ? `/users/${u.id}` : '/users', { method: exists ? 'PUT' : 'POST', body: { ...u, ...(password ? { password } : {}) } })
          if (r.user.id === user?.id) setUser(r.user)
        }, 'Saved'),
      changePassword: (uid, password, currentPassword) => run(async () => void (await api(`/users/${uid}/password`, { method: 'PUT', body: { password, currentPassword } })), 'Password changed'),
      setScoring: (s) => run(async () => void (await api('/settings/scoring', { method: 'PUT', body: s })), 'Thresholds saved and all leads re-scored'),
      resetDemoData: () => run(async () => void (await api('/settings/reset-demo', { body: {} })), 'Demo data restored'),
      getCaptureKey: async () => (await api<{ apiKey: string }>('/settings/integration')).apiKey,
      saveService: (svc: Service, isNew: boolean) =>
        run(async () => void (await api(isNew ? '/services' : `/services/${svc.id}`, { method: isNew ? 'POST' : 'PUT', body: svc })), 'Service saved, all leads re-scored'),
      deleteService: (id) => run(async () => void (await api(`/services/${id}`, { method: 'DELETE' })), 'Service deleted'),
      generateAiSummary: (id) => run(async () => (await api<{ ai: LeadAiInsights }>(`/leads/${id}/ai-summary`, { body: {} })).ai, 'Summary ready'),
      draftMessage: async (id, channel, purpose) => {
        try {
          return (await api<{ draft: FollowUpDraft }>(`/leads/${id}/ai-draft`, { body: { channel, purpose } })).draft
        } catch (e) {
          notify(e instanceof ApiError ? e.message : 'Could not draft the message.', 'error')
          throw e
        }
      },
      importLeads: (rows) => run(async () => api<ImportResult>('/leads/import', { body: { rows } })),
      pushToHubspot: (id) => run(async () => void (await api(`/leads/${id}/hubspot`, { body: {} })), 'Lead pushed to HubSpot'),
      getStatus: () => api<SystemStatus>('/status'),
      getEmailInfo: () => api<{ status: SystemStatus['email']; outbox: OutboxEmail[] }>('/settings/email'),
      sendTestEmail: (to) => run(async () => (await api<{ result: OutboxEmail }>('/settings/email/test', { body: { to } })).result),
      runReminders: () => run(async () => (await api<{ sent: number }>('/settings/reminders/run', { body: {} })).sent),
      getCrm: () => api<{ config: CrmConfig; events: string[] }>('/settings/crm'),
      saveCrm: (patch) => run(async () => (await api<{ config: CrmConfig }>('/settings/crm', { method: 'PUT', body: patch })).config, 'Integration settings saved'),
      testWebhook: async () => {
        try {
          const r = await api<{ ok: boolean; status: number }>('/settings/crm/test-webhook', { body: {} })
          notify(r.ok ? `Webhook delivered (HTTP ${r.status})` : `Webhook failed${r.status ? ` (HTTP ${r.status})` : ': no response'}`, r.ok ? 'success' : 'error')
          return r
        } catch (e) {
          notify(e instanceof ApiError ? e.message : 'Webhook test failed.', 'error')
          throw e
        }
      },
      regenerateCaptureKey: () => run(async () => (await api<{ apiKey: string }>('/settings/integration/regenerate', { body: {} })).apiKey, 'New API key generated'),
    }),
    [run, refresh, notify, state.users, user?.id, setUser],
  )

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

  if (loading) return <FullPageLoader label="Loading your leads…" />
  if (user && loadError)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f8fc] p-6">
        <div className="max-w-sm rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
          <p className="mt-3 font-semibold text-ink">Could not load data</p>
          <p className="mt-1 text-sm text-slate-500">{loadError}</p>
          <button type="button" onClick={() => location.reload()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <RotateCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </div>
    )

  return (
    <DataContext.Provider value={value}>
      {children}
      {toast && (
        <div role="status" className={`animate-fade-up fixed bottom-6 right-6 z-[60] flex max-w-sm items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl ${toast.tone === 'error' ? 'bg-rose-600' : 'bg-ink'}`}>
          {toast.tone === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
          {toast.message}
        </div>
      )}
    </DataContext.Provider>
  )
}
