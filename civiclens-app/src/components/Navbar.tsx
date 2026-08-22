import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

const links = [
  { to: '/', label: 'Home' },
  { to: '/file-complaint', label: 'File a Complaint' },
  { to: '/gov/overview', label: 'Officer Portal' },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <header className="fixed top-3 left-0 right-0 z-50 px-4 md:px-10">
      <div className="h-14 w-full max-w-[1200px] mx-auto liquid-glass rounded-full px-5 flex items-center justify-between border border-black/[0.06] dark:border-white/[0.12]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-gray-900 dark:text-primary text-[22px]">account_balance</span>
          <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-primary">CivicLens</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-xs transition-colors duration-250 ${
                pathname === to
                  ? 'text-gray-900 dark:text-primary font-semibold'
                  : 'text-gray-500 dark:text-on-surface-variant hover:text-gray-900 dark:hover:text-on-surface'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          
          <Link
            to="/login?role=citizen"
            className="hidden sm:flex items-center gap-1 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 text-gray-800 dark:text-primary px-3 py-1.5 rounded-full text-[11px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">person</span>
            Citizen
          </Link>
          
          <Link
            to="/login?role=officer"
            className="flex items-center gap-1 bg-gray-900 dark:bg-primary text-white dark:text-on-primary px-3 py-1.5 rounded-full text-[11px] font-medium hover:opacity-90 dark:hover:bg-primary-fixed transition-all"
          >
            <span className="material-symbols-outlined text-[13px]">shield</span>
            Officer
          </Link>
        </div>
      </div>
    </header>
  )
}
