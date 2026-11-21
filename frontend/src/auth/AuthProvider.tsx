import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'
import { api, ApiError, getToken, setToken, setUnauthorizedHandler } from '../lib/api'
import type { Lead, User } from '../types'
import { AuthContext, useAuth } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => !!getToken())

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  // Restore the session from a saved token.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!getToken()) return
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    try {
      const r = await api<{ token: string; user: User }>('/auth/login', { body: { email, password } })
      setToken(r.token, remember)
      setUser(r.user)
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Sign-in failed.'
    }
  }, [])

  const value = useMemo(() => {
    const isAdmin = user?.role === 'admin'
    const canSeeLead = (l: Lead) => !!user && (isAdmin || l.assignedTo === user.id || l.createdBy === user.id)
    const canEditLead = (l: Lead) => !!user && (isAdmin || l.assignedTo === user.id || (l.createdBy === user.id && !l.assignedTo))
    return { user, isAdmin, login, logout, setUser, canSeeLead, canEditLead }
  }, [user, login, logout])

  if (checking) return <FullPageLoader />
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f3fbf7]">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}
