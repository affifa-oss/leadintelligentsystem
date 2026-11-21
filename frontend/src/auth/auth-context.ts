import { createContext, useContext } from 'react'
import type { Lead, User } from '../types'

export interface AuthState {
  user: User | null
  isAdmin: boolean
  /** Returns an error message, or null on success. */
  login: (email: string, password: string, remember: boolean) => Promise<string | null>
  logout: () => void
  /** Keep the signed-in user's profile in sync after editing it. */
  setUser: (u: User) => void
  /** Admin sees all leads; Sales Employees see leads assigned to or created by them (also enforced by the API). */
  canSeeLead: (lead: Lead) => boolean
  /** Admin edits all leads; Sales Employees only their assigned leads. */
  canEditLead: (lead: Lead) => boolean
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
