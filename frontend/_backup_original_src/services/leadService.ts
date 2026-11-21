import type {
  Lead,
  LeadHistory,
  FollowUp,
  Service,
  WebsiteAnalysis,
  LeadScore,
  DuplicateDetectionResult,
} from '../types';
import { mockLeads, mockFollowUps, mockLeadHistory, mockServices } from '../data';


// In-memory state holding copy of mock data
let leadsStore: Lead[] = [...mockLeads];
let followUpsStore: FollowUp[] = [...mockFollowUps];
let leadHistoryStore: LeadHistory[] = [...mockLeadHistory];

export const leadService = {
  /**
   * Fetch all leads with optional filtering
   */
  async getLeads(filters?: { status?: string; search?: string }): Promise<Lead[]> {
    let results = [...leadsStore];

    if (filters?.status) {
      results = results.filter((lead) => lead.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (lead) =>
          lead.firstName.toLowerCase().includes(q) ||
          lead.lastName.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          lead.company.name.toLowerCase().includes(q)
      );
    }

    return Promise.resolve(results);
  },

  /**
   * Fetch a single lead by ID
   */
  async getLeadById(id: string): Promise<Lead | null> {
    const lead = leadsStore.find((item) => item.id === id) || null;
    return Promise.resolve(lead);
  },

  /**
   * Create a new lead
   */
  async createLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    leadsStore = [newLead, ...leadsStore];

    // Log history
    const historyEntry: LeadHistory = {
      id: `hist-${Date.now()}`,
      leadId: newLead.id,
      timestamp: new Date().toISOString(),
      action: 'Lead Created',
      actor: 'Current User',
      details: `Lead created for ${newLead.firstName} ${newLead.lastName} (${newLead.company.name})`,
    };
    leadHistoryStore = [historyEntry, ...leadHistoryStore];

    return Promise.resolve(newLead);
  },

  /**
   * Update an existing lead
   */
  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    const index = leadsStore.findIndex((item) => item.id === id);
    if (index === -1) return Promise.resolve(null);

    const updatedLead: Lead = {
      ...leadsStore[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    leadsStore[index] = updatedLead;

    return Promise.resolve(updatedLead);
  },

  /**
   * Delete a lead
   */
  async deleteLead(id: string): Promise<boolean> {
    const initialLength = leadsStore.length;
    leadsStore = leadsStore.filter((item) => item.id !== id);
    return Promise.resolve(leadsStore.length < initialLength);
  },

  /**
   * Trigger AI/Intelligence analysis for a lead
   */
  async analyzeLead(id: string): Promise<{ summary: string; recommendedActions: string[] }> {
    const lead = await this.getLeadById(id);
    if (!lead) {
      throw new Error(`Lead with id ${id} not found.`);
    }

    return Promise.resolve({
      summary: `High priority lead at ${lead.company.name}. High intent detected in cloud services.`,
      recommendedActions: [
        'Schedule discovery call with C-level executive',
        'Send enterprise technical security whitepaper',
        'Assign to senior account executive',
      ],
    });
  },

  /**
   * Calculate/re-calculate lead score
   */
  async calculateLeadScore(leadId: string): Promise<LeadScore> {
    const lead = await this.getLeadById(leadId);

    const calculatedScore: LeadScore = {
      total: lead ? Math.min(100, lead.score.total + 5) : 80,
      grade: 'A',
      breakdown: {
        firmographic: 25,
        behavioral: 25,
        engagement: 22,
        buyingIntent: 23,
      },
      factors: [
        'Updated company headcount metrics',
        'Increased engagement frequency',
        'High buying intent score',
      ],
      calculatedAt: new Date().toISOString(),
    };

    if (lead) {
      await this.updateLead(leadId, { score: calculatedScore });
    }

    return Promise.resolve(calculatedScore);
  },

  /**
   * Analyze target website domain
   */
  async analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
    const mockAnalysis: WebsiteAnalysis = {
      url,
      analyzedAt: new Date().toISOString(),
      techStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'TailwindCSS'],
      valueProposition: 'Modern software solution for enterprise intelligence',
      targetAudience: 'B2B Tech Companies & SaaS Providers',
      seoScore: 88,
      performanceScore: 91,
      keyInsights: [
        'High organic traffic growth',
        'Active engineering recruitment',
        'Modern microservices architecture',
      ],
    };

    return Promise.resolve(mockAnalysis);
  },

  /**
   * Detect duplicates by email or company
   */
  async detectDuplicate(email: string, companyName?: string): Promise<DuplicateDetectionResult> {
    const existingEmailMatch = leadsStore.find(
      (l) => l.email.toLowerCase() === email.toLowerCase()
    );

    if (existingEmailMatch) {
      return Promise.resolve({
        isDuplicate: true,
        confidenceScore: 0.98,
        matchedLeadId: existingEmailMatch.id,
        matchedLeadName: `${existingEmailMatch.firstName} ${existingEmailMatch.lastName}`,
        matchingCriteria: ['Exact Email Match'],
      });
    }

    if (companyName) {
      const companyMatch = leadsStore.find(
        (l) => l.company.name.toLowerCase() === companyName.toLowerCase()
      );
      if (companyMatch) {
        return Promise.resolve({
          isDuplicate: true,
          confidenceScore: 0.75,
          matchedLeadId: companyMatch.id,
          matchedLeadName: `${companyMatch.firstName} ${companyMatch.lastName}`,
          matchingCriteria: ['Company Name Match'],
        });
      }
    }

    return Promise.resolve({
      isDuplicate: false,
      confidenceScore: 0.0,
      matchingCriteria: [],
    });
  },

  /**
   * Get lead history log
   */
  async getLeadHistory(leadId?: string): Promise<LeadHistory[]> {
    if (leadId) {
      return Promise.resolve(leadHistoryStore.filter((h) => h.leadId === leadId));
    }
    return Promise.resolve(leadHistoryStore);
  },

  /**
   * Create a follow-up task
   */
  async createFollowUp(followUpData: Omit<FollowUp, 'id'>): Promise<FollowUp> {
    const newFollowUp: FollowUp = {
      ...followUpData,
      id: `follow-${Date.now()}`,
    };
    followUpsStore = [newFollowUp, ...followUpsStore];
    return Promise.resolve(newFollowUp);
  },

  /**
   * Update a follow-up task
   */
  async updateFollowUp(id: string, updates: Partial<FollowUp>): Promise<FollowUp | null> {
    const index = followUpsStore.findIndex((item) => item.id === id);
    if (index === -1) return Promise.resolve(null);

    const updatedFollowUp = {
      ...followUpsStore[index],
      ...updates,
    };
    followUpsStore[index] = updatedFollowUp;
    return Promise.resolve(updatedFollowUp);
  },

  /**
   * Get available services list
   */
  async getServices(): Promise<Service[]> {
    return Promise.resolve(mockServices);
  },
};
