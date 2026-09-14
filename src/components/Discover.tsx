import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { ErrorBox, Field, Modal } from './ui'

interface Candidate {
  company: string; industry: string; location: string; website: string
  potential_products: string[]; why: string; confidence: 'high' | 'medium' | 'low'
}

const CONF = { high: 'text-emerald-300', medium: 'text-amber-300', low: 'text-red-300' }

export default function Discover({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [count, setCount] = useState(8)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [results, setResults] = useState<Candidate[]>([])
  const [picked, setPicked] = useState<Set<number>>(new Set())

  async function run(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(''); setResults([]); setPicked(new Set())
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/.netlify/functions/discover', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ industry, location, count }),
      })
      const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setResults(j.companies ?? [])
      setPicked(new Set((j.companies ?? []).map((_: Candidate, i: number) => i)))
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  async function add() {
    const rows = results.filter((_, i) => picked.has(i)).map(c => ({
      company: c.company, industry: c.industry, location: c.location, website: c.website || null,
      potential_products: c.potential_products, priority: (c.confidence === 'high' ? 'high' : 'medium') as 'high' | 'medium',
      source: 'ai' as const, verified: false, notes: `AI: ${c.why}`,
      next_action: 'Verify company + find purchase contact', next_action_date: new Date().toISOString().slice(0, 10),
    }))
    if (!rows.length) return
    setBusy(true)
    try { await db.accounts.insert(rows); onAdded() } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <Modal title="Find target customers with AI" onClose={onClose} wide>
      <form onSubmit={run} className="grid md:grid-cols-4 gap-3 items-end">
        <Field label="Industry"><input className="input" required value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Dairy equipment, Pharma, Railings…" /></Field>
        <Field label="Location"><input className="input" required value={location} onChange={e => setLocation(e.target.value)} placeholder="Ahmedabad / Gujarat" /></Field>
        <Field label="How many"><input className="input" type="number" min={1} max={15} value={count} onChange={e => setCount(Number(e.target.value))} /></Field>
        <button className="btn-primary justify-center" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </form>
      <p className="text-xs text-steel-400 mt-2">Uses Claude with web search. Results are suggestions — every one lands as <b>unverified</b> with next action "Verify". Takes 15–30s.</p>

      {err && <div className="mt-4"><ErrorBox msg={err} /></div>}

      {results.length > 0 && (
        <>
          <ul className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {results.map((c, i) => (
              <li key={i} className="flex gap-3 p-3 rounded-lg bg-steel-800 border border-steel-700">
                <input type="checkbox" className="mt-1" checked={picked.has(i)} onChange={e => { const s = new Set(picked); e.target.checked ? s.add(i) : s.delete(i); setPicked(s) }} />
                <div className="text-sm">
                  <div className="font-medium">{c.company} <span className={`text-xs ${CONF[c.confidence]}`}>· {c.confidence} confidence</span></div>
                  <div className="text-steel-400">{c.industry} · {c.location} {c.website && <>· <a className="hover:text-brand" href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">{c.website}</a></>}</div>
                  <div className="text-steel-300 mt-1">{c.why}</div>
                  <div className="text-xs text-steel-500 mt-1">{c.potential_products.join(', ')}</div>
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
