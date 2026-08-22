import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lenis from 'lenis'
import LandingPage from './pages/LandingPage'
import CitizenPage from './pages/CitizenPage'
import GovOverviewPage from './pages/GovOverviewPage'
import GovComplaintsPage from './pages/GovComplaintsPage'
import GovAnalyticsPage from './pages/GovAnalyticsPage'
import GovDepartmentsPage from './pages/GovDepartmentsPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import CitizenDashboardPage from './pages/CitizenDashboardPage'
import './index.css'

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    })

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/file-complaint" element={<CitizenPage />} />
        <Route path="/citizen/dashboard" element={<CitizenDashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Officer Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/gov/overview" element={<GovOverviewPage />} />
          <Route path="/gov/complaints" element={<GovComplaintsPage />} />
          <Route path="/gov/analytics" element={<GovAnalyticsPage />} />
          <Route path="/gov/departments" element={<GovDepartmentsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
