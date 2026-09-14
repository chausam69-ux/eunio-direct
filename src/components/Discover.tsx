import { useState } from 'react'
import { Field, Modal } from './ui'

// ponytail: zero-budget discovery. Generates a prompt for Claude.ai / Gemini (subscriptions
// already paid), user pastes the CSV they get back into "Import CSV". Swap for a server
// function calling the Claude API when there is API budget (see git history: netlify/functions/discover.ts).

const CSV_COLUMNS = 'company,industry,location,website,potential_products,priority,notes'

function buildPrompt(industry: string, location: string, count: number) {
  return `You are helping Eunio Services for Steel, an Indian stainless steel supplier, find direct B2B customers.
Eunio sells round, square and oval stainless steel pipes and stainless steel coils in grades SS304, SS316 and SS316L.

Task: search the web and list up to ${count} REAL companies in the "${industry}" industry located in ${location} that consume these products as raw material (manufacturers, fabricators, OEMs, EPC contractors, builders). Exclude traders and other steel mills.

Rules:
- Only include companies you actually found evidence for. Never invent names or websites. Leave website blank if unsure.
- potential_products: choose from Round SS Pipe; Square SS Pipe; Oval SS Pipe; SS Coil — separate multiple with ";".
- priority: high if you confirmed they use stainless steel, otherwise medium.
- notes: one sentence — what they make and why they need SS pipes/coils.

Output ONLY a CSV code block with exactly this header line and one row per company, no commentary:
${CSV_COLUMNS}`
}

export default function Discover({ onClose }: { onClose: () => void; onAdded: () => void }) {
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [count, setCount] = useState(10)
  const [copied, setCopied] = useState(false)
  const prompt = industry && location ? buildPrompt(industry, location, count) : ''

  async function copy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal title="Find target customers with AI" onClose={onClose} wide>
      <div className="grid md:grid-cols-3 gap-3">
        <Field label="Industry"><input className="input" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Dairy equipment, Pharma, Railings…" /></Field>
        <Field label="Location"><input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ahmedabad / Gujarat" /></Field>
        <Field label="How many"><input className="input" type="number" min={1} max={30} value={count} onChange={e => setCount(Number(e.target.value))} /></Field>
      </div>

      <ol className="mt-4 text-sm text-steel-300 space-y-1 list-decimal list-inside">
        <li>Fill industry + location above, then <b>Copy prompt</b>.</li>
        <li>Paste into <a className="text-brand" href="https://claude.ai/new" target="_blank" rel="noreferrer">Claude</a> or <a className="text-brand" href="https://gemini.google.com/app" target="_blank" rel="noreferrer">Gemini</a> (web search on). It returns a CSV.</li>
        <li>Save the CSV as a <code>.csv</code> file → <b>Import CSV</b> on the Accounts page. Verify each company before calling.</li>
      </ol>

      {prompt && (
        <>
          <textarea readOnly className="input mt-4 font-mono text-xs h-56" value={prompt} />
          <div className="flex justify-end gap-2 mt-3">
            <button className="btn-ghost" onClick={onClose}>Close</button>
            <button className="btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy prompt'}</button>
          </div>
        </>
      )}
    </Modal>
  )
}
