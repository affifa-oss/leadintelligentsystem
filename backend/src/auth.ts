import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { settings, users } from './db.ts'
import type { Lead, User } from './shared.ts'

declare module 'express-serve-static-core' {
  interface Request {
    user?: User
  }
}

const TOKEN_TTL = '12h'

export function signToken(user: User) {
  return jwt.sign({ sub: user.id, role: user.role }, settings.jwtSecret(), { expiresIn: TOKEN_TTL })
}

/** Requires a valid Bearer token from an active user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Please sign in.' })
  let payload: { sub: string }
  try {
    payload = jwt.verify(token, settings.jwtSecret()) as { sub: string }
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }
  const user = await users.byId(payload.sub)
  if (!user || !user.active) return res.status(401).json({ error: 'Your account is not active.' })
  req.user = user
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Only the Admin / Sales Manager can do this.' })
  next()
}

// Same rules as the role-permission matrix in the requirements.
export const canSeeLead = (u: User, l: Lead) => u.role === 'admin' || l.assignedTo === u.id || l.createdBy === u.id
export const canEditLead = (u: User, l: Lead) => u.role === 'admin' || l.assignedTo === u.id || (l.createdBy === u.id && !l.assignedTo)
