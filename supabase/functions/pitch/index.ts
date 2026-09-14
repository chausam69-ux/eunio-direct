// Supabase Edge Function: POST /functions/v1/pitch { account_id }
// Writes a personalised cold email (subject + body) for one target account
// using Gemini, Eunio's profile from `settings`, and the account's contacts.
import { createClient } from 'npm:@supabase/supabase-js@2'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

const SYSTEM = `You write short, specific B2B sales emails for an Indian stainless steel supplier. Plain text, no markdown, no placeholders like [Name] — use the real names given or a neutral greeting. 120-180 words. Structure:
1. One line showing you know what the prospect makes.
2. What we sell (only the products listed) and why it fits THEIR use (grade suitability, finish, sizes, reliability of supply, direct pricing without middlemen).
3. One concrete next step (share requirement / call / send sizes for a quote).
4. Signature with our contact details exactly as given.
Never invent certifications, prices, or facts not provided.

Respond with ONLY JSON: {"subject":"","body":""}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const auth = req.headers.get('authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return json({ error: 'GEMINI_API_KEY not set' }, 500)

  const { account_id } = await req.json().catch(() => ({}))
  if (!account_id) return json({ error: 'account_id required' }, 400)

  const [{ data: account }, { data: contacts }, { data: profileRow }, { data: products }] = await Promise.all([
    sb.from('accounts').select('*').eq('id', account_id).single(),
    sb.from('contacts').select('name, role, email').eq('account_id', account_id),
    sb.from('settings').select('value').eq('key', 'profile').single(),
    sb.from('products').select('name, grades, finishes, sizes').order('name'),
  ])
  if (!account) return json({ error: 'Account not found' }, 404)
  const profile = (profileRow?.value ?? {}) as Record<string, string>

  const prompt = `PROSPECT
Company: ${account.company}
Industry: ${account.industry ?? ''}
Location: ${account.location ?? ''}
What we know: ${account.notes ?? ''}
Products they likely need: ${(account.potential_products ?? []).join(', ') || 'stainless steel pipes / coils'}
Contacts: ${(contacts ?? []).map(c => `${c.name}${c.role ? ' (' + c.role + ')' : ''}`).join('; ') || 'none known — use "Dear Sir/Madam" or "Dear Purchase Team"'}

US
Company: ${profile.company || 'Eunio Services for Steel'}
Sender: ${profile.sender || ''} ${profile.title ? '- ' + profile.title : ''}
Phone: ${profile.phone || ''}
Email: ${profile.email || ''}
Website: ${profile.website || ''}
Address: ${profile.address || ''}
About us: ${profile.about || 'Direct supplier of stainless steel pipes and coils.'}
Products we sell: ${(products ?? []).map(p => `${p.name} (grades ${(p.grades ?? []).join('/') || 'SS304/316/316L'}${p.finishes?.length ? ', finishes ' + p.finishes.join('/') : ''}${p.sizes?.length ? ', sizes ' + p.sizes.join('/') : ''})`).join('; ')}`

  const r = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5 } }),
  })
  if (!r.ok) return json({ error: r.status === 429 ? 'Gemini quota exhausted — wait a minute and retry' : `Gemini ${r.status}` }, r.status === 429 ? 429 : 502)
  const data = await r.json()
  const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  const m = text.match(/\{[\s\S]*\}/)
  try { const out = JSON.parse(m![0]); return json({ subject: out.subject ?? '', body: out.body ?? '' }) }
  catch { return json({ error: 'Gemini returned no JSON', raw: text.slice(0, 300) }, 502) }
})
