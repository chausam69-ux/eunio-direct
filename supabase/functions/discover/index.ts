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

Respond with ONLY a JSON object, no markdown, shape:
{"companies":[{"company":"","industry":"","location":"","website":"","potential_products":[],"why":"","confidence":"high|medium|low"}]}`

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

  const r = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: `Find up to ${count} companies. ${industry ? `Industry: ${industry}.` : 'Spread across the industries that consume stainless steel most (dairy/food equipment, pharma, chemical, architecture/railings, kitchen equipment, water treatment, automotive, furniture, sugar/brewery, solar structures) and fill the industry field for each.'} Location: ${location}, India.` }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    const status = r.status === 429 ? 429 : 502
    return json({ error: r.status === 429 ? 'Gemini rate limit hit — wait a minute and retry' : `Gemini ${r.status}: ${t.slice(0, 200)}` }, status)
  }
  const data = await r.json()
  const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  const m = text.match(/\{[\s\S]*\}/) // tolerate stray prose / code fences around the JSON
  if (!m) return json({ error: 'Gemini returned no JSON', raw: text.slice(0, 300) }, 502)
  try {
    const parsed = JSON.parse(m[0])
    return json({ companies: Array.isArray(parsed.companies) ? parsed.companies : [] })
  } catch {
    return json({ error: 'Gemini JSON unparsable', raw: text.slice(0, 300) }, 502)
  }
})
