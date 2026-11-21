/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, commas/newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text // drop a UTF-8 byte-order mark (Excel)
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      if (row.some((v) => v.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  if (row.some((v) => v.trim() !== '')) rows.push(row)
  return rows
}

/** Column headers we understand (several spellings each) → lead field. */
const ALIASES: Record<string, string[]> = {
  contactName: ['contactname', 'contact', 'name', 'clientname', 'client', 'fullname'],
  email: ['email', 'emailaddress', 'mail'],
  phone: ['phone', 'contactnumber', 'mobile', 'phonenumber', 'whatsapp'],
  jobTitle: ['jobtitle', 'title', 'designation', 'position'],
  companyName: ['companyname', 'company', 'organisation', 'organization', 'business'],
  website: ['website', 'companywebsite', 'url', 'site'],
  industry: ['industry', 'sector'],
  companySize: ['companysize', 'size', 'employees'],
  location: ['location', 'city', 'country', 'address'],
  inquiry: ['inquiry', 'enquiry', 'message', 'requirement', 'requirements', 'description', 'notes'],
  budget: ['budget', 'estimatedbudget', 'budgetusd'],
  timeline: ['timeline', 'expectedtimeline'],
  urgency: ['urgency', 'priority'],
  existingTech: ['existingtech', 'existingtechnology', 'technology', 'techstack'],
  requiredServices: ['requiredservices', 'services', 'service'],
  source: ['source', 'leadsource', 'channel'],
}

export const LEAD_FIELDS = Object.keys(ALIASES)

export function mapHeader(h: string): string | null {
  const key = h.toLowerCase().replace(/[^a-z]/g, '')
  return Object.entries(ALIASES).find(([, names]) => names.includes(key))?.[0] ?? null
}

const TIMELINE: Record<string, string> = { immediate: 'immediate', immediately: 'immediate', asap: 'immediate', short: 'short', '1-3 months': 'short', medium: 'medium', '3-6 months': 'medium', long: 'long', '6+ months': 'long' }

/** Turn CSV rows into objects the API accepts; service names are resolved by the server. */
export function rowsToLeads(rows: string[][], serviceLookup: (name: string) => string | undefined) {
  const [header, ...body] = rows
  const fields = header.map(mapHeader)
  return body.map((r) => {
    const o: Record<string, unknown> = {}
    fields.forEach((f, i) => {
      if (!f) return
      const v = (r[i] ?? '').trim()
      if (f === 'budget') o.budget = Number(v.replace(/[^\d.]/g, '')) || 0
      else if (f === 'existingTech') o.existingTech = v ? v.split(/[;|,]/).map((x) => x.trim()).filter(Boolean) : []
      else if (f === 'requiredServices') o.requiredServices = v ? v.split(/[;|,]/).map((x) => serviceLookup(x.trim()) ?? x.trim()).filter(Boolean) : []
      else if (f === 'timeline') o.timeline = TIMELINE[v.toLowerCase()] ?? 'medium'
      else if (f === 'urgency' || f === 'companySize' || f === 'source') o[f] = f === 'urgency' ? v.toLowerCase() : v
      else o[f] = v
    })
    return o
  })
}

export const TEMPLATE_CSV = [
  'Client name,Email,Phone,Job title,Company,Website,Industry,Company size,Location,Inquiry,Budget,Timeline,Urgency,Existing technology,Required services,Source',
  'Ayesha Khan,ayesha@example.com,+92 300 1234567,Founder,Bloom Organics,bloomorganics.pk,E-commerce & Retail,11-50,"Lahore, Pakistan","We need an online store with payment gateway, please share a quote.",8000,short,high,WordPress;WooCommerce,E-commerce Store;SEO & Digital Marketing,Website',
].join('\n')
