import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { Button } from "./ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "./ui/navigation-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { supabase, GOV_EMAIL_WHITELIST } from '../services/supabase'

export default function Navbar() {
  const { pathname } = useLocation()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sessionEmail, setSessionEmail] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const lastPathname = useRef(pathname)
  useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname
      const hasTranslation = document.cookie.includes('googtrans=') && !document.cookie.includes('googtrans=/en/en')
      if (hasTranslation) {
        window.location.reload()
      }
    }
  }, [pathname])

  useEffect(() => {
    // MutationObserver to permanently hide and remove Google Translate iframe banner and top padding
    const observer = new MutationObserver(() => {
      const frames = document.querySelectorAll('iframe.goog-te-banner-frame, .goog-te-banner-frame, iframe[class*="goog-te-banner"]')
      frames.forEach((f: any) => {
        f.style.display = 'none'
        f.style.visibility = 'hidden'
        f.style.height = '0px'
        f.style.opacity = '0'
      })
      if (document.body.style.top !== '0px') {
        document.body.style.top = '0px'
      }
    })
    
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const email = session?.user?.email || ''
      setSessionEmail(email)
      const phone = localStorage.getItem('citizen_phone')
      const officerEmail = localStorage.getItem('officer_email')
      const officerUsername = localStorage.getItem('officer_username')
      setIsLoggedIn(!!session || !!phone || !!officerEmail || !!officerUsername)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || ''
      setSessionEmail(email)
      const phone = localStorage.getItem('citizen_phone')
      const officerEmail = localStorage.getItem('officer_email')
      const officerUsername = localStorage.getItem('officer_username')
      setIsLoggedIn(!!session || !!phone || !!officerEmail || !!officerUsername)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Dynamically inject Google Translate script and init callback
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.type = 'text/javascript'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      document.body.appendChild(script)

      ;(window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,hi,mr,gu,ta,te,kn,ml,pa,ur,bn,or,as', // Major Indian Languages + English
          autoDisplay: false
        }, 'google_translate_element')
      }
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('citizen_phone')
    localStorage.removeItem('officer_email')
    localStorage.removeItem('officer_username')
    localStorage.removeItem('active_role')
    setIsLoggedIn(false)
    setSessionEmail('')
    window.location.href = '/'
  }

  const getNavLinks = () => {
    if (!isLoggedIn) {
      return [
        { href: "/", label: "Home" },
        { href: "/login?role=citizen", label: "File a Complaint" },
        { href: "/login?role=officer", label: "Officer Portal" },
      ]
    }
    
    // Check if officer is logged in via local storage or whitelisted session
    const hasOfficerStorage = !!localStorage.getItem('officer_email') || !!localStorage.getItem('officer_username')
    const isWhitelistedSession = sessionEmail && GOV_EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(sessionEmail.toLowerCase())
    
    const isOfficer = hasOfficerStorage || isWhitelistedSession
    
    if (isOfficer) {
      return [
        { href: "/gov/overview", label: "Officer Portal" },
      ]
    } else {
      // Citizen
      return [
        { href: "/citizen/dashboard", label: "Dashboard" },
        { href: "/file-complaint", label: "File a Complaint" },
      ]
    }
  }

  const links = getNavLinks()

  return (
    <header className="fixed top-3 left-0 right-0 z-50 px-4 md:px-10">
      <div className="h-14 w-full max-w-[1200px] mx-auto liquid-glass rounded-full px-5 flex items-center justify-between border border-black/[0.06] dark:border-white/[0.12] shadow-lg">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <div className="flex items-center md:hidden">
            {/* Mobile menu trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button className="group size-8 text-gray-900 dark:text-white" variant="ghost" size="icon">
                  <svg
                    className="pointer-events-none stroke-current"
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 12L20 12"
                      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
                    />
                    <path
                      d="M4 12H20"
                      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
                    />
                    <path
                      d="M4 12H20"
                      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
                    />
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-40 p-1 md:hidden mt-3 bg-black/90 dark:bg-black/95 border-white/10">
                <NavigationMenu className="max-w-none *:w-full">
                  <NavigationMenuList className="flex-col items-start gap-0">
                    {links.map((link, index) => (
                      <NavigationMenuItem key={index} className="w-full">
                        <NavigationMenuLink
                          href={link.href}
                          className={`w-full px-3 py-2 rounded-md transition-colors text-white hover:bg-white/10 ${pathname === link.href ? 'bg-white/10 font-medium' : ''}`}
                        >
                          {link.label}
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Logo & Main Nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-1.5 text-gray-900 dark:text-white hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
              <span className="text-sm font-semibold tracking-tight">CivicLens</span>
            </Link>
 
            {/* Navigation menu */}
            <NavigationMenu className="hidden md:block">
              <NavigationMenuList className="gap-1">
                {links.map((link, index) => (
                  <NavigationMenuItem key={index}>
                    <NavigationMenuLink
                      href={link.href}
                      className={`px-3 py-1.5 rounded-full font-medium transition-colors text-[11px] ${
                        pathname === link.href 
                          ? 'text-gray-900 dark:text-white bg-black/5 dark:bg-white/10' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
 
        {/* Right side */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div id="google_translate_element" className="flex items-center" />
          <ThemeToggle />
          
          {deferredPrompt && (
            <Button onClick={handleInstallClick} size="sm" className="hidden sm:inline-flex text-[11px] font-semibold bg-green-600 text-white hover:bg-green-700 rounded-full shadow-md">
              Install App
            </Button>
          )}

          {isLoggedIn ? (
            <Button onClick={handleSignOut} size="sm" className="text-[11px] font-semibold bg-gray-900 text-white hover:opacity-90 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full shadow-md">
              Sign Out
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-[11px] rounded-full text-gray-800 dark:text-white hover:bg-black/5 dark:hover:bg-white/10">
                <Link to="/login?role=citizen">Citizen Login</Link>
              </Button>
              <Button asChild size="sm" className="text-[11px] font-semibold bg-gray-900 text-white hover:opacity-90 dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full shadow-md">
                <Link to="/login?role=officer">Officer Login</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
