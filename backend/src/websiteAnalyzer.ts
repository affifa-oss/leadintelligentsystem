/**
 * REAL website analysis (server side).
 * Downloads the public home page and inspects it: HTTPS, response time, page weight,
 * SEO tags, mobile viewport, and technology signatures. No third-party API keys needed.
 * It also reads the About page, footer, social links and the domain's history in the
 * Internet Archive, and returns the readable page text so the AI can write a company profile.
 *
 * Security: only public http(s) hosts are allowed (private / local network addresses are blocked)
 * so the server cannot be used to probe internal machines.
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { DomainHistory, WebsiteAnalysis } from './shared.ts'

const TIMEOUT_MS = 12_000
const MAX_BYTES = 3 * 1024 * 1024
const UA = 'Mozilla/5.0 (compatible; LeadIntelBot/1.0; lead intelligence website check)'

export class AnalysisError extends Error {}

/**
 * Real Lighthouse performance score from Google PageSpeed Insights (mobile).
 * Works without a key (shared daily quota); set PAGESPEED_API_KEY for reliable use. Returns null on any failure.
 */
async function lighthousePerformance(url: string): Promise<number | null> {
  if (process.env.PAGESPEED_ENABLED === 'false') return null
  const api = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  api.searchParams.set('url', url)
  api.searchParams.set('strategy', 'mobile')
  api.searchParams.set('category', 'performance')
  if (process.env.PAGESPEED_API_KEY) api.searchParams.set('key', process.env.PAGESPEED_API_KEY)
  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(Number(process.env.PAGESPEED_TIMEOUT_MS) || 35_000) })
    if (!res.ok) return null
    const data = (await res.json()) as { lighthouseResult?: { categories?: { performance?: { score?: number } } } }
    const score = data.lighthouseResult?.categories?.performance?.score
    return typeof score === 'number' ? Math.round(score * 100) : null
  } catch {
    return null
  }
}

function isPrivateAddress(ip: string) {
  if (ip.includes(':')) {
    const v = ip.toLowerCase()
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:192.168.')
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

async function assertPublicHost(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) throw new AnalysisError('Only http and https websites can be analysed.')
  if (url.port && !['80', '443'].includes(url.port)) throw new AnalysisError('Only standard web ports (80/443) are allowed.')
  const host = url.hostname
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new AnalysisError('Local addresses cannot be analysed.')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => {
    throw new AnalysisError(`Could not find the website “${host}”. Check the address.`)
  })
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new AnalysisError('Private network addresses cannot be analysed.')
}

/** fetch with manual redirects so every hop is checked against the public-host rule. */
async function fetchPage(start: URL) {
  let url = start
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicHost(url)
    const t0 = performance.now()
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' } })
    const ttfb = performance.now() - t0
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url)
      continue
    }
    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_BYTES) {
          await reader.cancel()
          break
        }
        chunks.push(value)
      }
    }
    const total = performance.now() - t0
    const html = new TextDecoder().decode(Buffer.concat(chunks))
    return { res, url, html, size, ttfb, total }
  }
  throw new AnalysisError('Too many redirects.')
}

const TECH_SIGNATURES: { name: string; test: (html: string, h: Headers) => boolean }[] = [
  { name: 'WordPress', test: (s) => /wp-content|wp-includes/i.test(s) },
  { name: 'WooCommerce', test: (s) => /woocommerce/i.test(s) },
  { name: 'Shopify', test: (s, h) => /cdn\.shopify\.com|Shopify\.theme/i.test(s) || h.has('x-shopid') },
  { name: 'Wix', test: (s) => /static\.wixstatic\.com|wix\.com/i.test(s) },
  { name: 'Squarespace', test: (s) => /squarespace/i.test(s) },
  { name: 'Webflow', test: (s) => /webflow/i.test(s) },
  { name: 'Next.js', test: (s, h) => /__NEXT_DATA__|\/_next\//.test(s) || /next\.js/i.test(h.get('x-powered-by') ?? '') },
  { name: 'Nuxt', test: (s) => /__NUXT__|\/_nuxt\//.test(s) },
  { name: 'React', test: (s) => /data-reactroot|react-dom|__NEXT_DATA__/i.test(s) },
  { name: 'Angular', test: (s) => /ng-version=|ng-app/i.test(s) },
  { name: 'Vue.js', test: (s) => /data-v-[0-9a-f]{6,}|vue(\.min)?\.js/i.test(s) },
  { name: 'Laravel', test: (_s, h) => /laravel_session|XSRF-TOKEN/i.test(h.get('set-cookie') ?? '') },
  { name: 'PHP', test: (_s, h) => /php/i.test(h.get('x-powered-by') ?? '') || /PHPSESSID/i.test(h.get('set-cookie') ?? '') },
  { name: 'ASP.NET', test: (_s, h) => /asp\.net/i.test(h.get('x-powered-by') ?? '') || h.has('x-aspnet-version') },
  { name: 'jQuery', test: (s) => /jquery(\.min)?\.js|jquery-\d/i.test(s) },
  { name: 'Bootstrap', test: (s) => /bootstrap(\.min)?\.(css|js)/i.test(s) },
  { name: 'Tailwind CSS', test: (s) => /tailwind/i.test(s) },
  { name: 'Google Analytics', test: (s) => /googletagmanager\.com|google-analytics\.com|gtag\(/i.test(s) },
  { name: 'Meta Pixel', test: (s) => /connect\.facebook\.net|fbq\(/i.test(s) },
  { name: 'Cloudflare', test: (_s, h) => /cloudflare/i.test(h.get('server') ?? '') || h.has('cf-ray') },
  { name: 'Nginx', test: (_s, h) => /nginx/i.test(h.get('server') ?? '') },
  { name: 'Apache', test: (_s, h) => /apache/i.test(h.get('server') ?? '') },
  { name: 'Vercel', test: (_s, h) => /vercel/i.test(h.get('server') ?? '') || h.has('x-vercel-id') },
]

/** Readable text of an HTML page (no scripts, styles or tags), trimmed to `max` characters. */
export function pageText(html: string, max = 6000) {
  return html
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|p|div|li|h[1-6]|tr|section|article|header|footer)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&copy;/gi, '©')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, max)
}

const SOCIAL = /https?:\/\/(?:www\.)?(?:facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|pinterest\.com)\/[^\s"'<>?#]+/gi

export function socialLinks(html: string) {
  const found = (html.match(SOCIAL) ?? []).map((u) => u.replace(/\/+$/, ''))
  // skip share buttons and generic pages
  return [...new Set(found.filter((u) => !/sharer|share\?|intent\/|\/plugins\/|\/dialog\/|\/tr$|\/watch$/i.test(u)))].slice(0, 8)
}

export function contactEmails(html: string) {
  const found = html.match(/mailto:([^"'?\s>]+)/gi)?.map((m) => decodeURIComponent(m.slice(7)).toLowerCase()) ?? []
  return [...new Set(found.filter((e) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)))].slice(0, 3)
}

export function copyrightYears(text: string) {
  const m = text.match(/(?:©|copyright)\s*(?:\(c\)\s*)?((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/i)
  return m ? (m[2] ? `${m[1]}–${m[2]}` : m[1]) : undefined
}

/** Finds a link to the About / Company / Our story page on the same site. */
export function aboutLink(html: string, base: URL): URL | null {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  let best: { url: URL; rank: number } | null = null
  for (const [, href, label] of links) {
    if (/^(mailto|tel|javascript):/i.test(href)) continue
    const text = label.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    // Lower rank = better: an /about path beats an "About us" label, which beats a generic "company" link.
    const rank = /\/(about|about-us|who-we-are|our-story)\/?$/i.test(href)
      ? 0
      : /^(about|about us|who we are|our story|our company)$/i.test(text)
        ? 1
        : /about|who we are|our story|history|über uns|qui sommes/i.test(`${href} ${text}`)
          ? 2
          : /^company$|\/company\/?$/i.test(text || href)
            ? 3
            : -1
    if (rank < 0 || (best && best.rank <= rank)) continue
    try {
      const u = new URL(href, base)
      if (u.hostname.replace(/^www\./, '') === base.hostname.replace(/^www\./, '') && u.pathname !== base.pathname) best = { url: u, rank }
    } catch {
      /* ignore bad links */
    }
    if (best?.rank === 0) break
  }
  return best?.url ?? null
}

/** Reads the About page (best effort: any failure just means no About text). */
async function aboutPage(html: string, base: URL) {
  const link = aboutLink(html, base)
  if (!link) return null
  try {
    const page = await fetchPage(link)
    if (page.res.status >= 400) return null
    return { url: page.url.toString(), text: pageText(page.html, 4000) }
  } catch {
    return null
  }
}

const isoFromStamp = (t: string) => `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`

/** When the domain first appeared online and which years it was archived, from the Internet Archive. */
export async function domainHistory(host: string): Promise<DomainHistory | null> {
  if (process.env.ARCHIVE_LOOKUP === 'false') return null
  const domain = host.replace(/^www\./, '')
  const api = new URL('https://web.archive.org/cdx/search/cdx')
  api.searchParams.set('url', domain)
  api.searchParams.set('output', 'json')
  api.searchParams.set('fl', 'timestamp')
  api.searchParams.set('collapse', 'timestamp:4') // one snapshot per year
  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(Number(process.env.ARCHIVE_TIMEOUT_MS) || 12_000), headers: { 'user-agent': UA } })
    if (!res.ok) return null
    const rows = (await res.json()) as string[][]
    const stamps = rows.slice(1).map((r) => r[0]).filter((t) => /^\d{8}/.test(t))
    if (!stamps.length) return null
    return {
      firstSeen: isoFromStamp(stamps[0]),
      lastSeen: isoFromStamp(stamps[stamps.length - 1]),
      archivedYears: [...new Set(stamps.map((t) => Number(t.slice(0, 4))))],
      archiveUrl: `https://web.archive.org/web/*/${domain}`,
    }
  } catch {
    return null
  }
}

/** Text the AI reads to describe the company. Not stored. */
export interface SiteContent {
  homeText: string
  aboutText: string
  headings: string[]
}

const meta = (html: string, name: string) =>
  html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'))?.[1]

export async function analyzeWebsite(input: string): Promise<{ analysis: WebsiteAnalysis; content: SiteContent }> {
  const trimmed = input.trim()
  if (!trimmed) throw new AnalysisError('Enter a website address.')
  let start: URL
  try {
    start = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    throw new AnalysisError('That does not look like a valid website address.')
  }

  let page: Awaited<ReturnType<typeof fetchPage>>
  try {
    page = await fetchPage(start)
  } catch (e) {
    if (e instanceof AnalysisError) throw e
    // https failed and the user did not insist on https → try plain http once
    if (!/^https:\/\//i.test(trimmed)) {
      try {
        page = await fetchPage(new URL(`http://${start.host}${start.pathname}`))
      } catch {
        throw new AnalysisError(`Could not reach ${start.host}. The site may be down or blocking automated checks.`)
      }
    } else throw new AnalysisError(`Could not reach ${start.host}. The site may be down or blocking automated checks.`)
  }

  const { res, url, html, size, total } = page
  if (res.status >= 400) throw new AnalysisError(`The website responded with error ${res.status}.`)

  const h = res.headers
  // pageText also turns HTML entities such as &amp; into normal characters.
  const title = pageText(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '', 300).replace(/\s+/g, ' ')
  const description = pageText(meta(html, 'description') ?? '', 500).replace(/\s+/g, ' ')
  const viewport = meta(html, 'viewport') ?? ''
  const hasH1 = /<h1[\s>]/i.test(html)
  const hasLang = /<html[^>]+lang=/i.test(html)
  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html)
  const hasOg = !!meta(html, 'og:title') || !!meta(html, 'og:description')
  const noindex = /noindex/i.test(meta(html, 'robots') ?? '')
  const imgs = html.match(/<img\b[^>]*>/gi) ?? []
  const imgsWithAlt = imgs.filter((t) => /\balt=["'][^"']+["']/i.test(t)).length
  const altRatio = imgs.length ? imgsWithAlt / imgs.length : 1
  const scripts = (html.match(/<script\b/gi) ?? []).length
  const hasSsl = url.protocol === 'https:'
  const mobileFriendly = /width\s*=\s*device-width/i.test(viewport)
  const compressed = !!h.get('content-encoding')
  const sizeKb = Math.round(size / 1024)

  // SEO score (0–100) from on-page checks
  let seo = 0
  if (title) seo += title.length >= 10 && title.length <= 70 ? 18 : 10
  if (description) seo += description.length >= 50 && description.length <= 170 ? 18 : 10
  if (hasH1) seo += 12
  if (mobileFriendly) seo += 10
  if (hasLang) seo += 6
  if (hasCanonical) seo += 6
  if (hasOg) seo += 10
  seo += Math.round(10 * altRatio)
  if (hasSsl) seo += 10
  if (noindex) seo -= 20
  const seoScore = Math.max(0, Math.min(100, seo))

  // Estimated performance (server response time + page weight + scripts). Not a full Lighthouse audit.
  let perf = 100
  if (total > 3000) perf -= 40
  else if (total > 1500) perf -= 25
  else if (total > 800) perf -= 10
  if (sizeKb > 1500) perf -= 20
  else if (sizeKb > 500) perf -= 10
  if (scripts > 25) perf -= 15
  else if (scripts > 12) perf -= 8
  if (!compressed) perf -= 5
  const estimated = Math.max(5, Math.min(100, perf))
  // These lookups are independent, so run them at the same time.
  const [lighthouse, about, history] = await Promise.all([lighthousePerformance(url.toString()), aboutPage(html, url), domainHistory(url.hostname)])
  // Keep the start of the page and the footer (where copyright, address and company details usually are).
  const fullText = pageText(html, 400_000)
  const homeText = fullText.length > 6000 ? `${fullText.slice(0, 4800)}\n…\n${fullText.slice(-1200)}` : fullText
  const headings = [...html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => pageText(m[1], 160)).filter(Boolean).slice(0, 15)
  const performanceScore = lighthouse ?? estimated

  const detectedTech = TECH_SIGNATURES.filter((t) => {
    try {
      return t.test(html, h)
    } catch {
      return false
    }
  }).map((t) => t.name)

  const observations: string[] = []
  const opportunities: string[] = []
  observations.push(`Server responded in ${Math.round(total)} ms; home page is ${sizeKb} KB with ${scripts} script${scripts === 1 ? '' : 's'}.`)
  if (size < 2048) observations.unshift('The home page returned almost no content (it may be a parked domain, a redirect page or a JavaScript-only app), so SEO and mobile results are limited. Check the site manually.')
  if (!hasSsl) {
    observations.push('Site is served without HTTPS.')
    opportunities.push('SSL setup and secure hosting')
  }
  if (!mobileFriendly) {
    observations.push('No mobile viewport tag: the layout is likely not responsive.')
    opportunities.push('UI/UX redesign for mobile')
  }
  if (!description) observations.push('Missing meta description.')
  if (!hasH1) observations.push('No main heading (H1) on the home page.')
  if (altRatio < 0.6 && imgs.length) observations.push(`${imgs.length - imgsWithAlt} of ${imgs.length} images have no alt text.`)
  if (seoScore < 60) opportunities.push('SEO & Digital Marketing')
  if (performanceScore < 60) opportunities.push('Website performance optimisation')
  if (detectedTech.some((t) => ['WordPress', 'Wix', 'jQuery'].includes(t))) opportunities.push('Modernise the website with a current framework')
  if (!detectedTech.some((t) => ['Shopify', 'WooCommerce'].includes(t))) opportunities.push('Add online sales, booking or lead-capture features')
  if (!detectedTech.includes('Google Analytics')) opportunities.push('Set up analytics and conversion tracking')
  if (seoScore >= 75 && performanceScore >= 75) observations.push('Overall the website is in good technical shape.')
  if (history) observations.push(`Domain first archived on ${history.firstSeen}; seen online in ${history.archivedYears.length} different year${history.archivedYears.length === 1 ? '' : 's'}.`)

  const analysis: WebsiteAnalysis = {
    url: url.toString(),
    analyzedAt: new Date().toISOString(),
    hasSsl,
    mobileFriendly,
    performanceScore,
    seoScore,
    detectedTech,
    observations,
    opportunities: opportunities.slice(0, 5),
    simulated: false,
    performanceSource: lighthouse !== null ? 'lighthouse' : 'estimate',
    title,
    description,
    responseTimeMs: Math.round(total),
    pageSizeKb: sizeKb,
    domainHistory: history,
    copyrightYears: copyrightYears(fullText),
    socialLinks: socialLinks(html),
    contactEmails: contactEmails(html),
    aboutPageUrl: about?.url,
  }
  return { analysis, content: { homeText, aboutText: about?.text ?? '', headings } }
}
