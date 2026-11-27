/**
 * TEST FIXTURE ONLY: sample users, leads, follow-ups and history for the backend tests.
 * The app itself ships without any sample data.
 * Dates are relative to "now"; intelligence is calculated by the real scoring engine.
 */
import { analyzeLead, statusLabel } from '../../src/shared.ts'
import type { FollowUp, HistoryEntry, Lead, LeadInput, LeadStatus, User } from '../../src/shared.ts'

export const DEMO_PASSWORD = 'demo123'

export const SEED_USERS: User[] = [
  { id: 'u-admin', name: 'Ahsan Malik', email: 'admin@leadintel.dev', role: 'admin', title: 'Sales Manager', active: true },
  { id: 'u-sara', name: 'Sara Ahmed', email: 'sara@leadintel.dev', role: 'sales', title: 'Sales Executive', active: true },
  { id: 'u-ali', name: 'Ali Raza', email: 'ali@leadintel.dev', role: 'sales', title: 'Sales Executive', active: true },
  { id: 'u-hina', name: 'Hina Shah', email: 'hina@leadintel.dev', role: 'sales', title: 'Business Developer', active: true },
  { id: 'u-omer', name: 'Omer Khalid', email: 'omer@leadintel.dev', role: 'sales', title: 'Sales Executive', active: false },
]

interface Seed extends LeadInput {
  status: LeadStatus
  assignedTo: string | null
  daysAgo: number
}

const SEEDS: Seed[] = [
  { contactName: 'Ayesha Khan', email: 'ayesha.khan@bloomorganics.pk', phone: '+92 300 1234567', jobTitle: 'Founder', companyName: 'Bloom Organics', website: 'https://bloomorganics.pk', industry: 'E-commerce & Retail', companySize: '11-50', location: 'Lahore, Pakistan', inquiry: 'We need an online store with payment gateway and inventory sync. Budget approved, want to launch before Eid — please share a quote ASAP.', budget: 8000, timeline: 'short', urgency: 'high', existingTech: ['WordPress', 'WooCommerce'], requiredServices: ['ecom', 'seo'], source: 'Website', status: 'qualified', assignedTo: 'u-sara', daysAgo: 9 },
  { contactName: 'Usman Tariq', email: 'usman@medicareclinics.com.pk', phone: '+92 321 7654321', jobTitle: 'Operations Director', companyName: 'MediCare Clinics', website: 'https://medicareclinics.com.pk', industry: 'Healthcare', companySize: '51-200', location: 'Islamabad, Pakistan', inquiry: 'Looking for a patient appointment mobile app and an admin dashboard for our 6 clinics. Need a proposal and pricing.', budget: 18000, timeline: 'short', urgency: 'medium', existingTech: ['PHP', 'MySQL'], requiredServices: ['mobile', 'custom'], source: 'Referral', status: 'proposal', assignedTo: 'u-ali', daysAgo: 21 },
  { contactName: 'Daniel Brooks', email: 'd.brooks@northwindlogistics.co.uk', phone: '+44 20 7946 0958', jobTitle: 'CTO', companyName: 'Northwind Logistics', website: 'https://northwindlogistics.co.uk', industry: 'Logistics', companySize: '201-500', location: 'London, UK', inquiry: 'We want to migrate our fleet tracking system to AWS and add a real-time analytics dashboard. Comparing vendors this month.', budget: 30000, timeline: 'short', urgency: 'high', existingTech: ['.NET', 'SQL Server', 'Azure'], requiredServices: ['cloud', 'ai', 'custom'], source: 'LinkedIn', status: 'negotiation', assignedTo: 'u-sara', daysAgo: 30 },
  { contactName: 'Fatima Noor', email: 'info@brightpath.edu.pk', phone: '', jobTitle: 'Administrator', companyName: 'BrightPath Academy', website: '', industry: 'Education', companySize: '11-50', location: 'Karachi, Pakistan', inquiry: 'Just exploring options for a new school website, maybe next year.', budget: 1500, timeline: 'long', urgency: 'low', existingTech: [], requiredServices: ['web'], source: 'Website', status: 'new', assignedTo: null, daysAgo: 1 },
  { contactName: 'Hamza Sheikh', email: 'hamza@payease.io', phone: '+92 333 5550101', jobTitle: 'Co-founder & CEO', companyName: 'PayEase', website: 'https://payease.io', industry: 'Finance & Fintech', companySize: '11-50', location: 'Lahore, Pakistan', inquiry: 'Startup building a payments wallet. Need a UI/UX redesign of our app and a fraud-detection prototype. Funding closed, need to start immediately.', budget: 22000, timeline: 'immediate', urgency: 'high', existingTech: ['React Native', 'Node.js', 'PostgreSQL'], requiredServices: ['uiux', 'ai', 'mobile'], source: 'Event', status: 'qualified', assignedTo: 'u-hina', daysAgo: 4 },
  { contactName: 'Sana Malik', email: 'sana@urbannest.pk', phone: '+92 345 2223344', jobTitle: 'Marketing Manager', companyName: 'Urban Nest Realty', website: 'https://urbannest.pk', industry: 'Real Estate', companySize: '11-50', location: 'Islamabad, Pakistan', inquiry: 'Need SEO and Google ads to get more property inquiries, plus small landing page updates.', budget: 2500, timeline: 'short', urgency: 'medium', existingTech: ['WordPress'], requiredServices: ['seo', 'web'], source: 'Email', status: 'contacted', assignedTo: 'u-ali', daysAgo: 6 },
  { contactName: 'Omar Farooq', email: 'omar@spiceroute.pk', phone: '+92 302 8889900', jobTitle: 'General Manager', companyName: 'Spice Route Restaurants', website: 'https://spiceroute.pk', industry: 'Hospitality & Food', companySize: '51-200', location: 'Karachi, Pakistan', inquiry: 'Want an online ordering app for our 4 branches with delivery tracking. What would it cost?', budget: 9000, timeline: 'medium', urgency: 'medium', existingTech: ['POS system'], requiredServices: ['mobile', 'ecom'], source: 'Phone', status: 'new', assignedTo: 'u-sara', daysAgo: 2 },
  { contactName: 'Laura Schmidt', email: 'l.schmidt@kessler-mfg.de', phone: '+49 89 1234 5678', jobTitle: 'Head of IT', companyName: 'Kessler Manufacturing GmbH', website: 'https://kessler-mfg.de', industry: 'Manufacturing', companySize: '500+', location: 'Munich, Germany', inquiry: 'Our ERP integration and inventory system need modernisation. We require a partner for a long-term engagement; budget approved for Q1.', budget: 45000, timeline: 'medium', urgency: 'medium', existingTech: ['SAP', 'Java'], requiredServices: ['custom', 'cloud'], source: 'LinkedIn', status: 'proposal', assignedTo: 'u-hina', daysAgo: 26 },
  { contactName: 'Bilal Ahmed', email: 'bilal.quickcart@gmail.com', phone: '+92 311 4445566', jobTitle: 'Owner', companyName: 'QuickCart', website: 'https://quickcart.pk', industry: 'E-commerce & Retail', companySize: '1-10', location: 'Faisalabad, Pakistan', inquiry: 'Need help with website speed and SEO. Not sure about budget.', budget: 0, timeline: 'medium', urgency: 'low', existingTech: ['Shopify'], requiredServices: ['seo'], source: 'Website', status: 'contacted', assignedTo: 'u-ali', daysAgo: 12 },
  { contactName: 'Mehwish Raza', email: 'mehwish@carebridge.pk', phone: '+92 322 9998877', jobTitle: 'IT Lead', companyName: 'CareBridge Pharmacy', website: 'https://carebridge.pk', industry: 'Healthcare', companySize: '51-200', location: 'Lahore, Pakistan', inquiry: 'We need a chatbot for prescription refills and an analytics dashboard. Deadline is end of next month.', budget: 12000, timeline: 'short', urgency: 'high', existingTech: ['Laravel'], requiredServices: ['ai', 'custom'], source: 'Referral', status: 'won', assignedTo: 'u-sara', daysAgo: 38 },
  { contactName: 'Kamran Javed', email: 'kamran@technova.io', phone: '+92 51 5556677', jobTitle: 'Engineering Manager', companyName: 'TechNova Solutions', website: 'https://technova.io', industry: 'Technology & SaaS', companySize: '201-500', location: 'Rawalpindi, Pakistan', inquiry: 'Looking for a DevOps partner to set up CI/CD and Kubernetes on AWS.', budget: 14000, timeline: 'short', urgency: 'medium', existingTech: ['Docker', 'GitHub Actions', 'AWS'], requiredServices: ['cloud'], source: 'LinkedIn', status: 'qualified', assignedTo: 'u-hina', daysAgo: 8 },
  { contactName: 'Zainab Ali', email: 'zainab@glowbeauty.pk', phone: '', jobTitle: 'Owner', companyName: 'Glow Beauty', website: '', industry: 'Other', companySize: '1-10', location: 'Lahore, Pakistan', inquiry: 'Curious about getting a shop app someday.', budget: 0, timeline: 'long', urgency: 'low', existingTech: ['Instagram shop'], requiredServices: ['mobile'], source: 'Website', status: 'lost', assignedTo: 'u-ali', daysAgo: 33 },
  { contactName: 'Michael Chen', email: 'michael@harbortravel.com', phone: '+971 4 555 0199', jobTitle: 'Product Director', companyName: 'Harbor Travel Co.', website: 'https://harbortravel.com', industry: 'Hospitality & Food', companySize: '51-200', location: 'Dubai, UAE', inquiry: 'Need a booking portal redesign with better UX and multilingual support. Please send a proposal by Friday.', budget: 16000, timeline: 'short', urgency: 'high', existingTech: ['Angular', 'Node.js'], requiredServices: ['uiux', 'web'], source: 'Email', status: 'new', assignedTo: null, daysAgo: 0 },
  { contactName: 'Nadia Hussain', email: 'nadia@greenfieldagro.pk', phone: '+92 61 4567890', jobTitle: 'Data Manager', companyName: 'GreenField Agro', website: 'https://greenfieldagro.pk', industry: 'Manufacturing', companySize: '201-500', location: 'Multan, Pakistan', inquiry: 'We want a crop-yield prediction dashboard using our sensor data.', budget: 20000, timeline: 'medium', urgency: 'medium', existingTech: ['Excel', 'IoT sensors'], requiredServices: ['ai', 'custom'], source: 'Event', status: 'contacted', assignedTo: 'u-sara', daysAgo: 15 },
  { contactName: 'Ayesha K.', email: 'ayesha@bloomorganics.pk', phone: '+92 300 1234567', jobTitle: 'Founder', companyName: 'Bloom Organics Pvt Ltd', website: 'bloomorganics.pk', industry: 'E-commerce & Retail', companySize: '11-50', location: 'Lahore, Pakistan', inquiry: 'Also interested in social media marketing for our store.', budget: 1000, timeline: 'short', urgency: 'medium', existingTech: [], requiredServices: ['seo'], source: 'Email', status: 'new', assignedTo: null, daysAgo: 0 },
  { contactName: 'Hassan Iqbal', email: 'hassan.iqbal@finserve.com.pk', phone: '+92 21 3456789', jobTitle: 'Chief Digital Officer', companyName: 'FinServe Microfinance', website: 'https://finserve.com.pk', industry: 'Finance & Fintech', companySize: '500+', location: 'Karachi, Pakistan', inquiry: 'Need a secure loan management portal and mobile app for field officers. RFP attached, vendor selection in 3 weeks.', budget: 40000, timeline: 'short', urgency: 'high', existingTech: ['Oracle', 'Java'], requiredServices: ['custom', 'mobile', 'cloud'], source: 'Referral', status: 'negotiation', assignedTo: 'u-hina', daysAgo: 18 },
]

const DAY = 86_400_000
const HOUR = 3_600_000
const now = Date.now()
const iso = (ms: number) => new Date(ms).toISOString()

const PIPELINE: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won']

export function buildSeedData() {
  const leads: Lead[] = []
  const history: HistoryEntry[] = []
  let h = 1

  SEEDS.forEach((seed, i) => {
    const { status, assignedTo, daysAgo, ...input } = seed
    const createdMs = now - daysAgo * DAY - (i % 5) * 2 * HOUR - HOUR
    const id = `L-${String(1001 + i)}`
    const creator = assignedTo ?? 'u-admin'
    history.push({ id: `H-${h++}`, leadId: id, at: iso(createdMs), actorId: creator, action: 'Lead created', detail: `Inquiry received via ${input.source}.` })
    if (assignedTo) history.push({ id: `H-${h++}`, leadId: id, at: iso(createdMs + 20 * 60_000), actorId: 'u-admin', action: 'Lead assigned', detail: `Assigned to ${SEED_USERS.find((u) => u.id === assignedTo)?.name}.` })

    // status trail through the pipeline
    const target = status === 'lost' ? 2 : PIPELINE.indexOf(status)
    for (let s = 1; s <= target; s++) {
      const at = createdMs + ((daysAgo * DAY) / (target + 1)) * s
      history.push({ id: `H-${h++}`, leadId: id, at: iso(Math.min(at, now - HOUR)), actorId: assignedTo ?? 'u-admin', action: 'Status changed', detail: `${statusLabel(PIPELINE[s - 1])} → ${statusLabel(PIPELINE[s])}` })
    }
    if (status === 'lost') history.push({ id: `H-${h++}`, leadId: id, at: iso(now - 2 * DAY), actorId: assignedTo ?? 'u-admin', action: 'Status changed', detail: `${statusLabel('qualified')} → ${statusLabel('lost')} (no budget this year)` })

    leads.push({
      ...input,
      id,
      status,
      assignedTo,
      createdBy: creator,
      createdAt: iso(createdMs),
      updatedAt: iso(Math.min(createdMs + daysAgo * DAY * 0.8, now - HOUR)),
      notes: '',
      intelligence: analyzeLead(input, status),
    })
  })

  const fu = (leadId: string, type: FollowUp['type'], dueOffsetHours: number, note: string, done = false, by = 'u-sara'): FollowUp => ({
    id: `F-${leadId}-${dueOffsetHours}`,
    leadId,
    type,
    dueAt: iso(now + dueOffsetHours * HOUR),
    note,
    status: done ? 'done' : 'pending',
    createdBy: by,
    completedAt: done ? iso(now + dueOffsetHours * HOUR + HOUR) : undefined,
  })

  const followUps: FollowUp[] = [
    fu('L-1001', 'call', -26, 'Confirm payment gateway choice and launch date.', false, 'u-sara'),
    fu('L-1001', 'email', 30, 'Send e-commerce case studies and timeline.', false, 'u-sara'),
    fu('L-1002', 'meeting', 3, 'Proposal walkthrough with operations team.', false, 'u-ali'),
    fu('L-1003', 'call', 5, 'Negotiate AWS migration phase pricing.', false, 'u-sara'),
    fu('L-1005', 'demo', -4, 'Show fintech UI portfolio and AI prototype plan.', false, 'u-hina'),
    fu('L-1006', 'email', 48, 'Share SEO audit summary.', false, 'u-ali'),
    fu('L-1007', 'call', 8, 'Discovery call about ordering app.', false, 'u-sara'),
    fu('L-1008', 'email', -50, 'Proposal follow-up for ERP modernisation.', false, 'u-hina'),
    fu('L-1009', 'call', 72, 'Ask about budget range for SEO.', false, 'u-ali'),
    fu('L-1010', 'meeting', -120, 'Project kick-off meeting.', true, 'u-sara'),
    fu('L-1011', 'call', 26, 'Qualification call with engineering manager.', false, 'u-hina'),
    fu('L-1013', 'call', 2, 'First contact — proposal requested by Friday.', false, 'u-admin'),
    fu('L-1014', 'email', -72, 'Send data requirements questionnaire.', true, 'u-sara'),
    fu('L-1016', 'meeting', 20, 'Contract terms discussion with CDO.', false, 'u-hina'),
  ]

  history.sort((a, b) => b.at.localeCompare(a.at))
  return { leads, followUps, history, users: SEED_USERS }
}
