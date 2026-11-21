/**
 * REAL website analysis (server side).
 * Downloads the public home page and inspects it: HTTPS, response time, page weight,
 * SEO tags, mobile viewport, and technology signatures. No third-party API keys needed.
 *
 * Security: only public http(s) hosts are allowed (private / local network addresses are blocked)
 * so the server cannot be used to probe internal machines.
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { WebsiteAnalysis } from './shared.ts'

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

const meta = (html: string, name: string) =>
  html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i'))?.[1]

export async function analyzeWebsite(input: string): Promise<WebsiteAnalysis> {
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
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim().replace(/\s+/g, ' ') ?? ''
  const description = meta(html, 'description')?.trim() ?? ''
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
  const lighthouse = await lighthousePerformance(url.toString())
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

  return {
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
  }
}
