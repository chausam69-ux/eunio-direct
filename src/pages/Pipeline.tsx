import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db } from '../lib/db'
import { useData } from '../lib/useData'
import { inrLakh, isOverdue } from '../lib/metrics'
import type { Account, NewOpportunity, Opportunity, Product, ProductLine, Stage } from '../lib/types'
import { STAGES, STAGE_LABEL } from '../lib/types'
import { Empty, ErrorBox, Field, Modal, StageBadge } from '../components/ui'

const COLS: Stage[] = ['requirement', 'rfq', 'quotation', 'negotiation', 'won', 'repeat']

export default function Pipeline() {
  const [params, setParams] = useSearchParams()
  const { data, error, loading, reload } = useData(async () => {
    const [opps, accounts, products] = await Promise.all([db.opportunities.list(), db.accounts.list(), db.products.list()])
    return { opps, accounts, products }
  })
  const [showLost, setShowLost] = useState(false)
  const openId = params.get('open')
  const editing = openId ? data?.opps.find(o => o.id === openId) ?? null : null
  const byId = Object.fromEntries((data?.accounts ?? []).map(a => [a.id, a]))
  const close = () => setParams({})

  if (error) return <ErrorBox msg={error} />
  if (loading || !data) return <p className="text-steel-400">Loading…</p>

  const lost = data.opps.filter(o => o.stage === 'lost')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold mr-auto">Pipeline</h1>
        <label className="text-sm text-steel-400 flex items-center gap-2"><input type="checkbox" checked={showLost} onChange={e => setShowLost(e.target.checked)} />Show lost ({lost.length})</label>
      </div>
      {data.opps.length === 0 && <Empty>No deals yet. Open an account and click "New requirement".</Empty>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[...COLS, ...(showLost ? ['lost' as Stage] : [])].map(stage => {
          const items = data.opps.filter(o => o.stage === stage)
          const total = items.reduce((s, o) => s + Number(o.value_inr || 0), 0)
          return (
            <div key={stage} className="card p-3 min-h-40">
              <div className="flex items-center justify-between mb-2">
                <StageBadge s={stage} />
                <span className="text-xs text-steel-400">{items.length} · {inrLakh(total)}</span>
              </div>
              <div className="space-y-2">
                {items.map(o => (
                  <button key={o.id} onClick={() => setParams({ open: o.id })}
                    className="w-full text-left p-2.5 rounded-lg bg-steel-800 border border-steel-700 hover:border-brand cursor-pointer text-sm">
                    <div className="font-medium">{byId[o.account_id]?.company ?? '—'}</div>
                    <div className="text-xs text-steel-400 mt-0.5">{o.products.map(p => `${p.product}${p.grade ? ' ' + p.grade : ''}`).join(', ') || 'no products yet'}</div>
                    <div className="flex justify-between mt-1.5 text-xs">
                      <span className="text-steel-200">{inrLakh(Number(o.value_inr || 0))}</span>
                      <span className={isOverdue(o.next_action_date) ? 'text-red-400' : 'text-steel-400'}>{o.next_action_date ?? 'no date'}</span>
                    </div>
                    {!o.next_action && <div className="text-xs text-red-400 mt-1">next action missing</div>}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {editing && <DealForm opp={editing} account={byId[editing.account_id]} products={data.products} onClose={close} onSaved={() => { close(); reload() }} />}
    </div>
  )
}

const emptyLine: ProductLine = { product: '', grade: '', size: '', thickness: '', finish: '', qty: '', application: '' }

function DealForm({ opp, account, products, onClose, onSaved }: { opp: Opportunity; account?: Account; products: Product[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<NewOpportunity>({ ...opp, products: opp.products.length ? opp.products : [{ ...emptyLine }] })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof NewOpportunity>(k: K, v: NewOpportunity[K]) => setF(p => ({ ...p, [k]: v }))
  const setLine = (i: number, patch: Partial<ProductLine>) => set('products', f.products.map((l, j) => j === i ? { ...l, ...patch } : l))
  const catalogue = (name: string) => products.find(p => p.name === name)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const open = !['won', 'lost'].includes(f.stage)
    if (open && (!f.next_action || !f.next_action_date)) return setErr('Open deals need a next action and date')
    if (f.stage === 'lost' && !f.lost_reason) return setErr('Why lost? One line helps next time.')
    setBusy(true); setErr('')
    try {
      await db.opportunities.update(opp.id, { ...f, products: f.products.filter(l => l.product), next_action: f.next_action || null, next_action_date: f.next_action_date || null })
      if (account) await db.accounts.update(account.id, { last_activity: new Date().toISOString().slice(0, 10) })
      onSaved()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  async function remove() {
    if (!confirm('Delete this deal?')) return
    await db.opportunities.remove(opp.id); onSaved()
  }

  return (
    <Modal title={`${account?.company ?? 'Deal'} — ${STAGE_LABEL[f.stage]}`} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Stage">
            <select className="input" value={f.stage} onChange={e => set('stage', e.target.value as Stage)}>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Value (₹)"><input className="input" type="number" min={0} value={f.value_inr || ''} onChange={e => set('value_inr', Number(e.target.value))} /></Field>
          <Field label="Quote ref"><input className="input" value={f.quote_ref ?? ''} onChange={e => set('quote_ref', e.target.value)} placeholder="VS/Q/2026/041" /></Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="label mb-0">Requirement lines</span>
            <button type="button" className="text-xs text-brand cursor-pointer" onClick={() => set('products', [...f.products, { ...emptyLine }])}>+ line</button>
          </div>
          <div className="space-y-2">
            {f.products.map((l, i) => {
              const cat = catalogue(l.product)
              return (
                <div key={i} className="grid grid-cols-2 md:grid-cols-7 gap-2 p-2 rounded-lg bg-steel-800/60">
                  <select className="input md:col-span-2" value={l.product} onChange={e => setLine(i, { product: e.target.value, grade: '' })}>
                    <option value="">Product…</option>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <Dl className="input" list={`g${i}`} placeholder="Grade" value={l.grade} opts={cat?.grades} onChange={v => setLine(i, { grade: v })} />
                  <Dl className="input" list={`s${i}`} placeholder="Size" value={l.size} opts={cat?.sizes} onChange={v => setLine(i, { size: v })} />
                  <Dl className="input" list={`t${i}`} placeholder="Thickness" value={l.thickness} opts={cat?.thicknesses} onChange={v => setLine(i, { thickness: v })} />
                  <Dl className="input" list={`f${i}`} placeholder="Finish" value={l.finish} opts={cat?.finishes} onChange={v => setLine(i, { finish: v })} />
                  <input className="input" placeholder="Qty (MT / pcs)" value={l.qty} onChange={e => setLine(i, { qty: e.target.value })} />
                  <input className="input md:col-span-6" placeholder="Application (e.g. dairy process piping)" value={l.application} onChange={e => setLine(i, { application: e.target.value })} />
                  <button type="button" className="text-xs text-steel-500 hover:text-red-400 cursor-pointer" onClick={() => set('products', f.products.filter((_, j) => j !== i))}>remove</button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2"><Field label="Next action"><input className="input" value={f.next_action ?? ''} onChange={e => set('next_action', e.target.value)} placeholder="Send quotation for 5 MT SS304 round pipe" /></Field></div>
          <Field label="Next action date"><input className="input" type="date" value={f.next_action_date ?? ''} onChange={e => set('next_action_date', e.target.value || null)} /></Field>
          <Field label="Expected close"><input className="input" type="date" value={f.expected_close ?? ''} onChange={e => set('expected_close', e.target.value || null)} /></Field>
          {f.stage === 'lost' && <div className="md:col-span-2"><Field label="Lost reason"><input className="input" value={f.lost_reason ?? ''} onChange={e => set('lost_reason', e.target.value)} placeholder="Price / lead time / went with partner channel…" /></Field></div>}
          {(f.stage === 'won' || f.stage === 'repeat') && <div className="md:col-span-2 text-sm text-emerald-300 self-end pb-2">Won. Set next action + date for the repeat-order follow-up.</div>}
        </div>
        <Field label="Notes"><textarea className="input" rows={3} value={f.notes ?? ''} onChange={e => set('notes', e.target.value)} /></Field>

        {err && <ErrorBox msg={err} />}
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-ghost text-red-300 mr-auto" onClick={remove}>Delete</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

// Text input with datalist suggestions from the catalogue; free text allowed since specs may not be seeded yet.
function Dl({ list, opts, value, onChange, ...rest }: { list: string; opts?: string[]; value: string; onChange: (v: string) => void; className: string; placeholder: string }) {
  return (
    <>
      <input {...rest} list={list} value={value} onChange={e => onChange(e.target.value)} />
      <datalist id={list}>{opts?.map(o => <option key={o} value={o} />)}</datalist>
    </>
  )
}
