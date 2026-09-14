import type { Account, Opportunity } from './types'

export interface Metrics {
  targetAccounts: number
  contacted: number
  qualified: number
  requirements: number
  openRfqs: number
  quotations: number
  negotiations: number
  won: number
  pipelineValue: number
  wonRevenue: number
}

// Dashboard numbers derived straight from the two funnel columns.
export function computeMetrics(accounts: Account[], opps: Opportunity[]): Metrics {
  const live = accounts.filter(a => a.status !== 'dead')
  const byStage = (s: Opportunity['stage']) => opps.filter(o => o.stage === s)
  const open = opps.filter(o => !['won', 'lost', 'repeat'].includes(o.stage))
  const closedWon = opps.filter(o => o.stage === 'won' || o.stage === 'repeat')
  return {
    targetAccounts: live.length,
    contacted: live.filter(a => a.status === 'contacted' || a.status === 'qualified').length,
    qualified: live.filter(a => a.status === 'qualified').length,
    requirements: byStage('requirement').length,
    openRfqs: byStage('rfq').length,
    quotations: byStage('quotation').length,
    negotiations: byStage('negotiation').length,
    won: closedWon.length,
    pipelineValue: open.reduce((s, o) => s + Number(o.value_inr || 0), 0),
    wonRevenue: closedWon.reduce((s, o) => s + Number(o.value_inr || 0), 0),
  }
}

// Rupees -> "₹12.5 L" / "₹2.50 Cr"
export function inrLakh(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  return `₹${(n / 1e5).toFixed(n >= 1e5 ? 1 : 2)} L`
}

export function isOverdue(date: string | null): boolean {
  return !!date && date < new Date().toISOString().slice(0, 10)
}
