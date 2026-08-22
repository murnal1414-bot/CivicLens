import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase, GOV_EMAIL_WHITELIST } from '../services/supabase'

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const officerEmail = localStorage.getItem('officer_email')
      const officerUser = localStorage.getItem('officer_username')
      const activeRole = localStorage.getItem('active_role')

      let isAllowed = false

      if (activeRole === 'officer') {
        if (session?.user?.email) {
          const email = session.user.email.toLowerCase()
          if (GOV_EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(email)) {
            isAllowed = true
          }
        }

        if (officerEmail && GOV_EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(officerEmail.toLowerCase())) {
          isAllowed = true
        }

        // If mock login was used with a whitelisted email (or username that matches an email)
        if (officerUser) {
          // If it's a simple username, allow it as legacy mock, but if it has @ it must be in the whitelist
          if (officerUser.includes('@')) {
            if (GOV_EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(officerUser.toLowerCase())) {
              isAllowed = true
            }
          } else {
            // If it's just 'shivam' or any other username, allow it
            isAllowed = true
          }
        }
      }

      setAllowed(isAllowed)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const activeRole = localStorage.getItem('active_role')
      if (activeRole === 'officer' && session?.user?.email) {
        const email = session.user.email.toLowerCase()
        if (GOV_EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(email)) {
          setAllowed(true)
        } else {
          setAllowed(false)
        }
      } else if (activeRole !== 'officer') {
        setAllowed(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-on-surface-variant uppercase tracking-widest">Verifying Authority...</p>
      </div>
    )
  }

  return allowed ? <Outlet /> : <Navigate to="/login?role=officer" replace />
}
