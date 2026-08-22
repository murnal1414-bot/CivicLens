import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { supabase, GOV_EMAIL_WHITELIST } from '../services/supabase'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const initialTab = searchParams.get('role') === 'officer' ? 'officer' : 'citizen'
  const [tab, setTab] = useState<'citizen' | 'officer'>(initialTab)
  
  const [city, setCity] = useState('indore')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsOk, setGpsOk] = useState(false)
  
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  
  const [message, setMessage] = useState('')

  // Listen for Supabase auth state changes
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const email = session.user.email || ''
        
        // If checking for government portal access
        if (tab === 'officer') {
          if (GOV_EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
            navigate('/gov/overview')
          } else {
            setMessage(`Access Denied: ${email} is not authorized to view the government portal. Please contact the administrator.`)
            await supabase.auth.signOut()
          }
        } else {
          // Citizen flow: go to citizen dashboard
          navigate('/citizen/dashboard')
        }
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const email = session.user.email || ''
        if (tab === 'officer') {
          if (GOV_EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(email.toLowerCase())) {
            navigate('/gov/overview')
          } else {
            setMessage(`Access Denied: ${email} is not authorized to view the government portal. Please contact the administrator.`)
            await supabase.auth.signOut()
          }
        } else {
          navigate('/citizen/dashboard')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [tab, navigate])

  const handleGoogleLogin = async () => {
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login'
      }
    })
    if (error) {
      setMessage(`Auth Error: ${error.message}`)
    }
  }

  useEffect(() => {
    const role = searchParams.get('role')
    if (role === 'officer') {
      setTab('officer')
    } else {
      setTab('citizen')
    }
  }, [searchParams])

  const detectLocation = () => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      () => {
        setCity('indore')
        setGpsOk(true)
        setGpsLoading(false)
      },
      () => {
        setGpsLoading(false)
      }
    )
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (tab === 'citizen') {
      if (!phone.trim()) {
        setMessage('Please enter your mobile number.')
        return
      }
      setMessage('')
      // Mock login: Store phone in localStorage and redirect to citizen page
      localStorage.setItem('citizen_phone', phone.trim())
      navigate('/citizen/dashboard')
    } else {
      if (!username.trim() || !password.trim()) {
        setMessage('Please enter email and password.')
        return
      }
      if (!username.includes('@')) {
        setMessage('Please enter a valid officer email.')
        return
      }
      if (!GOV_EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(username.trim().toLowerCase())) {
        setMessage(`Access Denied: ${username} is not authorized for officer portals.`)
        return
      }
      setMessage('')
      // Mock login: Store officer email in localStorage and redirect to officer overview
      localStorage.setItem('officer_email', username.trim().toLowerCase())
      navigate('/gov/overview')
    }
  }

  return (
    <div className="dark:bg-background min-h-screen flex flex-col justify-between transition-colors duration-200">
      <Navbar />

      <main className="w-full flex items-center justify-center pt-24 pb-12 px-4">
        <div className="flex flex-col w-full relative items-center justify-center min-h-[70vh] overflow-hidden">
          
          {/* Subtle background blurs */}
          <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 w-full max-w-[400px]">
            <div className="login-card p-6 w-full flex flex-col items-center">
              
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-surface-container-high flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping opacity-20" />
                <span className="material-symbols-outlined text-[24px] text-gray-900 dark:text-primary">security</span>
              </div>
              
              <div className="text-center w-full mb-6">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-primary tracking-tight">Welcome back</h1>
                <p className="text-xs text-gray-500 dark:text-on-surface-variant/70 mt-1">Secure portal for Indore civic services</p>
              </div>

              {/* Tab Selector */}
              <div className="w-full flex bg-gray-100 dark:bg-surface-container/50 rounded-xl p-1 border border-black/[0.04] dark:border-white/5 mb-6 text-xs font-semibold">
                <button
                  onClick={() => setTab('citizen')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${tab === 'citizen' ? 'bg-white dark:bg-surface-container-high text-gray-900 dark:text-primary shadow-sm' : 'text-gray-500 dark:text-on-surface-variant/75 hover:text-gray-900 dark:hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  Citizen
                </button>
                <button
                  onClick={() => setTab('officer')}
                  className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${tab === 'officer' ? 'bg-white dark:bg-surface-container-high text-gray-900 dark:text-primary shadow-sm' : 'text-gray-500 dark:text-on-surface-variant/75 hover:text-gray-900 dark:hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  Officer
                </button>
              </div>

              <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                {message && (
                  <p className="text-xs text-error text-center bg-error-container/10 p-2 rounded-lg border border-error/20">{message}</p>
                )}

                {tab === 'citizen' ? (
                  /* ── Citizen View ── */
                  <>
                    <div className="w-full flex flex-col gap-2">
                      <div className="flex items-center justify-between px-1 text-[10px] text-gray-500 dark:text-on-surface-variant/70 uppercase tracking-widest font-semibold">
                        <span>Select City</span>
                        <button
                          type="button"
                          onClick={detectLocation}
                          className="flex items-center gap-1 text-gray-900 dark:text-primary hover:opacity-85 transition-opacity"
                        >
                          <span className={`material-symbols-outlined text-[13px] ${gpsLoading ? 'animate-spin' : ''}`}>
                            {gpsLoading ? 'refresh' : 'my_location'}
                          </span>
                          Detect location
                        </button>
                      </div>
                      <div className="relative w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-on-surface-variant/50 text-[18px]">location_city</span>
                        <select
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full bg-white dark:bg-surface-container-highest/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-on-surface text-xs rounded-xl py-3 pl-10 pr-8 focus:outline-none focus:border-gray-500 dark:focus:border-white/30 appearance-none cursor-pointer"
                        >
                          <option value="indore">Indore</option>
                          <option value="bhopal">Bhopal</option>
                          <option value="gwalior">Gwalior</option>
                          <option value="jabalpur">Jabalpur</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-on-surface-variant/50 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                      {gpsOk && (
                        <p className="text-[10px] text-green-500 px-1">Location verified automatically</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full bg-gray-200/60 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-800 dark:text-primary text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-black/[0.04] dark:border-white/5 transition-all font-semibold"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                      </svg>
                      Continue with Google
                    </button>

                    <div className="relative flex py-1 items-center w-full">
                      <div className="flex-grow border-t border-gray-300 dark:border-white/5" />
                      <span className="flex-shrink-0 mx-3 text-[9px] text-gray-400 dark:text-on-surface-variant/40 uppercase tracking-widest font-semibold">Or</span>
                      <div className="flex-grow border-t border-gray-300 dark:border-white/5" />
                    </div>

                    <div className="w-full flex flex-col gap-2">
                      <div className="relative w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-on-surface-variant/50 text-[18px]">call</span>
                        <input
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full bg-white dark:bg-surface-container-highest/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-on-surface text-xs rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gray-500 dark:focus:border-white/30 transition-all placeholder:text-gray-400 dark:placeholder:text-on-surface-variant/30"
                          placeholder="Enter mobile number"
                          type="tel"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-gray-900 dark:bg-primary text-white dark:text-on-primary text-xs font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-all border border-black/10 dark:border-white/5"
                      >
                        <span className="material-symbols-outlined text-[16px]">sms</span>
                        Send OTP
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── Officer View ── */
                  <>
                    <div className="w-full flex flex-col gap-3">
                      <div className="relative w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-on-surface-variant/50 text-[18px]">badge</span>
                        <input
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          className="w-full bg-white dark:bg-surface-container-highest/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-on-surface text-xs rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gray-500 dark:focus:border-white/30 transition-all placeholder:text-gray-400 dark:placeholder:text-on-surface-variant/30"
                          placeholder="Officer username"
                          type="text"
                        />
                      </div>
                      <div className="relative w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-on-surface-variant/50 text-[18px]">lock</span>
                        <input
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-white dark:bg-surface-container-highest/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-on-surface text-xs rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gray-500 dark:focus:border-white/30 transition-all placeholder:text-gray-400 dark:placeholder:text-on-surface-variant/30"
                          placeholder="Officer password"
                          type="password"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-gray-900 dark:bg-primary text-white dark:text-on-primary text-xs font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-all border border-black/10 dark:border-white/5"
                      >
                        <span className="material-symbols-outlined text-[16px]">login</span>
                        Sign In
                      </button>
                    </div>

                    <div className="relative flex py-1 items-center w-full">
                      <div className="flex-grow border-t border-gray-300 dark:border-white/5" />
                      <span className="flex-shrink-0 mx-3 text-[9px] text-gray-400 dark:text-on-surface-variant/40 uppercase tracking-widest font-semibold">Or</span>
                      <div className="flex-grow border-t border-gray-300 dark:border-white/5" />
                    </div>

                    {/* Google Login for Officers */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full bg-transparent border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-primary text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                      </svg>
                      Sign In with Google
                    </button>
                  </>
                )}
              </form>

              <p className="mt-6 text-center text-[10px] text-gray-400 dark:text-on-surface-variant/40 leading-relaxed max-w-[85%]">
                By signing in, you agree to IMC's <br /> <a className="text-gray-500 dark:text-on-surface-variant/60 hover:text-gray-850 dark:hover:text-primary hover:underline transition-colors" href="#">Terms</a> and <a className="text-gray-500 dark:text-on-surface-variant/60 hover:text-gray-850 dark:hover:text-primary hover:underline transition-colors" href="#">Privacy</a>.
              </p>
            </div>
          </div>
          
          {/* Security status footer */}
          <div className="mt-8 flex items-center justify-center gap-6 opacity-45 w-full max-w-[500px] flex-wrap text-[10px] font-semibold text-gray-500 dark:text-on-surface tracking-wider uppercase">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              SSL Secure
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">fingerprint</span>
              Biometric support
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">speed</span>
              Instant setup
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-50 dark:bg-surface-container-low py-8 border-t border-black/[0.04] dark:border-white/[0.06] text-center shrink-0">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 opacity-60">
            <span className="material-symbols-outlined text-[16px] text-gray-700 dark:text-on-surface">account_balance</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-on-surface">Indore Municipal Corporation</span>
          </div>
          <p className="text-[9px] text-gray-400 dark:text-on-surface-variant opacity-50 uppercase font-semibold">Official Citizen Portal</p>
        </div>
      </footer>
    </div>
  )
}
