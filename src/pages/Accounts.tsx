import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Papa from 'papaparse'
import { db } from '../lib/db'
import { useData } from '../lib/useData'
import { isOverdue } from '../lib/metrics'
import type { Account, AccountStatus, NewAccount } from '../lib/types'
import { STATUS_LABEL } from '../lib/types'
import { Empty, ErrorBox, PriorityBadge, StatusBadge } from '../components/ui'
import AccountForm from '../components/AccountForm'
import Discover from '../components/Discover'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export default function Accounts() {
  const [params, setParams] = useSearchParams()
  const { data: accounts, error, loading, reload } = useData(db.accounts.list)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<AccountStatus | ''>('')
  const [csvMsg, setCsvMsg] = useState('')

  const openId = params.get('open')
  const showNew = params.get('new') === '1'
  const showDiscover = params.get('discover') === '1'
  const editing = openId ? accounts?.find(a => a.id === openId) ?? null : null

  const close = () => setParams({})

  const rows = useMemo(() => {
    if (!accounts) return []
    const needle = q.toLowerCase()
    return accounts
      .filter(a => !status || a.status === status)
      .filter(a => !needle || [a.company, a.industry, a.location, a.next_action].some(v => v?.toLowerCase().includes(needle)))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  }, [accounts, q, status])

  async function importCsv(file: File) {
    setCsvMsg('Importing…')
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: async ({ data }) => {
        const rows: Partial<NewAccount>[] = data
          .filter(r => r.company?.trim())
          .map(r => ({
            company: r.company.trim(), industry: r.industry || null, location: r.location || null,
            website: r.website || null, notes: r.notes || null, source: 'csv', verified: false,
            next_action: 'Verify company + find purchase contact', next_action_date: new Date().toISOString().slice(0, 10),
            potential_products: (r.potential_products || '').split(/[;|]/).map(s => s.trim()).filter(Boolean),
            priority: (['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium') as NewAccount['priority'],
          }))
        if (!rows.length) return setCsvMsg('No rows with a "company" column found.')
        try { await db.accounts.insert(rows); setCsvMsg(`Imported ${rows.length} accounts.`); reload() }
        catch (e) { setCsvMsg((e as Error).message) }
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold mr-auto">Target Accounts</h1>
        <label className="btn-ghost">
          Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && importCsv(e.target.files[0])} />
        </label>
        <button className="btn-ghost" onClick={() => setParams({ discover: '1' })}>✦ Find with AI</button>
        <button className="btn-primary" onClick={() => setParams({ new: '1' })}>+ Add account</button>
      </div>
      {csvMsg && <p className="text-sm text-steel-400">{csvMsg} <span className="text-steel-600">CSV columns: company, industry, location, website, potential_products (a;b), priority, notes</span></p>}

      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Search company, industry, city…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input max-w-[160px]" value={status} onChange={e => setStatus(e.target.value as AccountStatus | '')}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {error && <ErrorBox msg={error} />}
      {loading && <p className="text-steel-400">Loading…</p>}
      {!loading && rows.length === 0 && <Empty>No accounts yet. Add one, import a CSV, or use Find with AI.</Empty>}

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-steel-400 border-b border-steel-700">
              <tr>
                {['Company', 'Industry', 'Location', 'Products', 'Priority', 'Status', 'Last activity', 'Next action'].map(h => (
                  <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(a => <Row key={a.id} a={a} onOpen={() => setParams({ open: a.id })} />)}
            </tbody>
          </table>
        </div>
      )}

      {(showNew || editing) && <AccountForm account={editing} onClose={close} onSaved={() => { close(); reload() }} />}
      {showDiscover && <Discover onClose={close} onAdded={() => { close(); reload() }} />}
    </div>
  )
}

function Row({ a, onOpen }: { a: Account; onOpen: () => void }) {
  return (
    <tr className="border-b border-steel-800 hover:bg-steel-800/60 cursor-pointer" onClick={onOpen}>
      <td className="px-4 py-3">
        <div className="font-medium">{a.company}</div>
        {a.website && <a href={a.website.startsWith('http') ? a.website : `https://${a.website}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-steel-400 hover:text-brand">{a.website}</a>}
        {!a.verified && <span className="badge bg-amber-500/20 text-amber-300 ml-2">unverified</span>}
      </td>
      <td className="px-4 py-3 text-steel-200">{a.industry}</td>
      <td className="px-4 py-3 text-steel-200">{a.location}</td>
      <td className="px-4 py-3 text-steel-400 text-xs">{a.potential_products.join(', ')}</td>
      <td className="px-4 py-3"><PriorityBadge p={a.priority} /></td>
      <td className="px-4 py-3"><StatusBadge s={a.status} /></td>
      <td className="px-4 py-3 text-steel-400 whitespace-nowrap">{a.last_activity ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="text-steel-200">{a.next_action ?? <span className="text-red-400">none set</span>}</div>
        {a.next_action_date && <div className={`text-xs ${isOverdue(a.next_action_date) ? 'text-red-400' : 'text-steel-400'}`}>{a.next_action_date}</div>}
      </td>
    </tr>
  )
}
