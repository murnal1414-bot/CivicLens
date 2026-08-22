import { useState, useEffect } from 'react'
import GovSidebar from '../components/GovSidebar'
import { civiclensApi } from '../services/api'
import type { Department } from '../services/api'
import { supabase } from '../services/supabase'

export default function GovDepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const [officerName, setOfficerName] = useState('Municipal Officer')
  const [officerEmail, setOfficerEmail] = useState('')
  const [officerAvatar, setOfficerAvatar] = useState('')

  useEffect(() => {
    const load = async () => {
      // Fetch session user profile info
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setOfficerName(session.user.user_metadata?.full_name || session.user.email || 'Municipal Officer')
        setOfficerEmail(session.user.email || '')
        setOfficerAvatar(session.user.user_metadata?.avatar_url || '')
      } else {
        const localEmail = localStorage.getItem('officer_email')
        const localUsername = localStorage.getItem('officer_username')
        if (localEmail) {
          setOfficerName(localEmail.split('@')[0])
          setOfficerEmail(localEmail)
        } else if (localUsername) {
          setOfficerName(localUsername)
          setOfficerEmail(localUsername)
        }
      }

      const complaints = await civiclensApi.getComplaints()
      const rawDepts = civiclensApi.getDepartments()
      
      const computedDepts = rawDepts.map(d => {
        const activeCount = complaints.filter(c => c.category.toLowerCase() === d.name.toLowerCase() && c.status !== 'RESOLVED').length
        return {
          ...d,
          activeIssues: activeCount,
          workersCount: activeCount > 0 ? activeCount * 3 : 0,
          onTimeRate: activeCount > 0 ? d.onTimeRate : 100
        }
      })
      setDepts(computedDepts)
    }
    load()
  }, [])

  const toggleStatus = (id: string) => {
    const target = depts.find(d => d.id === id)
    if (target) {
      const nextStatus = target.status === 'Active' ? 'Under Review' : 'Active'
      const updated = civiclensApi.updateDepartment(id, { status: nextStatus })
      const mapped = updated.map(d => {
        const current = depts.find(c => c.id === d.id)
        return {
          ...d,
          activeIssues: current ? current.activeIssues : d.activeIssues,
          workersCount: current ? current.workersCount : 0,
          onTimeRate: current ? current.onTimeRate : 100
        }
      })
      setDepts(mapped)
    }
  }

  const filteredDepts = depts.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeIssuesSum = depts.reduce((sum, d) => sum + d.activeIssues, 0)
  const workersSum = depts.reduce((sum, d) => sum + d.workersCount, 0)
  const avgSla = depts.length > 0 ? Math.round(depts.reduce((sum, d) => sum + d.onTimeRate, 0) / depts.length) : 100

  return (
    <div className="dark flex min-h-screen bg-background text-sm">
      <GovSidebar />

      <div className="pl-60 flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="fixed top-0 left-60 right-0 h-14 bg-background/80 backdrop-blur-3xl z-40 px-6 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="Search departments..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs border-none outline-none focus:ring-0 text-on-surface w-48 placeholder:text-on-surface-variant/40"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px] hover:text-primary">notifications</span>
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right">
                <span className="block text-xs font-semibold text-primary">{officerName}</span>
                <span className="block text-[10px] text-on-surface-variant">{officerEmail || 'Officer-in-charge'}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden border border-white/10">
                {officerAvatar ? (
                  <img src={officerAvatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="material-symbols-outlined text-on-primary text-[16px]">person</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-20 px-6 pb-10 flex flex-col gap-5 w-full max-w-[1200px] mx-auto min-h-0">
          
          {/* Subheader */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">
                <span>Officer Panel</span>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                <span className="text-primary font-medium">Departments</span>
              </div>
              <h1 className="text-lg font-semibold text-primary tracking-tight">IMC Departments</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">Total: {depts.length} departments</span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="kpi-card">
              <h3 className="text-xs text-on-surface-variant mb-1">Total Active Issues</h3>
              <p className="text-2xl font-semibold text-primary">{activeIssuesSum}</p>
              <span className="text-[10px] text-on-surface-variant/60 block mt-2">Across all 13 departments</span>
            </div>
            <div className="kpi-card">
              <h3 className="text-xs text-on-surface-variant mb-1">Active Workers</h3>
              <p className="text-2xl font-semibold text-primary">{workersSum}</p>
              <span className="text-[10px] text-on-surface-variant/60 block mt-2">Currently deployed in field</span>
            </div>
            <div className="kpi-card">
              <h3 className="text-xs text-on-surface-variant mb-1">Overall On-Time Fixes</h3>
              <p className="text-2xl font-semibold text-primary">{avgSla}%</p>
              <span className="text-[10px] text-on-surface-variant/60 block mt-2">SLA compliance index</span>
            </div>
          </div>

          {/* Departments Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-white/5 overflow-hidden backdrop-blur-2xl shadow-xl">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-surface-container/95 backdrop-blur z-10">
                  <tr>
                    {['Dept ID', 'Department Name', 'Active Issues', 'Workers Deployed', 'Avg. Fix Time', 'On-Time Fixes', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} className={`text-[10px] text-on-surface-variant uppercase tracking-widest px-4 py-3 font-semibold border-b border-white/[0.06] ${i === 7 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredDepts.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-on-surface-variant">{d.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">{d.icon}</span>
                          <span className="font-semibold text-on-surface">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-on-surface">{d.activeIssues}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{d.workersCount}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{d.avgFixTime}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${d.onTimeRate >= 90 ? 'text-green-400' : d.onTimeRate >= 80 ? 'text-amber-400' : 'text-error'}`}>{d.onTimeRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${d.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => toggleStatus(d.id)}
                            className="px-2.5 py-1 rounded bg-surface-container-high border border-white/5 text-[10px] font-semibold text-primary hover:bg-surface-container-highest transition-colors"
                          >
                            Toggle Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
