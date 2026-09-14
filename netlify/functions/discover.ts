import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// POST /.netlify/functions/discover  { industry, location, products, count }
// Returns candidate companies likely to buy Vividium's SS pipes/coils.
// Every result is flagged unverified — the team must confirm before contacting.
// ponytail: Netlify sync function, ~10-26s wall clock. If web search pushes past it,
// move this file to a Supabase Edge Function (150s) or drop max_uses to 1.

const SCHEMA = {
  type: 'object',
  properties: {
    companies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          industry: { type: 'string' },
          location: { type: 'string' },
          website: { type: 'string' },
          potential_products: { type: 'array', items: { type: 'string' } },
          why: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['company', 'industry', 'location', 'website', 'potential_products', 'why', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['companies'],
  additionalProperties: false,
} as const

const SYSTEM = `You help Vividium Steel (Indian stainless steel manufacturer) find direct B2B customers.
Vividium sells: round/square/oval stainless steel pipes and stainless steel coils, grades SS304, SS316, SS316L.

Find REAL companies that consume these products in the requested industry and location. Use web search to confirm each company exists and to get its website. Prefer manufacturers, fabricators, OEMs, EPC contractors, and builders who buy steel as raw material — not traders or other steel mills.

Rules:
- Only list companies you found evidence for. Never invent names or websites.
- If you cannot confirm a website, set it to "".
- confidence = high only if web search confirmed the company AND its use of stainless steel.
- potential_products must be from: "Round SS Pipe", "Square SS Pipe", "Oval SS Pipe", "SS Coil".
- why: one sentence on what they make and why they need SS pipes/coils.`

async function requireUser(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '')
  if (!token) return null
  const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
  const { data, error } = await sb.auth.getUser(token)
  return error ? null : data.user
}

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!(await requireUser(req))) return new Response('Unauthorized', { status: 401 })

  const body = await req.json().catch(() => ({}))
  const industry = String(body.industry || '').slice(0, 100)
  const location = String(body.location || '').slice(0, 100)
  const products = String(body.products || 'SS pipes and coils').slice(0, 200)
  const count = Math.min(Math.max(Number(body.count) || 8, 1), 15)
  if (!industry || !location) return Response.json({ error: 'industry and location required' }, { status: 400 })

  const client = new Anthropic()
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 6000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4, user_location: { type: 'approximate', country: 'IN' } }],
      messages: [{
        role: 'user',
        content: `Find up to ${count} companies. Industry: ${industry}. Location: ${location}. Products of interest: ${products}.`,
      }],
    })
    if (response.stop_reason === 'refusal') return Response.json({ error: 'Request declined by model' }, { status: 422 })
    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return Response.json({ error: 'No result' }, { status: 502 })
    return Response.json(JSON.parse(text.text))
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return Response.json({ error: 'Bad ANTHROPIC_API_KEY' }, { status: 500 })
    if (e instanceof Anthropic.RateLimitError) return Response.json({ error: 'Rate limited, retry in a minute' }, { status: 429 })
    if (e instanceof Anthropic.APIError) return Response.json({ error: `Claude API ${e.status}: ${e.message}` }, { status: 502 })
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
