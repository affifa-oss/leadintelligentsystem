/** Unit tests for the scoring engine, duplicate detection, validation and CSV parsing. */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { analyzeLead, classifyIndustry, DEFAULT_SCORING, detectBuyingIntent, guessService } from '../../frontend/src/lib/intelligence.ts'
import { findDuplicates } from '../../frontend/src/lib/duplicates.ts'
import { sanitizeLeadInput, validateLead } from '../../frontend/src/lib/validation.ts'
import { parseCsv, rowsToLeads } from '../../frontend/src/lib/csv.ts'
import type { Lead, LeadInput } from '../../frontend/src/types/index.ts'

const base: LeadInput = {
  contactName: 'Test Client',
  email: 'client@acme.test',
  phone: '+92 300 1234567',
  jobTitle: 'CTO',
  companyName: 'Acme',
  website: 'acme.test',
  industry: 'Healthcare',
  companySize: '201-500',
  location: 'Lahore, Pakistan',
  inquiry: 'We need a patient mobile app and admin dashboard. Budget approved, please share a quote ASAP.',
  budget: 25000,
  timeline: 'immediate',
  urgency: 'high',
  existingTech: ['PHP'],
  requiredServices: ['mobile', 'custom'],
  source: 'Referral',
}

describe('lead scoring', () => {
  it('scores a strong, urgent, well-funded lead as High priority', () => {
    const r = analyzeLead(base)
    assert.ok(r.score >= DEFAULT_SCORING.highThreshold, `score ${r.score}`)
    assert.equal(r.priority, 'high')
    assert.equal(r.breakdown.reduce((a, f) => a + f.max, 0), 100, 'factor maximums add up to 100')
    assert.equal(r.potentialValue, 25000)
    assert.ok(r.reasoning.length >= 2)
    assert.ok(r.nextAction.length > 10)
  })

  it('scores an exploratory lead without budget as Low priority', () => {
    const r = analyzeLead({ ...base, inquiry: 'Just exploring options, maybe next year.', budget: 0, timeline: 'long', urgency: 'low', companySize: '1-10', phone: '', website: '', existingTech: [] })
    assert.equal(r.priority, 'low')
    assert.ok(r.score < DEFAULT_SCORING.mediumThreshold)
  })

  it('estimates value from service prices when no budget is given', () => {
    const r = analyzeLead({ ...base, budget: 0 })
    assert.ok(r.potentialValue > 0)
  })

  it('respects custom thresholds', () => {
    const r = analyzeLead(base, 'new', { highThreshold: 99, mediumThreshold: 10 })
    assert.equal(r.priority, 'medium')
  })

  it('changes the recommended next action with the lead status', () => {
    assert.notEqual(analyzeLead(base, 'new').nextAction, analyzeLead(base, 'proposal').nextAction)
  })
})

describe('buying intent, industry and service fit', () => {
  it('detects strong buying signals', () => {
    const i = detectBuyingIntent(base)
    assert.equal(i.level, 'high')
    assert.ok(i.signals.some((s) => /budget/i.test(s)))
  })

  it('lowers intent for exploratory language', () => {
    assert.equal(detectBuyingIntent({ inquiry: 'just exploring, not sure', urgency: 'low', timeline: 'long', budget: 0 }).level, 'low')
  })

  it('classifies industry from text when "Other" is selected', () => {
    assert.equal(classifyIndustry({ industry: 'Other', companyName: 'City Hospital', website: '', inquiry: 'patient records for our clinic' }), 'Healthcare')
  })

  it('ranks the requested service as the best fit', () => {
    const r = analyzeLead({ ...base, requiredServices: ['seo'], inquiry: 'Need better Google ranking and SEO for more traffic.' })
    assert.equal(r.serviceFit[0].serviceId, 'seo')
  })

  it('guesses a service for forms without a service choice', () => {
    assert.equal(guessService({ ...base, inquiry: 'We want an online store with checkout' }), 'ecom')
  })
})

describe('duplicate detection', () => {
  const existing = { ...base, id: 'L-1', email: 'Client@Acme.test' } as unknown as Lead
  it('matches the same email (case-insensitive)', () => {
    const d = findDuplicates({ email: 'client@acme.test', phone: '', website: '', companyName: 'Other' }, [existing])
    assert.equal(d[0]?.leadId, 'L-1')
    assert.ok(d[0].confidence > 0.9)
  })
  it('matches the same company domain', () => {
    assert.equal(findDuplicates({ email: 'someone@acme.test', phone: '', website: '', companyName: 'X' }, [existing]).length, 1)
  })
  it('does not match unrelated leads', () => {
    assert.equal(findDuplicates({ email: 'a@other.test', phone: '+1 555 0000000', website: 'other.test', companyName: 'Other Co' }, [existing]).length, 0)
  })
})

describe('validation', () => {
  it('accepts a complete lead', () => assert.deepEqual(validateLead(base), {}))
  it('reports missing and invalid fields', () => {
    const e = validateLead({ ...base, email: 'nope', contactName: '', requiredServices: [] })
    assert.ok(e.email && e.contactName && e.requiredServices)
  })
  it('sanitises unknown values to safe defaults', () => {
    const s = sanitizeLeadInput({ timeline: 'tomorrow', budget: -5, companySize: 'huge', existingTech: ['A', 3, ''] })
    assert.equal(s.timeline, 'medium')
    assert.equal(s.budget, 0)
    assert.equal(s.companySize, '11-50')
    assert.deepEqual(s.existingTech, ['A'])
  })
})

describe('CSV import parsing', () => {
  it('handles quotes, commas and line breaks in fields', () => {
    const rows = parseCsv('Name,Message\n"Khan, Ayesha","Line 1\nLine ""2"""\n')
    assert.deepEqual(rows, [['Name', 'Message'], ['Khan, Ayesha', 'Line 1\nLine "2"']])
  })
  it('maps common header names to lead fields', () => {
    const [lead] = rowsToLeads(parseCsv('Client name,Company,Budget,Services\nAli,Acme,"$5,000",SEO & Digital Marketing'), (n) => (n.startsWith('SEO') ? 'seo' : undefined))
    assert.equal(lead.contactName, 'Ali')
    assert.equal(lead.companyName, 'Acme')
    assert.equal(lead.budget, 5000)
    assert.deepEqual(lead.requiredServices, ['seo'])
  })
})
