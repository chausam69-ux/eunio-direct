import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/auth'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/products', label: 'Products' },
  { to: '/settings', label: 'Our company' },
]

export default function Shell() {
  const session = useSession()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-steel-700 bg-steel-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
          <NavLink to="/" className="font-semibold tracking-tight">
            <span className="text-brand">Eunio</span> Direct
          </NavLink>
          <nav className="flex gap-1 text-sm">
            {links.map(l => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) => `px-3 py-1.5 rounded-md ${isActive ? 'bg-steel-700 text-white' : 'text-steel-400 hover:text-steel-100'}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-steel-400">
            <span className="hidden sm:inline">{session?.user.email}</span>
            <button className="hover:text-steel-100 cursor-pointer" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
