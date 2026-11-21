/** Website analysis helpers: page text, footer/social/contact details, About link, archive history and the AI company profile. */
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { profileCompany, resetAiCooldown } from '../src/ai.ts'
import type { WebsiteAnalysis } from '../src/shared.ts'
import { aboutLink, contactEmails, copyrightYears, domainHistory, pageText, socialLinks } from '../src/websiteAnalyzer.ts'

const realFetch = globalThis.fetch
const savedEnv = { ...process.env }
afterEach(() => {
  globalThis.fetch = realFetch
  process.env = { ...savedEnv }
  resetAiCooldown()
})

const html = `<html><head><title>Green Leaf Café</title><style>.x{color:red}</style><script>var secret = 1</script></head>
<body><nav><a href="/menu">Menu</a><a href="/company">Company</a><a href="/about-us">About us</a></nav>
<h1>Fresh food &amp; coffee in Lahore</h1><p>Family owned since 2009.</p>
<a href="https://www.facebook.com/greenleafcafe">fb</a><a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>
<a href="https://instagram.com/greenleaf/">ig</a><a href="mailto:Hello@GreenLeaf.pk">mail</a>
<footer>&copy; 2012 - 2026 Green Leaf Café</footer></body></html>`

describe('website content helpers', () => {
  it('extracts readable text without scripts or styles', () => {
    const t = pageText(html)
    assert.ok(t.includes('Fresh food & coffee in Lahore'))
    assert.ok(t.includes('Family owned since 2009.'))
    assert.ok(!t.includes('secret') && !t.includes('color:red'))
  })

  it('finds copyright years, social profiles and contact email', () => {
    assert.equal(copyrightYears(pageText(html)), '2012–2026')
    assert.equal(copyrightYears('Copyright 2019 Acme'), '2019')
    assert.equal(copyrightYears('no footer here'), undefined)
    assert.deepEqual(socialLinks(html), ['https://www.facebook.com/greenleafcafe', 'https://instagram.com/greenleaf'])
    assert.deepEqual(contactEmails(html), ['hello@greenleaf.pk'])
  })

  it('prefers a real About page over a generic Company link', () => {
    assert.equal(aboutLink(html, new URL('https://greenleaf.pk/'))?.toString(), 'https://greenleaf.pk/about-us')
    assert.equal(aboutLink('<a href="https://other.com/about">About</a>', new URL('https://greenleaf.pk/')), null, 'other sites are ignored')
  })

  it('reads the domain history from the Internet Archive', async () => {
    let asked = ''
    globalThis.fetch = (async (url: string | URL) => {
      asked = String(url)
      return new Response(JSON.stringify([['timestamp'], ['20090312101010'], ['20150101000000'], ['20260101000000']]), { status: 200 })
    }) as typeof fetch
    const h = await domainHistory('www.greenleaf.pk')
    assert.match(asked, /web\.archive\.org\/cdx\/search\/cdx\?url=greenleaf\.pk/)
    assert.deepEqual(h, { firstSeen: '2009-03-12', lastSeen: '2026-01-01', archivedYears: [2009, 2015, 2026], archiveUrl: 'https://web.archive.org/web/*/greenleaf.pk' })
  })

  it('returns null when the archive has no record or fails', async () => {
    globalThis.fetch = (async () => new Response('[]', { status: 200 })) as typeof fetch
    assert.equal(await domainHistory('new-site.pk'), null)
    globalThis.fetch = (async () => {
      throw new Error('offline')
    }) as typeof fetch
    assert.equal(await domainHistory('new-site.pk'), null)
  })
})

const analysis: WebsiteAnalysis = {
  url: 'https://greenleaf.pk/',
  analyzedAt: new Date().toISOString(),
  hasSsl: true,
  mobileFriendly: false,
  performanceScore: 55,
  seoScore: 48,
  detectedTech: ['WordPress'],
  observations: ['No mobile viewport tag: the layout is likely not responsive.'],
  opportunities: ['UI/UX redesign for mobile', 'SEO & Digital Marketing'],
  simulated: false,
  title: 'Green Leaf Café',
  description: 'Fresh food and coffee in Lahore.',
  copyrightYears: '2012–2026',
  domainHistory: { firstSeen: '2009-03-12', lastSeen: '2026-01-01', archivedYears: [2009, 2015, 2026], archiveUrl: 'https://web.archive.org/web/*/greenleaf.pk' },
}
const content = { homeText: pageText(html), aboutText: 'We opened our first café in 2009.', headings: ['Fresh food & coffee in Lahore'] }

describe('AI company profile', () => {
  it('asks Gemini with the site text and archive history, and returns its profile', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    delete process.env.ANTHROPIC_API_KEY
    let prompt = ''
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      prompt = JSON.parse(String(init?.body)).contents[0].parts[0].text
      const profile = {
        overview: 'A family café in Lahore.',
        whatTheyDo: ['Serves food and coffee'],
        productsAndServices: ['Coffee'],
        targetCustomers: 'Local diners',
        location: 'Lahore',
        history: ['Opened in 2009', 'Domain online since 2009'],
        websitePurpose: 'Inform visitors',
        seoSummary: 'Basic SEO.',
        salesAngle: ['Mobile redesign'],
        generalKnowledge: '',
      }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(profile) }] }, finishReason: 'STOP' }] }), { status: 200 })
    }) as typeof fetch
    const p = await profileCompany({ analysis, content })
    assert.equal(p.source, 'gemini')
    assert.equal(p.location, 'Lahore')
    assert.ok(prompt.includes('<website_content>') && prompt.includes('We opened our first café in 2009.'))
    assert.ok(prompt.includes('first snapshot 2009-03-12'))
    assert.ok(prompt.includes('Copyright years in footer: 2012–2026'))
  })

  it('builds a template profile from the measured facts without an AI key', async () => {
    delete process.env.GEMINI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_AUTH_TOKEN
    const p = await profileCompany({ analysis, content })
    assert.equal(p.source, 'template')
    assert.equal(p.overview, 'Fresh food and coffee in Lahore.')
    assert.ok(p.history.some((x) => x.includes('2012–2026')))
    assert.ok(p.history.some((x) => x.includes('2009-03-12')))
    assert.deepEqual(p.salesAngle, ['UI/UX redesign for mobile', 'SEO & Digital Marketing'])
  })
})
