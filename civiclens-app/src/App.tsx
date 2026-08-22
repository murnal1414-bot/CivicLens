import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CitizenPage from './pages/CitizenPage'
import GovOverviewPage from './pages/GovOverviewPage'
import GovComplaintsPage from './pages/GovComplaintsPage'
import GovAnalyticsPage from './pages/GovAnalyticsPage'
import GovDepartmentsPage from './pages/GovDepartmentsPage'
import LoginPage from './pages/LoginPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/file-complaint" element={<CitizenPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/gov/overview" element={<GovOverviewPage />} />
        <Route path="/gov/complaints" element={<GovComplaintsPage />} />
        <Route path="/gov/analytics" element={<GovAnalyticsPage />} />
        <Route path="/gov/departments" element={<GovDepartmentsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
