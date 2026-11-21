import type { DuplicateMatch, Lead, LeadInput } from '../types'
import { domainOf } from './format'

const FREE_MAIL = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com']
const digits = (s: string) => s.replace(/\D/g, '').slice(-10)
const normCompany = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(pvt|ltd|llc|inc|co|company|gmbh|limited|private)\b\.?/g, '')
    .replace(/[^a-z0-9]/g, '')

/** Finds existing leads that look like the same client (email, phone, domain or company name). */
export function findDuplicates(input: Pick<LeadInput, 'email' | 'phone' | 'website' | 'companyName'>, leads: Lead[], excludeId?: string): DuplicateMatch[] {
  const email = input.email.trim().toLowerCase()
  const phone = digits(input.phone)
  const emailDomain = email.includes('@') ? domainOf(email) : ''
  const siteDomain = input.website ? domainOf(input.website) : ''
  const company = normCompany(input.companyName)

  const matches: DuplicateMatch[] = []
  for (const l of leads) {
    if (l.id === excludeId) continue
    const reasons: string[] = []
    let confidence = 0
    if (email && l.email.toLowerCase() === email) {
      reasons.push('Same email address')
      confidence = Math.max(confidence, 0.98)
    }
    if (phone.length >= 7 && digits(l.phone) === phone) {
      reasons.push('Same phone number')
      confidence = Math.max(confidence, 0.9)
    }
    const lDomains = [domainOf(l.website), domainOf(l.email)]
    const myDomains = [siteDomain, FREE_MAIL.includes(emailDomain) ? '' : emailDomain].filter(Boolean)
    if (myDomains.some((d) => lDomains.includes(d))) {
      reasons.push('Same company domain')
      confidence = Math.max(confidence, 0.8)
    }
    if (company.length > 2 && normCompany(l.companyName) === company) {
      reasons.push('Same company name')
      confidence = Math.max(confidence, 0.75)
    }
    if (reasons.length) matches.push({ leadId: l.id, confidence: Math.min(0.99, confidence + (reasons.length - 1) * 0.05), reasons })
  }
  return matches.sort((a, b) => b.confidence - a.confidence)
}
