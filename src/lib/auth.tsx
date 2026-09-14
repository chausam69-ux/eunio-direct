import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

const Ctx = createContext<Session | null>(null)
export const useSession = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!ready) return null
  if (!session) return <Login />
  return <Ctx.Provider value={session}>{children}</Ctx.Provider>
}

function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    if (error) setErr(error.message); else setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={send} className="card p-8 w-full max-w-sm space-y-4">
        <div>
          <div className="text-brand text-xs uppercase tracking-widest">Vividium Steel</div>
          <h1 className="text-xl font-semibold mt-1">Direct Sales Engine</h1>
        </div>
        {sent ? (
          <p className="text-steel-200 text-sm">Magic link sent to <b>{email}</b>. Open it on this device.</p>
        ) : (
          <>
            <input className="input" type="email" required placeholder="you@vividium.in" value={email} onChange={e => setEmail(e.target.value)} />
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <button className="btn-primary w-full justify-center">Send login link</button>
          </>
        )}
      </form>
    </div>
  )
}
