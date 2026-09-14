import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ErrorBox, Field } from '../components/ui'

// Eunio's own details — used in the AI email pitch signature. One shared row: settings.profile
export interface Profile { company: string; sender: string; title: string; phone: string; email: string; website: string; address: string; about: string }
const EMPTY: Profile = { company: 'Eunio Services for Steel', sender: '', title: '', phone: '', email: '', website: '', address: '', about: '' }

export default function Settings() {
  const [p, setP] = useState<Profile>(EMPTY)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const set = (k: keyof Profile, v: string) => setP(x => ({ ...x, [k]: v }))

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'profile').single()
      .then(({ data, error }) => { if (error) setErr(error.message); else setP({ ...EMPTY, ...(data?.value as Partial<Profile>) }) })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setMsg(''); setErr('')
    const { error } = await supabase.from('settings').upsert({ key: 'profile', value: p, updated_at: new Date().toISOString() })
    if (error) setErr(error.message); else setMsg('Saved.')
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Our company</h1>
      <p className="text-sm text-steel-400">Used in the AI-generated email pitch signature. Shared by the whole team.</p>
      <form onSubmit={save} className="card p-6 grid md:grid-cols-2 gap-4">
        <Field label="Company name"><input className="input" value={p.company} onChange={e => set('company', e.target.value)} /></Field>
        <Field label="Website"><input className="input" value={p.website} onChange={e => set('website', e.target.value)} placeholder="www.eunio.in" /></Field>
        <Field label="Sender name"><input className="input" value={p.sender} onChange={e => set('sender', e.target.value)} placeholder="Your name" /></Field>
        <Field label="Sender title"><input className="input" value={p.title} onChange={e => set('title', e.target.value)} placeholder="Director – Sales" /></Field>
        <Field label="Phone / WhatsApp"><input className="input" value={p.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 …" /></Field>
        <Field label="Email"><input className="input" type="email" value={p.email} onChange={e => set('email', e.target.value)} /></Field>
        <div className="md:col-span-2"><Field label="Address"><input className="input" value={p.address} onChange={e => set('address', e.target.value)} /></Field></div>
        <div className="md:col-span-2"><Field label="About us (2–3 lines the AI can use)"><textarea className="input" rows={3} value={p.about} onChange={e => set('about', e.target.value)} placeholder="Direct supplier of SS304/316/316L pipes and coils. Ex-stock and made-to-order. Serving Maharashtra & Gujarat since …" /></Field></div>
        {err && <div className="md:col-span-2"><ErrorBox msg={err} /></div>}
        <div className="md:col-span-2 flex items-center justify-end gap-3">
          {msg && <span className="text-sm text-emerald-300">{msg}</span>}
          <button className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  )
}
