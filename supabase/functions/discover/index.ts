// Supabase Edge Function: POST /functions/v1/discover { industry, location, count }
// Calls Gemini (free tier) with Google Search grounding to find real companies that
// buy Eunio's SS pipes/coils. Requires a logged-in Supabase user. Results are
// suggestions — UI flags them unverified.
import { createClient } from 'npm:@supabase/supabase-js@2'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

const SYSTEM = `You help Eunio Services for Steel, an Indian stainless steel supplier, find direct B2B customers.
Eunio sells round, square and oval stainless steel pipes and stainless steel coils in grades SS304, SS316, SS316L.

Use Google Search to find REAL companies that consume these products as raw material: manufacturers, fabricators, OEMs, EPC contractors, builders. Exclude traders and other steel mills.

Rules:
- Only list companies you found evidence for. Never invent names or websites. Use "" for website if unsure.
- confidence: "high" only if search confirmed the company AND its use of stainless steel; else "medium"; "low" if weak.
- potential_products: subset of ["Round SS Pipe","Square SS Pipe","Oval SS Pipe","SS Coil"].
- why: one sentence — what they make and why they need SS pipes/coils.
- Contact info: collect EVERY contact detail you can find for the company — main phone, email, full address, and named people (owner, director, purchase/procurement head, plant head) with role, phone, email. Only include details you actually found or are certain of; NEVER guess or fabricate phone numbers or emails — use "" instead.

Respond with ONLY a JSON object, no markdown, shape:
{"companies":[{"company":"","industry":"","location":"","website":"","phone":"","email":"","address":"","potential_products":[],"why":"","confidence":"high|medium|low","contacts":[{"name":"","role":"","phone":"","email":""}]}]}`

const NO_SEARCH_NOTE = `

NOTE: Web search is unavailable for this request. Answer from your own knowledge only. List ONLY established, well-known companies you are confident actually exist in that location. Prefer fewer, real companies over a full list. Set confidence to "medium" at most, and leave website "" unless you are sure.`

const ENRICH = `You extract B2B contact details from company websites. For each company listed, read the URLs given (home page and contact page) and return ONLY what is actually present on those pages: main phone numbers, email addresses, full postal address, and any named people with roles (directors, owners, purchase/procurement heads, sales or plant heads) with their phone/email if shown. If a page cannot be read or has nothing, return empty strings. NEVER invent details.

Respond with ONLY a JSON object, no markdown, shape:
{"companies":[{"company":"<exact name as given>","website":"<the URL given>","phone":"","email":"","address":"","contacts":[{"name":"","role":"","phone":"","email":""}]}]}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  // Auth: must be a signed-in team member (stops strangers burning the key).
  const auth = req.headers.get('authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return json({ error: 'GEMINI_API_KEY not set (supabase secrets set GEMINI_API_KEY=...)' }, 500)

  const body = await req.json().catch(() => ({}))
  const industry = String(body.industry ?? '').slice(0, 100)
  const location = String(body.location ?? '').slice(0, 100)
  const count = Math.min(Math.max(Number(body.count) || 8, 1), 20)
  if (!location) return json({ error: 'location required' }, 400)

  const ask = (grounded: boolean) => fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM + (grounded ? '' : NO_SEARCH_NOTE) }] },
      contents: [{ role: 'user', parts: [{ text: `Find up to ${count} companies. ${industry ? `Industry: ${industry}.` : 'Spread across the industries that consume stainless steel most (dairy/food equipment, pharma, chemical, architecture/railings, kitchen equipment, water treatment, automotive, furniture, sugar/brewery, solar structures) and fill the industry field for each.'} Location: ${location}, India.` }] }],
      ...(grounded ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: { temperature: 0.2 },
    }),
  })

  // Google Search grounding is not in the Gemini free tier (429 RESOURCE_EXHAUSTED).
  // Try grounded first (works once billing is on), else fall back to model memory.
  let grounded = true
  let r = await ask(true)
  if (r.status === 429) { grounded = false; r = await ask(false) }
  if (!r.ok) {
    const t = await r.text()
    return json({ error: r.status === 429 ? 'Gemini quota exhausted — wait a minute and retry' : `Gemini ${r.status}: ${t.slice(0, 200)}` }, r.status === 429 ? 429 : 502)
  }
  const data = await r.json()
  const first = parseJson(data)
  if (!first) return json({ error: 'Gemini returned no JSON' }, 502)
  let companies: Company[] = Array.isArray(first.companies) ? first.companies : []

  // Pass 2: read each company's website (url_context is on the free tier) to pull
  // real phones / emails / people instead of relying on memory.
  const withSites = companies.filter(c => c.website)
  let enriched = 0
  let enrichError = ''
  if (withSites.length) {
    try {
      const urls = withSites.slice(0, 10).map(c => {
        const base = c.website.startsWith('http') ? c.website : `https://${c.website}`
        return `${c.company}: ${base} and ${base.replace(/\/$/, '')}/contact-us`
      }).join('\n')
      const r2 = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: ENRICH }] },
          contents: [{ role: 'user', parts: [{ text: `Visit these websites (and their contact pages) and extract contact details:\n${urls}` }] }],
          tools: [{ url_context: {} }],
          generationConfig: { temperature: 0.1 },
        }),
      })
      if (r2.ok) {
        const found = parseJson(await r2.json())
        const list: Company[] = found?.companies ?? []
        // Match by website host first (names drift: "Ltd." vs "Limited"), then loose name match.
        const host = (u?: string) => (u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        const norm = (n?: string) => (n || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        companies = companies.map(c => {
          const f = list.find(x => host(x.website) && host(x.website) === host(c.website))
            ?? list.find(x => norm(x.company) && (norm(x.company).includes(norm(c.company).slice(0, 8)) || norm(c.company).includes(norm(x.company).slice(0, 8))))
          if (!f) return c
          enriched++
          return { ...c, phone: c.phone || f.phone || '', email: c.email || f.email || '', address: c.address || f.address || '', contacts: [...(c.contacts ?? []), ...((f.contacts ?? []) as unknown[])] }
        })
      } else {
        enrichError = `Gemini enrich ${r2.status}`
      }
    } catch (e) { enrichError = (e as Error).message }
  }
  return json({ companies, grounded, enriched, enrichError })
})

interface Company { company: string; website: string; phone?: string; email?: string; address?: string; contacts?: unknown[]; [k: string]: unknown }

function parseJson(data: { candidates?: { content?: { parts?: { text?: string }[] } }[] }) {
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
  const m = text.match(/\{[\s\S]*\}/) // tolerate stray prose / code fences around the JSON
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}
