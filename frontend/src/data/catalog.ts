import type { CompanySize, LeadSource, LeadStatus, Service, Timeline, Urgency } from '../types'

/**
 * Starting service catalogue. The live catalogue is stored in the database and edited by the Admin
 * (Services page); these entries are only used to seed a new database.
 * Keywords drive service-fit scoring; industries add a small fit bonus.
 */
export const DEFAULT_SERVICES: Service[] = [
  { id: 'web', name: 'Website Development', category: 'Web', basePrice: 3000, description: 'Corporate websites, landing pages and web portals.', keywords: ['website', 'web', 'landing', 'portal', 'wordpress', 'site'], industries: ['Education', 'Real Estate', 'Healthcare', 'Hospitality & Food'] },
  { id: 'ecom', name: 'E-commerce Store', category: 'Web', basePrice: 6000, description: 'Online stores with payments, inventory and order management.', keywords: ['ecommerce', 'e-commerce', 'store', 'shop', 'checkout', 'shopify', 'online sales', 'ordering', 'payment gateway'], industries: ['E-commerce & Retail', 'Hospitality & Food'] },
  { id: 'mobile', name: 'Mobile App Development', category: 'Mobile', basePrice: 12000, description: 'Android and iOS apps built with modern cross-platform tools.', keywords: ['app', 'mobile', 'android', 'ios', 'flutter', 'react native'], industries: ['Healthcare', 'Finance & Fintech', 'Hospitality & Food', 'Logistics'] },
  { id: 'uiux', name: 'UI/UX Design', category: 'Design', basePrice: 2500, description: 'Research, wireframes, prototypes and design systems.', keywords: ['design', 'ui', 'ux', 'redesign', 'prototype', 'figma', 'user experience'], industries: ['Technology & SaaS', 'Finance & Fintech', 'Hospitality & Food'] },
  { id: 'seo', name: 'SEO & Digital Marketing', category: 'Marketing', basePrice: 1500, description: 'Search ranking, paid ads and social media growth.', keywords: ['seo', 'marketing', 'ads', 'traffic', 'social media', 'ranking', 'google', 'inquiries'], industries: ['E-commerce & Retail', 'Real Estate', 'Education'] },
  { id: 'custom', name: 'Custom Software / ERP', category: 'Software', basePrice: 15000, description: 'ERP, CRM, dashboards and business automation systems.', keywords: ['erp', 'crm', 'software', 'system', 'dashboard', 'automation', 'inventory', 'management portal', 'loan management'], industries: ['Manufacturing', 'Logistics', 'Finance & Fintech', 'Healthcare'] },
  { id: 'cloud', name: 'Cloud & DevOps', category: 'Infrastructure', basePrice: 5000, description: 'Cloud migration, CI/CD, containers and hosting.', keywords: ['cloud', 'aws', 'azure', 'devops', 'hosting', 'migrate', 'migration', 'server', 'kubernetes', 'ci/cd'], industries: ['Technology & SaaS', 'Logistics', 'Manufacturing'] },
  { id: 'ai', name: 'AI & Data Solutions', category: 'Data', basePrice: 10000, description: 'Chatbots, analytics dashboards and prediction models.', keywords: ['ai', 'chatbot', 'machine learning', 'data', 'analytics', 'prediction', 'fraud', 'detection'], industries: ['Healthcare', 'Finance & Fintech', 'Manufacturing', 'Logistics'] },
]

// ── live catalogue (set from the API on the frontend, from the database on the backend) ──
let catalog: Service[] = DEFAULT_SERVICES
export const getServices = () => catalog
export function setServiceCatalog(list: Service[]) {
  catalog = list.length ? list : DEFAULT_SERVICES
}
export const serviceById = (id: string) => catalog.find((s) => s.id === id)
export const serviceName = (id: string) => serviceById(id)?.name ?? id

export const INDUSTRIES = [
  'E-commerce & Retail',
  'Healthcare',
  'Education',
  'Finance & Fintech',
  'Real Estate',
  'Logistics',
  'Hospitality & Food',
  'Technology & SaaS',
  'Manufacturing',
  'Other',
]

export const COMPANY_SIZES: CompanySize[] = ['1-10', '11-50', '51-200', '201-500', '500+']

export const TIMELINES: { value: Timeline; label: string }[] = [
  { value: 'immediate', label: 'Immediately' },
  { value: 'short', label: 'Within 1–3 months' },
  { value: 'medium', label: '3–6 months' },
  { value: 'long', label: '6+ months / not decided' },
]
export const timelineLabel = (t: Timeline) => TIMELINES.find((x) => x.value === t)?.label ?? t

export const URGENCIES: { value: Urgency; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export const SOURCES: LeadSource[] = ['Website', 'Referral', 'LinkedIn', 'Email', 'Phone', 'Event']

export const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
]
export const statusLabel = (s: LeadStatus) => STATUSES.find((x) => x.value === s)?.label ?? s

export const TECH_SUGGESTIONS = ['WordPress', 'Shopify', 'WooCommerce', 'React', 'Angular', 'Node.js', 'PHP', 'Laravel', '.NET', 'Java', 'Python', 'MySQL', 'PostgreSQL', 'SQL Server', 'AWS', 'Azure', 'SAP', 'Excel']
