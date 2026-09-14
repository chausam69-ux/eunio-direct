import type { ReactNode } from 'react'
import type { AccountStatus, Priority, Stage } from '../lib/types'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-30 bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} mt-10 p-6`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="text-steel-400 hover:text-white cursor-pointer text-xl leading-none" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>
}

const PRIORITY: Record<Priority, string> = { high: 'bg-red-500/20 text-red-300', medium: 'bg-amber-500/20 text-amber-300', low: 'bg-steel-700 text-steel-200' }
const STATUS: Record<AccountStatus, string> = { target: 'bg-steel-700 text-steel-200', contacted: 'bg-blue-500/20 text-blue-300', qualified: 'bg-emerald-500/20 text-emerald-300', dead: 'bg-steel-800 text-steel-400 line-through' }
const STAGE: Record<Stage, string> = { requirement: 'bg-steel-700 text-steel-200', rfq: 'bg-blue-500/20 text-blue-300', quotation: 'bg-violet-500/20 text-violet-300', negotiation: 'bg-amber-500/20 text-amber-300', won: 'bg-emerald-500/20 text-emerald-300', lost: 'bg-red-500/20 text-red-300', repeat: 'bg-emerald-500/30 text-emerald-200' }

export const PriorityBadge = ({ p }: { p: Priority }) => <span className={`badge ${PRIORITY[p]}`}>{p}</span>
export const StatusBadge = ({ s }: { s: AccountStatus }) => <span className={`badge ${STATUS[s]}`}>{s}</span>
export const StageBadge = ({ s }: { s: Stage }) => <span className={`badge ${STAGE[s]}`}>{s}</span>

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card p-10 text-center text-steel-400 text-sm">{children}</div>
}

export function ErrorBox({ msg }: { msg: string }) {
  return <div className="bg-red-500/10 border border-red-500/40 text-red-300 text-sm rounded-lg p-3">{msg}</div>
}
