import { useState } from 'react'
import { db } from '../lib/db'
import { useData } from '../lib/useData'
import type { Product } from '../lib/types'
import { ErrorBox, Field, Modal } from '../components/ui'

const split = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)

export default function Products() {
  const { data, error, loading, reload } = useData(db.products.list)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  if (error) return <ErrorBox msg={error} />
  if (loading || !data) return <p className="text-steel-400">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold mr-auto">Products</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}>+ Add product</button>
      </div>
      <p className="text-sm text-steel-400">Eunio's catalogue. Sizes, thicknesses and finishes are blank until filled from the real spec sheet — nothing invented.</p>
      <div className="grid md:grid-cols-2 gap-3">
        {data.map(p => (
          <button key={p.id} onClick={() => setEditing(p)} className="card p-4 text-left hover:border-brand cursor-pointer">
            <div className="text-xs text-steel-400">{p.category}</div>
            <div className="font-medium mt-0.5">{p.name}</div>
            <dl className="grid grid-cols-[90px_1fr] gap-y-1 text-sm mt-3">
              {([['Grades', p.grades], ['Sizes', p.sizes], ['Thickness', p.thicknesses], ['Finishes', p.finishes]] as [string, string[]][]).map(([k, v]) => (
                <Row key={k} k={k} v={v.length ? v.join(', ') : ''} />
              ))}
              <Row k="Availability" v={p.availability ?? ''} />
            </dl>
            {p.notes && <p className="text-xs text-steel-400 mt-2">{p.notes}</p>}
          </button>
        ))}
      </div>
      {editing && <ProductForm product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </div>
  )
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <><dt className="text-steel-400">{k}</dt><dd className={v ? 'text-steel-100' : 'text-steel-600 italic'}>{v || 'to be confirmed'}</dd></>
)

function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: product?.name ?? '', category: product?.category ?? 'Pipes',
    grades: product?.grades.join(', ') ?? '', sizes: product?.sizes.join(', ') ?? '',
    thicknesses: product?.thicknesses.join(', ') ?? '', finishes: product?.finishes.join(', ') ?? '',
    availability: product?.availability ?? '', notes: product?.notes ?? '',
  })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return setErr('Name required')
    const row = { name: f.name, category: f.category, grades: split(f.grades), sizes: split(f.sizes), thicknesses: split(f.thicknesses), finishes: split(f.finishes), availability: f.availability || null, notes: f.notes || null }
    try { product ? await db.products.update(product.id, row) : await db.products.insert(row); onSaved() }
    catch (e) { setErr((e as Error).message) }
  }

  return (
    <Modal title={product ? product.name : 'New product'} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name"><input className="input" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Category"><input className="input" value={f.category} onChange={e => set('category', e.target.value)} /></Field>
        <Field label="Grades (comma separated)"><input className="input" value={f.grades} onChange={e => set('grades', e.target.value)} placeholder="SS304, SS316, SS316L" /></Field>
        <Field label="Sizes"><input className="input" value={f.sizes} onChange={e => set('sizes', e.target.value)} placeholder='e.g. 1/2", 3/4", 1" — from Eunio spec sheet' /></Field>
        <Field label="Thicknesses"><input className="input" value={f.thicknesses} onChange={e => set('thicknesses', e.target.value)} placeholder="e.g. 1.2mm, 1.5mm, 2mm" /></Field>
        <Field label="Finishes"><input className="input" value={f.finishes} onChange={e => set('finishes', e.target.value)} placeholder="e.g. Mirror, Matt, Hairline" /></Field>
        <Field label="Availability"><input className="input" value={f.availability} onChange={e => set('availability', e.target.value)} placeholder="Ex-stock / 2 weeks / made to order" /></Field>
        <Field label="Notes"><textarea className="input" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} /></Field>
        {err && <ErrorBox msg={err} />}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save</button></div>
      </form>
    </Modal>
  )
}
