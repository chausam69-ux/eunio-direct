import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import { useData } from '../lib/useData'
import type { Account, Activity, Contact, NewAccount } from '../lib/types'
import { STATUS_LABEL } from '../lib/types'
import { ErrorBox, Field, Modal } from './ui'

const PRODUCTS = ['Round SS Pipe', 'Square SS Pipe', 'Oval SS Pipe', 'SS Coil']
const today = () => new Date().toISOString().slice(0, 10)

const blank: NewAccount = {
  company: '', industry: '', location: '', website: '', potential_products: [], priority: 'medium',
  status: 'target', source: 'manual', verified: true, last_activity: null, next_action: '', next_action_date: null, notes: '',
}

export default function AccountForm({ account, onClose, onSaved }: { account: Account | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<NewAccount>(account ? { ...account } : blank)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof NewAccount>(k: K, v: NewAccount[K]) => setF(p => ({ ...p, [k]: v }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!f.company.trim()) return setErr('Company name required')
    if (f.next_action && !f.next_action_date) return setErr('Next action needs a date')
    setBusy(true); setErr('')
    try {
      const payload = { ...f, next_action: f.next_action || null, next_action_date: f.next_action_date || null }
      if (account) await db.accounts.update(account.id, payload)
      else await db.accounts.insert([payload])
      onSaved()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  async function remove() {
    if (!account || !confirm(`Delete ${account.company} and all its contacts/opportunities?`)) return
    await db.accounts.remove(account.id); onSaved()
  }

  return (
    <Modal title={account ? account.company : 'New account'} onClose={onClose} wide>
      <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
        <Field label="Company"><input className="input" value={f.company} onChange={e => set('company', e.target.value)} required /></Field>
        <Field label="Industry"><input className="input" value={f.industry ?? ''} onChange={e => set('industry', e.target.value)} placeholder="e.g. Dairy equipment, Pharma, Architecture" /></Field>
        <Field label="Location"><input className="input" value={f.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="City, State" /></Field>
        <Field label="Website"><input className="input" value={f.website ?? ''} onChange={e => set('website', e.target.value)} /></Field>
        <div className="md:col-span-2">
          <span className="label">Potential products</span>
          <div className="flex flex-wrap gap-2">
            {PRODUCTS.map(p => {
              const on = f.potential_products.includes(p)
              return <button type="button" key={p} onClick={() => set('potential_products', on ? f.potential_products.filter(x => x !== p) : [...f.potential_products, p])}
                className={`badge cursor-pointer border ${on ? 'bg-brand/20 border-brand text-brand' : 'border-steel-600 text-steel-300'}`}>{p}</button>
            })}
          </div>
        </div>
        <Field label="Priority">
          <select className="input" value={f.priority} onChange={e => set('priority', e.target.value as NewAccount['priority'])}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </Field>
        <Field label="Status">
          <select className="input" value={f.status} onChange={e => set('status', e.target.value as NewAccount['status'])}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Next action"><input className="input" value={f.next_action ?? ''} onChange={e => set('next_action', e.target.value)} placeholder="Call purchase head re: SS304 pipe requirement" /></Field>
        <Field label="Next action date"><input className="input" type="date" value={f.next_action_date ?? ''} onChange={e => set('next_action_date', e.target.value || null)} /></Field>
        <div className="md:col-span-2"><Field label="Notes"><textarea className="input" rows={3} value={f.notes ?? ''} onChange={e => set('notes', e.target.value)} /></Field></div>
        {f.source === 'ai' && (
          <label className="md:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.verified} onChange={e => set('verified', e.target.checked)} />
            Verified — I checked this company is real and relevant
          </label>
        )}
        {err && <div className="md:col-span-2"><ErrorBox msg={err} /></div>}
        <div className="md:col-span-2 flex gap-2 justify-end">
          {account && <button type="button" className="btn-ghost text-red-300 mr-auto" onClick={remove}>Delete</button>}
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>

      {account && <Contacts accountId={account.id} />}
      {account && <Activities account={account} />}
      {account && <NewDeal account={account} />}
    </Modal>
  )
}

function Contacts({ accountId }: { accountId: string }) {
  const { data, reload } = useData(() => db.contacts.forAccount(accountId), [accountId])
  const [c, setC] = useState({ name: '', role: '', phone: '', email: '' })
  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!c.name.trim()) return
    await db.contacts.insert({ account_id: accountId, name: c.name, role: c.role || null, phone: c.phone || null, email: c.email || null, is_primary: !(data?.length) })
    setC({ name: '', role: '', phone: '', email: '' }); reload()
  }
  return (
    <section className="mt-6 border-t border-steel-700 pt-4">
      <h3 className="font-medium mb-2">Contacts</h3>
      <ul className="text-sm space-y-1 mb-3">
        {data?.map((p: Contact) => (
          <li key={p.id} className="flex gap-3 items-center">
            <span className="font-medium">{p.name}</span><span className="text-steel-400">{p.role}</span>
            {p.phone && <a className="text-steel-300 hover:text-brand" href={`tel:${p.phone}`}>{p.phone}</a>}
            {p.email && <a className="text-steel-300 hover:text-brand" href={`mailto:${p.email}`}>{p.email}</a>}
            <button type="button" className="ml-auto text-steel-500 hover:text-red-400 cursor-pointer" onClick={() => db.contacts.remove(p.id).then(reload)}>remove</button>
          </li>
        ))}
        {data?.length === 0 && <li className="text-steel-400">No contacts yet — who should we call?</li>}
      </ul>
      <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <input className="input" placeholder="Name" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} />
        <input className="input" placeholder="Role" value={c.role} onChange={e => setC({ ...c, role: e.target.value })} />
        <input className="input" placeholder="Phone" value={c.phone} onChange={e => setC({ ...c, phone: e.target.value })} />
        <input className="input" placeholder="Email" value={c.email} onChange={e => setC({ ...c, email: e.target.value })} />
        <button className="btn-ghost justify-center">Add</button>
      </form>
    </section>
  )
}

function Activities({ account }: { account: Account }) {
  const { data, reload } = useData(() => db.activities.forAccount(account.id), [account.id])
  const [type, setType] = useState<Activity['type']>('call')
  const [summary, setSummary] = useState('')
  async function log(e: React.FormEvent) {
    e.preventDefault()
    if (!summary.trim()) return
    await db.activities.insert({ account_id: account.id, opportunity_id: null, type, summary })
    // Logging contact auto-advances Target -> Contacted and stamps last_activity.
    await db.accounts.update(account.id, { last_activity: today(), ...(account.status === 'target' && type !== 'note' ? { status: 'contacted' } : {}) })
    setSummary(''); reload()
  }
  return (
    <section className="mt-6 border-t border-steel-700 pt-4">
      <h3 className="font-medium mb-2">Activity log</h3>
      <form onSubmit={log} className="flex gap-2 mb-3">
        <select className="input max-w-[130px]" value={type} onChange={e => setType(e.target.value as Activity['type'])}>
          {['call', 'email', 'whatsapp', 'visit', 'note'].map(t => <option key={t}>{t}</option>)}
        </select>
        <input className="input" placeholder="What happened?" value={summary} onChange={e => setSummary(e.target.value)} />
        <button className="btn-ghost">Log</button>
      </form>
      <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
        {data?.map(a => (
          <li key={a.id} className="flex gap-3"><span className="text-steel-500 shrink-0 w-24">{a.at.slice(0, 10)} · {a.type}</span><span>{a.summary}</span></li>
        ))}
      </ul>
    </section>
  )
}

function NewDeal({ account }: { account: Account }) {
  const nav = useNavigate()
  async function create() {
    const o = await db.opportunities.insert({ account_id: account.id, stage: 'requirement', products: [], value_inr: 0 })
    if (account.status !== 'qualified') await db.accounts.update(account.id, { status: 'qualified' })
    nav(`/pipeline?open=${o.id}`)
  }
  return (
    <section className="mt-6 border-t border-steel-700 pt-4 flex items-center justify-between">
      <p className="text-sm text-steel-400">Got a concrete requirement? Open a deal — marks account Qualified.</p>
      <button type="button" className="btn-primary" onClick={create}>+ New requirement</button>
    </section>
  )
}
