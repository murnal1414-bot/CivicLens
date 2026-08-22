import { Link, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { supabase } from '../services/supabase'

const navItems = [
  { path: '/gov/overview',   label: 'Overview',    icon: 'dashboard' },
  { path: '/gov/complaints', label: 'Complaints',  icon: 'list_alt' },
  { path: '/gov/departments',label: 'Departments', icon: 'corporate_fare' },
  { path: '/gov/analytics',  label: 'Analytics',   icon: 'monitoring' },
]

export default function GovSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('officer_email')
    localStorage.removeItem('officer_username')
    navigate('/')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white dark:bg-surface-container-lowest border-r border-black/[0.06] dark:border-white/[0.08] backdrop-blur-2xl z-50 flex flex-col py-4 transition-colors duration-200">
      {/* Logo + Toggle */}
      <div className="px-4 mb-8 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-gray-900 dark:bg-primary flex items-center justify-center rounded-lg shrink-0">
            <span className="material-symbols-outlined text-white dark:text-on-primary text-[18px]">account_balance</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-900 dark:text-primary tracking-tight leading-none truncate">CivicLens</span>
            <span className="text-[9px] text-gray-500 dark:text-on-surface-variant uppercase tracking-widest mt-1 font-semibold">Officer Panel</span>
          </div>
        </Link>
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ path, label, icon }) => (
          <Link
            key={path}
            to={path}
            className={`nav-link ${pathname === path ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </nav>

      {/* SLA Status / Performance widget */}
      <div className="px-4 mt-auto flex flex-col gap-3">
        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-surface-container-low border border-black/[0.04] dark:border-white/[0.06] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-gray-500 dark:text-on-surface-variant uppercase tracking-wider font-semibold">On-Time Fixes</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-primary">94%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-surface-container-highest h-1 rounded-full overflow-hidden">
            <div className="bg-gray-950 dark:bg-primary h-full w-[94%]" />
          </div>
          <span className="text-[9px] text-gray-400 dark:text-on-surface-variant/40 block mt-1.5">Target: 90% or higher</span>
        </div>
        
        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/5 text-error text-xs font-semibold hover:bg-red-500/10 hover:border-red-500/35 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
