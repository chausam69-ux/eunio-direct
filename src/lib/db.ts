import { supabase } from './supabase'
import type { Account, Activity, Contact, NewAccount, NewOpportunity, Opportunity, Product } from './types'

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export const db = {
  accounts: {
    list: async () => must<Account[]>(await supabase.from('accounts').select('*').order('updated_at', { ascending: false })),
    insert: async (rows: Partial<NewAccount>[]) => must<Account[]>(await supabase.from('accounts').insert(rows).select()),
    update: async (id: string, patch: Partial<NewAccount>) => must<Account>(await supabase.from('accounts').update(patch).eq('id', id).select().single()),
    remove: async (id: string) => { must(await supabase.from('accounts').delete().eq('id', id)) },
    removeMany: async (ids: string[]) => { must(await supabase.from('accounts').delete().in('id', ids)) },
  },
  contacts: {
    forAccount: async (accountId: string) => must<Contact[]>(await supabase.from('contacts').select('*').eq('account_id', accountId).order('is_primary', { ascending: false })),
    insert: async (row: Omit<Contact, 'id'>) => must<Contact>(await supabase.from('contacts').insert(row).select().single()),
    insertMany: async (rows: Omit<Contact, 'id'>[]) => { if (rows.length) must(await supabase.from('contacts').insert(rows)) },
    remove: async (id: string) => { must(await supabase.from('contacts').delete().eq('id', id)) },
  },
  opportunities: {
    list: async () => must<Opportunity[]>(await supabase.from('opportunities').select('*').order('updated_at', { ascending: false })),
    insert: async (row: Partial<NewOpportunity>) => must<Opportunity>(await supabase.from('opportunities').insert(row).select().single()),
    update: async (id: string, patch: Partial<NewOpportunity>) => must<Opportunity>(await supabase.from('opportunities').update(patch).eq('id', id).select().single()),
    remove: async (id: string) => { must(await supabase.from('opportunities').delete().eq('id', id)) },
  },
  products: {
    list: async () => must<Product[]>(await supabase.from('products').select('*').order('category').order('name')),
    update: async (id: string, patch: Partial<Product>) => must<Product>(await supabase.from('products').update(patch).eq('id', id).select().single()),
    insert: async (row: Omit<Product, 'id'>) => must<Product>(await supabase.from('products').insert(row).select().single()),
  },
  activities: {
    forAccount: async (accountId: string) => must<Activity[]>(await supabase.from('activities').select('*').eq('account_id', accountId).order('at', { ascending: false })),
    insert: async (row: Omit<Activity, 'id' | 'at'>) => must<Activity>(await supabase.from('activities').insert(row).select().single()),
  },
}
