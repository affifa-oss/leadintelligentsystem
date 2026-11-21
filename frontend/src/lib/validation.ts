import type { LeadInput } from '../types'

export type LeadErrors = Partial<Record<keyof LeadInput, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[+\d][\d\s()-]{6,}$/
const WEBSITE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i

/** Shared by the form (frontend) and the API (backend) so both enforce the same rules. */
export function validateLead(v: LeadInput): LeadErrors {
  const e: LeadErrors = {}
  if (!v.contactName?.trim()) e.contactName = 'Client name is required.'
  if (!v.companyName?.trim()) e.companyName = 'Company name is required.'
  if (!v.email?.trim()) e.email = 'Email is required.'
  else if (!EMAIL.test(v.email.trim())) e.email = 'Enter a valid email address.'
  if (v.phone && !PHONE.test(v.phone.trim())) e.phone = 'Enter a valid phone number.'
  if (v.website && !WEBSITE.test(v.website.trim())) e.website = 'Enter a valid website, e.g. example.com'
  if (!v.industry) e.industry = 'Select an industry.'
  if (!v.location?.trim()) e.location = 'Location is required.'
  if ((v.inquiry ?? '').trim().length < 15) e.inquiry = 'Describe the inquiry in at least 15 characters.'
  if (typeof v.budget !== 'number' || v.budget < 0) e.budget = 'Budget cannot be negative.'
  if (!Array.isArray(v.requiredServices) || !v.requiredServices.length) e.requiredServices = 'Select at least one service.'
  return e
}

/** Keeps only known LeadInput fields with safe types (used by the API). */
export function sanitizeLeadInput(raw: Record<string, unknown>): LeadInput {
  const str = (k: string, max = 300) => (typeof raw[k] === 'string' ? (raw[k] as string).trim().slice(0, max) : '')
  const arr = (k: string) => (Array.isArray(raw[k]) ? (raw[k] as unknown[]).filter((x): x is string => typeof x === 'string').map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 20) : [])
  const pick = <T extends string>(k: string, allowed: readonly T[], fallback: T) => (allowed.includes(raw[k] as T) ? (raw[k] as T) : fallback)
  return {
    contactName: str('contactName', 120),
    email: str('email', 160),
    phone: str('phone', 40),
    jobTitle: str('jobTitle', 120),
    companyName: str('companyName', 160),
    website: str('website', 200),
    industry: str('industry', 80),
    companySize: pick('companySize', ['1-10', '11-50', '51-200', '201-500', '500+'] as const, '11-50'),
    location: str('location', 120),
    inquiry: str('inquiry', 3000),
    budget: Math.max(0, Math.min(10_000_000, Number(raw.budget) || 0)),
    timeline: pick('timeline', ['immediate', 'short', 'medium', 'long'] as const, 'medium'),
    urgency: pick('urgency', ['high', 'medium', 'low'] as const, 'medium'),
    existingTech: arr('existingTech'),
    requiredServices: arr('requiredServices'),
    source: pick('source', ['Website', 'Referral', 'LinkedIn', 'Email', 'Phone', 'Event'] as const, 'Website'),
  }
}
