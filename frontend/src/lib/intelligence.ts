/**
 * Lead intelligence engine — rule-based and fully explainable.
 *
 * Score (0–100) = budget 25 + timeline 15 + urgency 10 + company size 15
 *               + service fit 15 + buying intent 15 + data completeness 5
 * Priority: score ≥ high threshold → High, ≥ medium threshold → Medium, else Low.
 */
import { getServices, serviceById, timelineLabel } from '../data/catalog'
import type {
  BuyingIntent,
  CompanySize,
  LeadInput,
  LeadIntelligence,
  LeadStatus,
  Priority,
  ScoreFactor,
  ScoringSettings,
  ServiceFit,
  Timeline,
  Urgency,
} from '../types'
import { formatMoney } from './format'

export const DEFAULT_SCORING: ScoringSettings = { highThreshold: 80, mediumThreshold: 55 }

// ── factor tables ─────────────────────────────────────────────────────────
function budgetPoints(budget: number) {
  if (budget >= 20000) return 25
  if (budget >= 10000) return 20
  if (budget >= 5000) return 14
  if (budget >= 2000) return 8
  if (budget > 0) return 4
  return 0
}
const TIMELINE_POINTS: Record<Timeline, number> = { immediate: 15, short: 12, medium: 7, long: 3 }
const URGENCY_POINTS: Record<Urgency, number> = { high: 10, medium: 6, low: 2 }
const SIZE_POINTS: Record<CompanySize, number> = { '500+': 15, '201-500': 13, '51-200': 11, '11-50': 7, '1-10': 4 }

// ── buying intent ─────────────────────────────────────────────────────────
const INTENT_RULES: { pattern: RegExp; weight: number; signal: string }[] = [
  { pattern: /\b(asap|urgent(ly)?|immediately|right away)\b/i, weight: 20, signal: 'Asks for an urgent start' },
  { pattern: /\b(budget (is )?approved|funding (closed|secured)|budget approved)\b/i, weight: 25, signal: 'Budget is already approved' },
  { pattern: /\b(quote|quotation|pricing|price|cost|estimate)\b/i, weight: 15, signal: 'Asks about pricing or a quote' },
  { pattern: /\b(proposal|rfp|tender)\b/i, weight: 15, signal: 'Requests a proposal / RFP' },
  { pattern: /\b(deadline|launch|before|by (friday|monday|end of))\b/i, weight: 10, signal: 'Mentions a deadline or launch date' },
  { pattern: /\b(compar(e|ing)|vendor|partner|selection)\b/i, weight: 10, signal: 'Actively comparing vendors' },
  { pattern: /\b(need|require|want|looking for)\b/i, weight: 8, signal: 'States a clear need' },
  { pattern: /\b(just exploring|maybe|curious|someday|not sure|next year)\b/i, weight: -20, signal: 'Early-stage / exploratory language' },
]

export function detectBuyingIntent(input: Pick<LeadInput, 'inquiry' | 'urgency' | 'timeline' | 'budget'>): BuyingIntent {
  let score = 15
  const signals: string[] = []
  for (const r of INTENT_RULES) {
    if (r.pattern.test(input.inquiry)) {
      score += r.weight
      signals.push(r.signal)
    }
  }
  if (input.urgency === 'high') {
    score += 12
    signals.push('Marked as high urgency')
  }
  if (input.timeline === 'immediate') {
    score += 12
    signals.push('Wants to start immediately')
  }
  if (input.budget > 0) {
    score += 8
    signals.push('Shared an estimated budget')
  }
  score = Math.max(0, Math.min(100, score))
  return { score, level: score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low', signals }
}

// ── industry classification ───────────────────────────────────────────────
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'E-commerce & Retail': ['shop', 'store', 'ecommerce', 'e-commerce', 'retail', 'boutique', 'cart', 'beauty'],
  Healthcare: ['clinic', 'hospital', 'health', 'pharma', 'medical', 'patient', 'pharmacy', 'care'],
  Education: ['school', 'university', 'academy', 'college', 'edtech', 'learning', 'students'],
  'Finance & Fintech': ['bank', 'fintech', 'payment', 'finance', 'insurance', 'wallet', 'loan', 'microfinance'],
  'Real Estate': ['property', 'real estate', 'realty', 'construction', 'housing'],
  Logistics: ['logistics', 'delivery', 'fleet', 'transport', 'shipping', 'courier'],
  'Hospitality & Food': ['restaurant', 'hotel', 'food', 'travel', 'booking', 'cafe', 'tourism'],
  'Technology & SaaS': ['saas', 'software', 'tech', 'startup', 'platform', 'devops'],
  Manufacturing: ['manufacturing', 'factory', 'production', 'industrial', 'agro', 'plant'],
}

/** Uses the selected industry if given, otherwise classifies from company name, website and inquiry text. */
export function classifyIndustry(input: Pick<LeadInput, 'industry' | 'companyName' | 'website' | 'inquiry'>) {
  if (input.industry && input.industry !== 'Other') return input.industry
  const text = `${input.companyName} ${input.website} ${input.inquiry}`.toLowerCase()
  let best = 'Other'
  let bestHits = 0
  for (const [industry, words] of Object.entries(INDUSTRY_KEYWORDS)) {
    const hits = words.filter((w) => text.includes(w)).length
    if (hits > bestHits) {
      best = industry
      bestHits = hits
    }
  }
  return best
}

// ── service fit ───────────────────────────────────────────────────────────
export function scoreServiceFit(input: Pick<LeadInput, 'requiredServices' | 'inquiry'>, industry: string): ServiceFit[] {
  const text = input.inquiry.toLowerCase()
  return getServices().map((s) => {
    let fit = 0
    const reasons: string[] = []
    if (input.requiredServices.includes(s.id)) {
      fit += 60
      reasons.push('requested by the client')
    }
    const hits = s.keywords.filter((k) => new RegExp(`\\b${k.replace(/[/\\^$*+?.()|[\]{}-]/g, '\\$&')}\\b`, 'i').test(text))
    if (hits.length) {
      fit += Math.min(30, hits.length * 12)
      reasons.push(`inquiry mentions “${hits.slice(0, 2).join('”, “')}”`)
    }
    if (s.industries.includes(industry)) {
      fit += 10
      reasons.push(`common for ${industry}`)
    }
    return { serviceId: s.id, fit: Math.min(100, fit), reason: reasons.join(', ') }
  })
    .filter((f) => f.fit >= 30)
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 3)
}

/** Best-guess service for an inquiry that did not choose one (website forms, CSV imports). */
export function guessService(input: Pick<LeadInput, 'inquiry' | 'industry' | 'companyName' | 'website'>): string | undefined {
  const industry = classifyIndustry(input)
  const text = input.inquiry.toLowerCase()
  let best: { id: string; score: number } | undefined
  for (const s of getServices()) {
    const score = s.keywords.filter((k) => text.includes(k)).length * 2 + (s.industries.includes(industry) ? 1 : 0)
    if (score > (best?.score ?? 0)) best = { id: s.id, score }
  }
  return best?.id ?? getServices()[0]?.id
}

// ── next action & follow-ups ──────────────────────────────────────────────
function nextActionFor(status: LeadStatus, priority: Priority, topService: string | undefined) {
  const svc = topService ? serviceById(topService)?.name : 'the required service'
  switch (status) {
    case 'new':
      return priority === 'high'
        ? 'Call the client within 24 hours and book a discovery meeting.'
        : priority === 'medium'
          ? 'Send a personalised intro email and propose a short call this week.'
          : 'Send an introduction email with the company profile and nurture monthly.'
    case 'contacted':
      return `Run a qualification call to confirm budget, timeline and scope for ${svc}.`
    case 'qualified':
      return `Prepare and send a proposal for ${svc} with a cost estimate.`
    case 'proposal':
      return 'Follow up on the proposal and offer a walkthrough call to answer questions.'
    case 'negotiation':
      return 'Finalise scope and pricing, then share the contract for signature.'
    case 'won':
      return 'Schedule the project kick-off meeting and hand over to the delivery team.'
    case 'lost':
      return 'Record the loss reason and plan a re-engagement email in 3 months.'
  }
}

function followUpsFor(input: LeadInput, priority: Priority, topService: string | undefined, value: number) {
  const out: string[] = []
  const svc = topService ? serviceById(topService)?.name : undefined
  if (priority === 'high') out.push('Follow up within 24 hours if there is no reply.')
  else if (priority === 'medium') out.push('Follow up in 2–3 days if there is no reply.')
  else out.push('Add to the monthly nurture list and check in after 30 days.')
  if (svc) out.push(`Share a relevant ${svc} case study or portfolio.`)
  if (value > 0) out.push(`Prepare a ballpark estimate around ${formatMoney(value)}.`)
  if (input.budget === 0) out.push('Ask the client for an approximate budget range.')
  if (input.existingTech.length) out.push(`Review compatibility with their current tools (${input.existingTech.slice(0, 2).join(', ')}).`)
  return out.slice(0, 4)
}

// ── main entry ────────────────────────────────────────────────────────────
export function analyzeLead(input: LeadInput, status: LeadStatus = 'new', settings: ScoringSettings = DEFAULT_SCORING): LeadIntelligence {
  const industryCategory = classifyIndustry(input)
  const buyingIntent = detectBuyingIntent(input)
  const serviceFit = scoreServiceFit(input, industryCategory)
  const bestFit = serviceFit[0]?.fit ?? 0

  const completenessItems = [!!input.website, !!input.phone, input.inquiry.trim().length >= 40, input.existingTech.length > 0, !!input.location]
  const completeness = completenessItems.filter(Boolean).length

  const breakdown: ScoreFactor[] = [
    { key: 'budget', label: 'Budget', max: 25, points: budgetPoints(input.budget), detail: input.budget > 0 ? `Estimated budget ${formatMoney(input.budget)}` : 'Budget not shared' },
    { key: 'timeline', label: 'Timeline', max: 15, points: TIMELINE_POINTS[input.timeline], detail: timelineLabel(input.timeline) },
    { key: 'urgency', label: 'Urgency', max: 10, points: URGENCY_POINTS[input.urgency], detail: `${input.urgency[0].toUpperCase()}${input.urgency.slice(1)} urgency` },
    { key: 'size', label: 'Company size', max: 15, points: SIZE_POINTS[input.companySize], detail: `${input.companySize} employees` },
    { key: 'fit', label: 'Service fit', max: 15, points: Math.round((bestFit / 100) * 15), detail: bestFit ? `Best match ${serviceById(serviceFit[0].serviceId)?.name} (${bestFit}%)` : 'No clear service match' },
    { key: 'intent', label: 'Buying intent', max: 15, points: Math.round((buyingIntent.score / 100) * 15), detail: `${buyingIntent.level[0].toUpperCase()}${buyingIntent.level.slice(1)} intent (${buyingIntent.score}/100)` },
    { key: 'data', label: 'Data completeness', max: 5, points: completeness, detail: `${completeness} of 5 key details provided` },
  ]
  const score = Math.max(0, Math.min(100, breakdown.reduce((a, f) => a + f.points, 0)))
  const priority: Priority = score >= settings.highThreshold ? 'high' : score >= settings.mediumThreshold ? 'medium' : 'low'

  const requestedValue = input.requiredServices.reduce((a, id) => a + (serviceById(id)?.basePrice ?? 0), 0)
  const potentialValue = input.budget > 0 ? input.budget : requestedValue

  const reasoning: string[] = []
  const strong = breakdown.filter((f) => f.points / f.max >= 0.7).map((f) => f.label.toLowerCase())
  const weak = breakdown.filter((f) => f.points / f.max < 0.35).map((f) => f.label.toLowerCase())
  reasoning.push(`Scored ${score}/100, which is ${priority} priority (High ≥ ${settings.highThreshold}, Medium ≥ ${settings.mediumThreshold}).`)
  if (strong.length) reasoning.push(`Strong on ${strong.join(', ')}.`)
  if (weak.length) reasoning.push(`Weak on ${weak.join(', ')}.`)
  if (buyingIntent.signals.length) reasoning.push(`Intent signals: ${buyingIntent.signals.slice(0, 3).join('; ').toLowerCase()}.`)
  if (input.industry !== industryCategory) reasoning.push(`Industry classified as ${industryCategory} from the company details.`)

  return {
    score,
    priority,
    breakdown,
    reasoning,
    potentialValue,
    serviceFit,
    buyingIntent,
    industryCategory,
    nextAction: nextActionFor(status, priority, serviceFit[0]?.serviceId),
    followUpSuggestions: followUpsFor(input, priority, serviceFit[0]?.serviceId, potentialValue),
    calculatedAt: new Date().toISOString(),
  }
}
