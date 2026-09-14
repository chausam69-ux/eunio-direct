import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { ErrorBox, Field, Modal } from './ui'

// Discovery = Supabase Edge Function `discover` → Gemini free tier + Google Search.
// Fallback (no key / rate limit): copy prompt into Claude.ai/Gemini, import the CSV.

interface Person { name: string; role?: string; phone?: string; email?: string }
interface Candidate {
  company: string; industry: string; location: string; website: string
  phone?: string; email?: string; address?: string
  potential_products: string[]; why: string; confidence: 'high' | 'medium' | 'low'
  contacts?: Person[]
}
const CONF = { high: 'text-emerald-300', medium: 'text-amber-300', low: 'text-red-300' }
const CSV_COLUMNS = 'company,industry,location,website,potential_products,priority,notes'
const today = () => new Date().toISOString().slice(0, 10)
// Common stainless-steel-consuming segments; hints only, free text allowed.
const INDUSTRIES = ['Dairy & food processing equipment', 'Pharma & chemical plants', 'Architecture, railings & facades', 'Commercial kitchen equipment', 'Water treatment & plumbing', 'Automotive & exhaust', 'Furniture & interiors', 'Sugar, brewery & distillery', 'Solar & renewable structures', 'Hospital & lab furniture']

function buildPrompt(industry: string, location: string, count: number) {
  return `You are helping Eunio Services for Steel, an Indian stainless steel supplier, find direct B2B customers.
Eunio sells round, square and oval stainless steel pipes and stainless steel coils in grades SS304, SS316 and SS316L.

Task: search the web and list up to ${count} REAL companies ${industry ? `in the "${industry}" industry` : 'across industries that consume stainless steel (dairy/food equipment, pharma, chemical, architecture/railings, kitchen equipment, water treatment, automotive, furniture, sugar/brewery, solar structures)'} located in ${location} that consume these products as raw material (manufacturers, fabricators, OEMs, EPC contractors, builders). Exclude traders and other steel mills.

Rules:
- Only include companies you actually found evidence for. Never invent names or websites. Leave website blank if unsure.
- potential_products: choose from Round SS Pipe; Square SS Pipe; Oval SS Pipe; SS Coil — separate multiple with ";".
- priority: high if you confirmed they use stainless steel, otherwise medium.
- notes: one sentence — what they make and why they need SS pipes/coils.

Output ONLY a CSV code block with exactly this header line and one row per company, no commentary:
${CSV_COLUMNS}`
}

export default function Discover({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [count, setCount] = useState(8)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [results, setResults] = useState<Candidate[]>([])
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [showPrompt, setShowPrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  const [grounded, setGrounded] = useState(true)

  async function run(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(''); setResults([]); setPicked(new Set())
    try {
      const { data, error } = await supabase.functions.invoke<{ companies?: Candidate[]; grounded?: boolean; error?: string }>('discover', { body: { industry, location, count } })
      if (error) {
        // FunctionsHttpError carries the JSON body with our message
        const ctx = (error as { context?: Response }).context
        const j = ctx ? await ctx.json().catch(() => null) : null
        throw new Error(j?.error || error.message)
      }
      if (data?.error) throw new Error(data.error)
      const list = data?.companies ?? []
      setGrounded(data?.grounded !== false)
      setResults(list)
      setPicked(new Set(list.map((_, i) => i)))
      if (!list.length) setErr('No companies found. Try a broader industry or a bigger city.')
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  async function add() {
    const chosen = results.filter((_, i) => picked.has(i))
    const rows = chosen.map(c => ({
      company: c.company, industry: c.industry, location: c.location, website: c.website || null,
      potential_products: Array.isArray(c.potential_products) ? c.potential_products : [],
      priority: (c.confidence === 'high' ? 'high' : 'medium') as 'high' | 'medium',
      source: 'ai' as const, verified: false,
      notes: [`AI: ${c.why}`, c.address && `Address: ${c.address}`].filter(Boolean).join('\n'),
      next_action: 'Verify company + find purchase contact', next_action_date: today(),
    }))
    if (!rows.length) return
    setBusy(true)
    try {
      const inserted = await db.accounts.insert(rows)
      const idByCompany = Object.fromEntries(inserted.map(a => [a.company, a.id]))
      const contacts = chosen.flatMap(c => {
        const id = idByCompany[c.company]
        if (!id) return []
        const people = (c.contacts ?? []).filter(p => p.name).map((p, i) => ({ account_id: id, name: p.name, role: p.role || null, phone: p.phone || null, email: p.email || null, is_primary: i === 0 }))
        const office = (c.phone || c.email) ? [{ account_id: id, name: 'Main office', role: 'Switchboard', phone: c.phone || null, email: c.email || null, is_primary: people.length === 0 }] : []
        return [...people, ...office]
      })
      await db.contacts.insertMany(contacts)
      onAdded()
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  async function copy() {
    await navigator.clipboard.writeText(buildPrompt(industry, location, count))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal title="Find target customers with AI" onClose={onClose} wide>
      <form onSubmit={run} className="grid md:grid-cols-4 gap-3 items-end">
        <Field label="Industry (optional)">
          <input className="input" list="industries" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Leave blank — AI picks" />
          <datalist id="industries">{INDUSTRIES.map(i => <option key={i} value={i} />)}</datalist>
        </Field>
        <Field label="Location"><input className="input" required value={location} onChange={e => setLocation(e.target.value)} placeholder="Ahmedabad / Gujarat" /></Field>
        <Field label="How many"><input className="input" type="number" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))} /></Field>
        <button className="btn-primary justify-center" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </form>
      <p className="text-xs text-steel-400 mt-2">
        Gemini + Google Search. Results are suggestions — every one lands as <b>unverified</b> with next action "Verify". 10–30s.
        {' '}<button type="button" className="text-brand cursor-pointer" onClick={() => setShowPrompt(s => !s)}>{showPrompt ? 'Hide' : 'No API / rate-limited? Copy prompt instead'}</button>
      </p>

      {showPrompt && (
        <div className="mt-3 p-3 rounded-lg bg-steel-800 border border-steel-700 text-sm">
          <p className="text-steel-300">Paste into <a className="text-brand" href="https://claude.ai/new" target="_blank" rel="noreferrer">Claude</a> or <a className="text-brand" href="https://gemini.google.com/app" target="_blank" rel="noreferrer">Gemini</a>, save the CSV it returns, then <b>Import CSV</b> on Accounts.</p>
          <button type="button" className="btn-ghost mt-2" disabled={!location} onClick={copy}>{copied ? 'Copied ✓' : 'Copy prompt'}</button>
        </div>
      )}

      {err && <div className="mt-4"><ErrorBox msg={err} /></div>}

      {results.length > 0 && (
        <>
          {!grounded && <p className="mt-4 text-xs text-amber-300">Web search unavailable on the free Gemini tier — these come from the model's memory. Verify each on Google before calling.</p>}
          <ul className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {results.map((c, i) => (
              <li key={i} className="flex gap-3 p-3 rounded-lg bg-steel-800 border border-steel-700">
                <input type="checkbox" className="mt-1" checked={picked.has(i)} onChange={e => { const s = new Set(picked); if (e.target.checked) s.add(i); else s.delete(i); setPicked(s) }} />
                <div className="text-sm">
                  <div className="font-medium">{c.company} <span className={`text-xs ${CONF[c.confidence] ?? CONF.low}`}>· {c.confidence} confidence</span></div>
                  <div className="text-steel-400">{c.industry} · {c.location} {c.website && <>· <a className="hover:text-brand" href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">{c.website}</a></>}</div>
                  <div className="text-steel-300 mt-1">{c.why}</div>
                  {(c.phone || c.email || c.address) && <div className="text-xs text-steel-400 mt-1">{[c.phone, c.email, c.address].filter(Boolean).join(' · ')}</div>}
                  {(c.contacts ?? []).filter(p => p.name).map((p, j) => <div key={j} className="text-xs text-steel-400">Contact: {p.name}{p.role && ` — ${p.role}`}{p.phone && ` · ${p.phone}`}{p.email && ` · ${p.email}`}</div>)}
                  <div className="text-xs text-steel-500 mt-1">{(c.potential_products ?? []).join(', ')}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2 mt-4">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy || picked.size === 0} onClick={add}>Add {picked.size} to accounts</button>
          </div>
        </>
      )}
    </Modal>
  )
}
