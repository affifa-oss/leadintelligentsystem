// Domain types for the Lead Intelligence System.
// Inputs and outputs follow the project brief:
//   Inputs:  company info, website, industry, size, location, inquiry, budget, timeline,
//            existing technology, required services
//   Outputs: lead score, priority, potential value, service fit, reasoning,
//            recommended next action, follow-up suggestions

export type Role = 'admin' | 'sales'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  title: string
  active: boolean
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type Priority = 'high' | 'medium' | 'low'
export type Urgency = 'high' | 'medium' | 'low'
export type Timeline = 'immediate' | 'short' | 'medium' | 'long'
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'
export type LeadSource = 'Website' | 'Referral' | 'LinkedIn' | 'Email' | 'Phone' | 'Event'

/** Everything a user enters when recording a lead. */
export interface LeadInput {
  contactName: string
  email: string
  phone: string
  jobTitle: string
  companyName: string
  website: string
  industry: string
  companySize: CompanySize
  location: string
  inquiry: string
  /** Estimated budget in USD (0 = unknown). */
  budget: number
  timeline: Timeline
  urgency: Urgency
  existingTech: string[]
  /** Service ids from the service catalogue. */
  requiredServices: string[]
  source: LeadSource
}

export interface ScoreFactor {
  key: string
  label: string
  points: number
  max: number
  detail: string
}

export interface ServiceFit {
  serviceId: string
  fit: number // 0–100
  reason: string
}

export interface BuyingIntent {
  level: 'high' | 'medium' | 'low'
  score: number // 0–100
  signals: string[]
}

/** Everything the system calculates for a lead. */
export interface LeadIntelligence {
  score: number // 0–100
  priority: Priority
  breakdown: ScoreFactor[]
  reasoning: string[]
  potentialValue: number
  serviceFit: ServiceFit[]
  buyingIntent: BuyingIntent
  industryCategory: string
  nextAction: string
  followUpSuggestions: string[]
  calculatedAt: string
}

export interface WebsiteAnalysis {
  url: string
  analyzedAt: string
  hasSsl: boolean
  mobileFriendly: boolean
  performanceScore: number
  seoScore: number
  detectedTech: string[]
  observations: string[]
  opportunities: string[]
  /** True for sample/demo data; false for a real analysis done by the server. */
  simulated: boolean
  /** 'lighthouse' when the score comes from Google PageSpeed Insights, otherwise an estimate. */
  performanceSource?: 'lighthouse' | 'estimate'
  title?: string
  description?: string
  responseTimeMs?: number
  pageSizeKb?: number
  /** Domain history from the Internet Archive (Wayback Machine). Null when the archive has no record. */
  domainHistory?: DomainHistory | null
  /** Copyright years found in the page footer, e.g. "2015–2026". */
  copyrightYears?: string
  /** Links to the company's social media profiles found on the site. */
  socialLinks?: string[]
  /** Public contact email(s) found on the site. */
  contactEmails?: string[]
  /** Address of the About page that was read, if one was found. */
  aboutPageUrl?: string
  /** AI-written profile of the company behind the website. */
  companyProfile?: CompanyProfile
}

export interface DomainHistory {
  /** First and latest snapshot in the Internet Archive (ISO dates). */
  firstSeen: string
  lastSeen: string
  /** Years in which the site was archived, oldest first. */
  archivedYears: number[]
  /** Link to the Wayback Machine calendar for this site. */
  archiveUrl: string
}

/** What the company behind a website is and does, written by AI from the site content and its history. */
export interface CompanyProfile {
  overview: string
  whatTheyDo: string[]
  productsAndServices: string[]
  targetCustomers: string
  location: string
  /** Timeline / background points (domain history, founding year, milestones) found on the site or archive. */
  history: string[]
  websitePurpose: string
  /** Plain-language summary of the SEO and technical state. */
  seoSummary: string
  /** How our services could help this company. */
  salesAngle: string[]
  /** Facts the AI knows about this company from general knowledge (to be verified), or empty. */
  generalKnowledge: string
  source: AiSource
  generatedAt: string
}

export interface Lead extends LeadInput {
  id: string
  status: LeadStatus
  assignedTo: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  notes: string
  intelligence: LeadIntelligence
  websiteAnalysis?: WebsiteAnalysis
  ai?: LeadAiInsights
  /** Id of the matching contact in HubSpot after a CRM push. */
  hubspotId?: string
}

/** Where an AI result came from: Google Gemini, Claude, or the built-in template (no AI key). */
export type AiSource = 'gemini' | 'claude' | 'template'

/** AI (Gemini / Claude) or template-generated summary of the client's inquiry. */
export interface LeadAiInsights {
  summary: string
  keyNeeds: string[]
  concerns: string[]
  questionsToAsk: string[]
  generatedAt: string
  source: AiSource
}

export interface FollowUpDraft {
  channel: 'email' | 'whatsapp'
  subject: string
  body: string
  source: AiSource
}

export type FollowUpType = 'call' | 'email' | 'meeting' | 'demo'

export interface FollowUp {
  id: string
  leadId: string
  type: FollowUpType
  dueAt: string
  note: string
  status: 'pending' | 'done'
  createdBy: string
  completedAt?: string
  /** When the email reminder for this follow-up was sent. */
  reminderSentAt?: string
}

export interface HistoryEntry {
  id: string
  leadId: string
  at: string
  actorId: string
  action: string
  detail: string
}

export interface Service {
  id: string
  name: string
  category: string
  description: string
  basePrice: number
  keywords: string[]
  industries: string[]
}

export interface DuplicateMatch {
  leadId: string
  confidence: number // 0–1
  reasons: string[]
}

export interface ScoringSettings {
  highThreshold: number
  mediumThreshold: number
}
