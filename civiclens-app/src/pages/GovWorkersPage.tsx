import { useState, useEffect } from 'react'
import GovSidebar from '../components/GovSidebar'
import { civiclensApi } from '../services/api'
import type { Worker, Department } from '../services/api'
import { supabase } from '../services/supabase'
import UniqueLoading from '@/components/ui/morph-loading'

export default function GovWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

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

      // Sync counts with current active complaints
      const complaints = await civiclensApi.getComplaints()
      const rawWorkers = civiclensApi.getWorkers()
      const rawDepts = civiclensApi.getDepartments()

      // Dynamically calculate and sync task counts from active complaints
      const updatedWorkers = rawWorkers.map(w => {
        // Count active assigned complaints matching the worker's name
        const activeTasks = complaints.filter(
          c => c.status !== 'RESOLVED' && c.assignee.toLowerCase() === w.name.toLowerCase()
        ).length

        let status: 'Active' | 'On Leave' | 'Busy' = w.status
        if (status !== 'On Leave') {
          status = activeTasks > 2 ? 'Busy' : 'Active'
        }

        return {
          ...w,
          tasksCount: activeTasks,
          status
        }
      })

      // Save updated counts back to local storage
      localStorage.setItem('civiclens_workers', JSON.stringify(updatedWorkers))

      setWorkers(updatedWorkers)
      setDepts(rawDepts)
      setLoading(false)
    }
    load()
  }, [])

  // Metrics
  const totalOfficers = workers.filter(w => w.role === 'OFFICER').length
  const totalStaff = workers.filter(w => w.role === 'STAFF').length
  const activeStaff = workers.filter(w => w.role === 'STAFF' && w.status === 'Active').length
  const busyStaff = workers.filter(w => w.role === 'STAFF' && w.status === 'Busy').length
  const onLeaveStaff = workers.filter(w => w.role === 'STAFF' && w.status === 'On Leave').length
  const totalActiveTasks = workers.reduce((sum, w) => sum + w.tasksCount, 0)

  // Filter workers based on search term
  const filteredDepts = depts.filter(d => {
    const deptWorkers = workers.filter(w => w.department === d.name)
    const matchesDeptName = d.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWorkerName = deptWorkers.some(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesDeptName || matchesWorkerName
  })

  // Colors for statuses
  const statusColors = {
    Active: 'text-green-400 bg-green-500/10 border-green-500/20',
    Busy: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'On Leave': 'text-on-surface-variant bg-surface-container border-white/5',
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="dark flex min-h-screen bg-background text-sm">
      <GovSidebar />

      {loading ? (
        <div className="pl-60 flex-1 flex flex-col items-center justify-center gap-6 min-h-screen">
          <UniqueLoading variant="morph" size="lg" className="opacity-80" />
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest animate-pulse">Loading Workforce Portal…</p>
        </div>
      ) : (
        <div className="pl-60 flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="fixed top-0 left-60 right-0 h-14 bg-background/80 backdrop-blur-3xl z-40 px-6 flex items-center justify-between border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search staff, officers or department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs border-none outline-none focus:ring-0 text-on-surface w-60 placeholder:text-on-surface-variant/40"
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
                  <span className="text-primary font-medium">Workers</span>
                </div>
                <h1 className="text-lg font-semibold text-primary tracking-tight">Staff & Workforce Directory</h1>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant">Active: {activeStaff + busyStaff} / {totalStaff} field staff</span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="kpi-card">
                <h3 className="text-xs text-on-surface-variant mb-1">Total Departments</h3>
                <p className="text-2xl font-semibold text-primary">{depts.length}</p>
                <span className="text-[10px] text-on-surface-variant/60 block mt-2">{totalOfficers} Supervisors Active</span>
              </div>
              <div className="kpi-card">
                <h3 className="text-xs text-on-surface-variant mb-1">Total Field Staff</h3>
                <p className="text-2xl font-semibold text-primary">{totalStaff}</p>
                <div className="flex gap-2 text-[9px] text-on-surface-variant/60 mt-2 font-semibold">
                  <span className="text-green-400">{activeStaff} Active</span>
                  <span>·</span>
                  <span className="text-amber-400">{busyStaff} Busy</span>
                  <span>·</span>
                  <span>{onLeaveStaff} Leave</span>
                </div>
              </div>
              <div className="kpi-card">
                <h3 className="text-xs text-on-surface-variant mb-1">Active Dispatches</h3>
                <p className="text-2xl font-semibold text-primary">{totalActiveTasks}</p>
                <span className="text-[10px] text-on-surface-variant/60 block mt-2">Task-level assignments</span>
              </div>
              <div className="kpi-card">
                <h3 className="text-xs text-on-surface-variant mb-1">Avg Staff Load</h3>
                <p className="text-2xl font-semibold text-primary">
                  {totalStaff > 0 ? (totalActiveTasks / totalStaff).toFixed(1) : '0.0'}
                </p>
                <span className="text-[10px] text-on-surface-variant/60 block mt-2">Tasks per worker</span>
              </div>
            </div>

            {/* Departments & Worker Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
              {filteredDepts.map(d => {
                const deptWorkers = workers.filter(w => w.department === d.name)
                const officer = deptWorkers.find(w => w.role === 'OFFICER')
                const staff = deptWorkers.filter(w => w.role === 'STAFF')
                const isExpanded = selectedDept === d.id

                return (
                  <div
                    key={d.id}
                    className="glass-card p-5 flex flex-col gap-4 border border-white/[0.06] hover:border-white/10 transition-colors relative overflow-hidden group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/[0.08] text-primary flex items-center justify-center shrink-0 border border-primary/10">
                          <span className="material-symbols-outlined text-[20px]">{d.icon}</span>
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors leading-tight">
                            {d.name}
                          </h2>
                          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mt-0.5">
                            ID: {d.id} · Active issues: {d.activeIssues}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-container border border-white/5">
                        {d.status}
                      </span>
                    </div>

                    {/* Officer Detail Row */}
                    {officer && (
                      <div className="bg-surface-container-low border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-primary">{getInitials(officer.name)}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-on-surface">{officer.name}</span>
                              <span className="text-[9px] uppercase tracking-wider text-primary font-bold px-1.5 py-0.2 bg-primary/15 rounded">
                                Officer
                              </span>
                            </div>
                            <span className="text-[10px] text-on-surface-variant/80 block mt-0.5">
                              📞 {officer.phone}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-on-surface-variant block">Supervising</span>
                          <span className="text-xs font-bold text-on-surface block mt-0.5">{staff.length} staff</span>
                        </div>
                      </div>
                    )}

                    {/* Staff List */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                          Assigned Field Crew
                        </span>
                        <button
                          onClick={() => setSelectedDept(isExpanded ? null : d.id)}
                          className="text-[10px] text-primary font-semibold hover:underline"
                        >
                          {isExpanded ? 'Hide Details' : 'Show Contact Info'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {staff.map(s => {
                          const taskPercentage = Math.min(100, (s.tasksCount / 4) * 100)
                          let loadColor = 'bg-primary'
                          if (s.tasksCount >= 3) loadColor = 'bg-error'
                          else if (s.tasksCount >= 2) loadColor = 'bg-amber-400'

                          return (
                            <div
                              key={s.id}
                              className="p-3 bg-surface-container-lowest border border-white/5 rounded-xl flex flex-col gap-2 hover:bg-surface-container-lowest/80 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center shrink-0 text-[10px] font-semibold text-on-secondary-container">
                                    {getInitials(s.name)}
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-on-surface">{s.name}</span>
                                    {isExpanded && (
                                      <span className="text-[9px] text-on-surface-variant/60 block font-mono">
                                        {s.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${statusColors[s.status]}`}>
                                  {s.status}
                                </span>
                              </div>

                              {/* Task load indicator */}
                              <div className="flex items-center justify-between gap-3 text-[10px] text-on-surface-variant mt-0.5">
                                <div className="flex-1 bg-surface-container h-1.5 rounded-full overflow-hidden">
                                  <div className={`h-full ${loadColor} rounded-full transition-all duration-500`} style={{ width: `${taskPercentage}%` }} />
                                </div>
                                <span className="font-semibold text-on-surface shrink-0">
                                  {s.tasksCount} active task{s.tasksCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredDepts.length === 0 && (
                <div className="col-span-full py-16 text-center bg-surface-container-lowest rounded-xl border border-dashed border-white/10">
                  <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40 mb-2">badge_off</span>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">No workers or departments found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  )
}
