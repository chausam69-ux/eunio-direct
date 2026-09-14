import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { useData } from '../lib/useData'
import { computeMetrics, inrLakh, isOverdue } from '../lib/metrics'
import { ErrorBox, StageBadge, StatusBadge } from '../components/ui'

export default function Dashboard() {
  const { data, error, loading } = useData(async () => {
    const [accounts, opps] = await Promise.all([db.accounts.list(), db.opportunities.list()])
    return { accounts, opps }
  })
  if (error) return <ErrorBox msg={error} />
  if (loading || !data) return <p className="text-steel-400">Loading…</p>

  const m = computeMetrics(data.accounts, data.opps)
  const byId = Object.fromEntries(data.accounts.map(a => [a.id, a]))
  const today = new Date().toISOString().slice(0, 10)
  const dueAccounts = data.accounts.filter(a => a.status !== 'dead' && a.next_action_date && a.next_action_date <= today)
  const dueOpps = data.opps.filter(o => !['won', 'lost'].includes(o.stage) && o.next_action_date && o.next_action_date <= today)

  const tiles: [string, string | number][] = [
    ['Target Accounts', m.targetAccounts], ['Contacted', m.contacted], ['Qualified Leads', m.qualified],
    ['Requirements', m.requirements], ['Open RFQs', m.openRfqs], ['Quotations', m.quotations],
    ['Negotiations', m.negotiations], ['Won', m.won],
    ['Pipeline Value', inrLakh(m.pipelineValue)], ['Won Revenue', inrLakh(m.wonRevenue)],
  ]

  return (
    <div className="space-y-8">
      <div>
        <div className="text-brand text-xs uppercase tracking-widest">Eunio Direct Sales</div>
        <h1 className="text-2xl font-semibold mt-1">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tiles.map(([label, v]) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-steel-400">{label}</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="font-medium mb-3">Accounts due today ({dueAccounts.length})</h2>
          {dueAccounts.length === 0 && <p className="text-sm text-steel-400">Nothing due. Add next actions on accounts.</p>}
          <ul className="space-y-2 text-sm">
            {dueAccounts.map(a => (
              <li key={a.id} className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/accounts?open=${a.id}`} className="font-medium hover:text-brand">{a.company}</Link>
                  <div className="text-steel-400">{a.next_action}</div>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge s={a.status} />
                  <div className={`text-xs mt-1 ${isOverdue(a.next_action_date) ? 'text-red-400' : 'text-steel-400'}`}>{a.next_action_date}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="font-medium mb-3">Deals due today ({dueOpps.length})</h2>
          {dueOpps.length === 0 && <p className="text-sm text-steel-400">No deal actions due.</p>}
          <ul className="space-y-2 text-sm">
            {dueOpps.map(o => (
              <li key={o.id} className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/pipeline?open=${o.id}`} className="font-medium hover:text-brand">{byId[o.account_id]?.company ?? '—'}</Link>
                  <div className="text-steel-400">{o.next_action}</div>
                </div>
                <div className="text-right shrink-0">
                  <StageBadge s={o.stage} />
                  <div className={`text-xs mt-1 ${isOverdue(o.next_action_date) ? 'text-red-400' : 'text-steel-400'}`}>{o.next_action_date}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
