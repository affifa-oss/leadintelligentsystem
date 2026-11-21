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

/** AI (Claude) or template-generated summary of the client's inquiry. */
export interface LeadAiInsights {
  summary: string
  keyNeeds: string[]
  concerns: string[]
  questionsToAsk: string[]
  generatedAt: string
  source: 'claude' | 'template'
}

export interface FollowUpDraft {
  channel: 'email' | 'whatsapp'
  subject: string
  body: string
  source: 'claude' | 'template'
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
