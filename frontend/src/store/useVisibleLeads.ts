import { useMemo } from 'react'
import { useAuth } from '../auth/auth-context'
import { useData } from './data-context'

/** Leads the signed-in user is allowed to see (role-based), plus their follow-ups. */
export function useVisibleLeads() {
  const { leads, followUps } = useData()
  const { canSeeLead } = useAuth()
  return useMemo(() => {
    const visible = leads.filter(canSeeLead)
    const ids = new Set(visible.map((l) => l.id))
    return { leads: visible, followUps: followUps.filter((f) => ids.has(f.leadId)) }
  }, [leads, followUps, canSeeLead])
}
