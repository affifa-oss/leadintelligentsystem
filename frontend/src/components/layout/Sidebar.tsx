import { LogOut, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { Avatar } from '../ui/Misc'
import { Logo } from './Logo'
import { NAV_GROUPS } from './navigation'

export function Sidebar({ open, onClose, onLogout }: { open: boolean; onClose: () => void; onLogout: () => void }) {
  const { user } = useAuth()
  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-30 bg-slate-900/30 transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/70 bg-white/95 backdrop-blur transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="mt-4">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{g.title}</p>
              <ul className="space-y-0.5">
                {g.items.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/30' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'}`
                      }
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-lg shadow-brand-700/25">
          <p className="font-display text-sm font-bold">How scoring works</p>
          <p className="mt-1 text-xs leading-relaxed text-brand-100">See the 7 factors behind every lead score.</p>
          <NavLink to="/lead-scoring" onClick={onClose} className="mt-3 inline-flex rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold ring-1 ring-white/25 hover:bg-white/25">
            Open guide →
          </NavLink>
        </div>

        {user && (
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
              <Avatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.role === 'admin' ? 'Admin · Sales Manager' : 'Sales Employee'}</p>
              </div>
              <button type="button" onClick={onLogout} aria-label="Log out" title="Log out" className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
