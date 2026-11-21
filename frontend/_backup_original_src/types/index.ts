export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export type BuyingIntentScore = 'low' | 'medium' | 'high' | 'very_high';

export interface BuyingIntent {
  score: number; // 0-100 scale
  level: BuyingIntentScore;
  signals: string[];
  lastDetectedAt: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employeeCount?: string;
  annualRevenue?: string;
  location?: string;
  linkedinUrl?: string;
}

export interface LeadScoreBreakdown {
  firmographic: number;
  behavioral: number;
  engagement: number;
  buyingIntent: number;
}

export interface LeadScore {
  total: number; // 0-100 scale
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: LeadScoreBreakdown;
  factors: string[];
  calculatedAt: string;
}

export interface WebsiteAnalysis {
  url: string;
  analyzedAt: string;
  techStack: string[];
  valueProposition: string;
  targetAudience: string;
  seoScore: number;
  performanceScore: number;
  keyInsights: string[];
}

export interface FollowUp {
  id: string;
  leadId: string;
  title: string;
  scheduledAt: string;
  completedAt?: string;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'task';
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  notes?: string;
  assignedTo: string;
}

export interface LeadHistory {
  id: string;
  leadId: string;
  timestamp: string;
  action: string;
  actor: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  pricingTier: string;
  status: 'active' | 'beta' | 'deprecated';
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle: string;
  company: Company;
  status: LeadStatus;
  priority: LeadPriority;
  score: LeadScore;
  buyingIntent: BuyingIntent;
  websiteAnalysis?: WebsiteAnalysis;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  source: string;
  notes?: string;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  confidenceScore: number;
  matchedLeadId?: string;
  matchedLeadName?: string;
  matchingCriteria: string[];
}
