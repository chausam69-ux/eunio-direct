import { describe, it, expect } from 'vitest'
import { computeMetrics, inrLakh } from './metrics'
import type { Account, Opportunity } from './types'

const acc = (status: Account['status']): Account => ({
  id: crypto.randomUUID(), company: 'X', industry: null, location: null, website: null,
  potential_products: [], priority: 'medium', status, source: 'manual', verified: false,
  last_activity: null, next_action: null, next_action_date: null, notes: null,
  created_at: '', updated_at: '',
})
const opp = (stage: Opportunity['stage'], value_inr: number): Opportunity => ({
  id: crypto.randomUUID(), account_id: 'a', stage, products: [], value_inr,
  quote_ref: null, expected_close: null, next_action: null, next_action_date: null,
  lost_reason: null, notes: null, created_at: '', updated_at: '',
})

describe('computeMetrics', () => {
  it('counts funnel and money correctly', () => {
    const m = computeMetrics(
      [acc('target'), acc('contacted'), acc('qualified'), acc('dead')],
      [opp('rfq', 100000), opp('quotation', 200000), opp('won', 500000), opp('lost', 999)],
    )
    expect(m.targetAccounts).toBe(3)
    expect(m.contacted).toBe(2)
    expect(m.qualified).toBe(1)
    expect(m.openRfqs).toBe(1)
    expect(m.quotations).toBe(1)
    expect(m.won).toBe(1)
    expect(m.pipelineValue).toBe(300000)
    expect(m.wonRevenue).toBe(500000)
  })
})

describe('inrLakh', () => {
  it('formats lakhs and crores', () => {
    expect(inrLakh(1250000)).toBe('₹12.5 L')
    expect(inrLakh(25000000)).toBe('₹2.50 Cr')
    expect(inrLakh(0)).toBe('₹0.00 L')
  })
})
