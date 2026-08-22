import { useState, useEffect } from 'react'
import GovSidebar from '../components/GovSidebar'
import { civiclensApi } from '../services/api'
import type { Complaint, Worker } from '../services/api'
import { runAnalystAgent, runReasoningAgent, runVisionCheckAgent } from '../services/ai'
import { supabase } from '../services/supabase'
import UniqueLoading from '@/components/ui/morph-loading'

const priorityConfig = {
  CRITICAL: { label: 'CRITICAL', icon: 'warning', cls: 'badge-critical' },
  HIGH:     { label: 'HIGH',     icon: 'priority', cls: 'badge-high' },
  MEDIUM:   { label: 'MEDIUM',   icon: 'horizontal_rule', cls: 'badge-medium' },
}

const densityBar = {
  High: 'bg-error w-4/5',
  Med:  'bg-primary/60 w-3/5',
  Low:  'bg-on-surface-variant/40 w-2/5',
}

const slaColor = {
  CRITICAL: 'text-error',
  HIGH:     'text-secondary',
  MEDIUM:   'text-primary',
}

export default function GovComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [verifications, setVerifications] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'verification'>('active')
  
  // Rejection states
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [targetRejectionId, setTargetRejectionId] = useState('')

  const [loading, setLoading] = useState(true)
  const [selectedId, setSelected] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [deptsList, setDeptsList] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('Sort by Priority')
  const [aiLoading, setAiLoading] = useState(false)
  const [analystData, setAnalystData] = useState<{ impact: string; complexity: 'Low' | 'Medium' | 'High'; complexityReason: string; steps: string[] } | null>(null)
  const [reasoningData, setReasoningData] = useState<{ safetyHazards: string; suggestedSla: string; reasoning: string } | null>(null)
  const [visionData, setVisionData] = useState<{ isMatch: boolean; matchPercentage: number; explanation: string } | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedStaffName, setSelectedStaffName] = useState<string>('')
  const [manualDispatchTime, setManualDispatchTime] = useState('')
  const [manualSolutionTime, setManualSolutionTime] = useState('')
  const [manualPriority, setManualPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('MEDIUM')
  const [assignedSuccessDetails, setAssignedSuccessDetails] = useState<{
    id: string
    assignee: string
    priority: string
    dispatchTime: string
    estimatedSolutionDate: string
  } | null>(null)

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

      const data = await civiclensApi.getComplaints()
      setComplaints(data)
      const vers = await civiclensApi.getVerifications()
      setVerifications(vers)
      const workersData = civiclensApi.getWorkers()
      setWorkers(workersData)
      if (data.length > 0 && !selectedId) {
        setSelected(data[0].id)
      }
      const departmentsData = civiclensApi.getDepartments()
      setDeptsList(['All Departments', ...departmentsData.map(d => d.name)])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setAnalystData(null)
      setReasoningData(null)
      setVisionData(null)
      return
    }
    
    const runAgents = async () => {
      const complaint = complaints.find(c => c.id === selectedId)
      if (!complaint) return

      // AI Cache check to speed up time complexity (Instant navigation)
      const cacheKey = `civiclens_ai_cache_${selectedId}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setAnalystData(parsed.analyst)
          setReasoningData(parsed.reasoning)
          setVisionData(parsed.vision)
          setAiLoading(false)
          return
        } catch (e) {
          console.error("Failed to parse cached AI details", e)
        }
      }
      
      setAiLoading(true)
      try {
        const [analystRes, reasoningRes, visionRes] = await Promise.all([
          runAnalystAgent(complaint),
          runReasoningAgent(complaint),
          runVisionCheckAgent(complaint.photoUrl || '', complaint.description, complaint.category)
        ])
        setAnalystData(analystRes)
        setReasoningData(reasoningRes)
        setVisionData(visionRes)

        // Save results to Cache
        const cacheData = { analyst: analystRes, reasoning: reasoningRes, vision: visionRes }
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      } catch (e) {
        console.error("AI Agents failed to run", e)
        setAnalystData(null)
        setReasoningData(null)
        setVisionData(null)
      } finally {
        setAiLoading(false)
      }
    }
    
    runAgents()
  }, [selectedId, complaints])

  const selected = complaints.find(c => c.id === selectedId)

  useEffect(() => {
    setSelectedStaffName('')
    if (selected) {
      const now = new Date()
      const offset = now.getTimezoneOffset()
      const localNow = new Date(now.getTime() - offset * 60 * 1000)
      setManualDispatchTime(localNow.toISOString().slice(0, 16))

      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const localTomorrow = new Date(tomorrow.getTime() - offset * 60 * 1000)
      setManualSolutionTime(localTomorrow.toISOString().slice(0, 16))

      setManualPriority(selected.priority)
    }
  }, [selectedId, selected])

  // Handle assigning/resolving complaints with manual scheduling/priority overrides
  const handleAssign = async (id: string, name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
    
    const formatFriendly = (dtStr: string) => {
      if (!dtStr) return ''
      const dt = new Date(dtStr)
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      return dt.toLocaleDateString('en-US', options)
    }

    const updated = await civiclensApi.updateComplaint(id, { 
      status: 'ASSIGNED', 
      assignee: name, 
      initials,
      priority: manualPriority,
      dispatchTime: manualDispatchTime,
      estimatedSolutionDate: manualSolutionTime,
      slaRemaining: `Due: ${formatFriendly(manualSolutionTime)}`,
      slaTotal: `Dispatched: ${formatFriendly(manualDispatchTime)}`
    })
    setComplaints(updated)
    setWorkers(civiclensApi.getWorkers())
    setAssignedSuccessDetails({
      id,
      assignee: name,
      priority: manualPriority,
      dispatchTime: manualDispatchTime,
      estimatedSolutionDate: manualSolutionTime
    })
  }

  const handleAutoFillAi = () => {
    if (!selected) return

    const deptStaff = workers.filter(
      w => w.role === 'STAFF' && 
      w.department.toLowerCase() === selected.category.toLowerCase()
    )
    const displayStaff = deptStaff.length > 0 ? deptStaff : workers.filter(w => w.role === 'STAFF')

    const activeStaff = displayStaff.filter(s => s.status !== 'On Leave')
    const bestStaff = activeStaff.length > 0 
      ? activeStaff.reduce((prev, curr) => prev.tasksCount < curr.tasksCount ? prev : curr)
      : displayStaff[0]

    if (bestStaff) {
      setSelectedStaffName(bestStaff.name)
    }

    const now = new Date()
    const offset = now.getTimezoneOffset()
    const localNow = new Date(now.getTime() - offset * 60 * 1000)
    setManualDispatchTime(localNow.toISOString().slice(0, 16))

    let hoursToAdd = 24

    const slaText = reasoningData?.suggestedSla || ''
    const hoursMatch = slaText.match(/(\d+)\s*hour/i)
    const daysMatch = slaText.match(/(\d+)\s*day/i)

    if (hoursMatch) {
      hoursToAdd = parseInt(hoursMatch[1], 10)
    } else if (daysMatch) {
      hoursToAdd = parseInt(daysMatch[1], 10) * 24
    } else {
      const deptsListRaw = civiclensApi.getDepartments()
      const currentDept = deptsListRaw.find(d => d.name.toLowerCase() === selected.category.toLowerCase())
      if (currentDept?.avgFixTime) {
        const fixText = currentDept.avgFixTime
        const fixHoursMatch = fixText.match(/([\d.]+)\s*h/i)
        if (fixHoursMatch) {
          hoursToAdd = parseFloat(fixHoursMatch[1])
        }
      }
    }

    const solutionTime = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000)
    const localSolution = new Date(solutionTime.getTime() - offset * 60 * 1000)
    setManualSolutionTime(localSolution.toISOString().slice(0, 16))

    setManualPriority(selected.priority)
  }

  const handleResolve = async (id: string) => {
    const updated = await civiclensApi.updateComplaint(id, { 
      status: 'RESOLVED',
      slaRemaining: 'Resolved on time'
    })
    setComplaints(updated)
    setWorkers(civiclensApi.getWorkers())
  }

  const handleAcceptVerification = async (id: string) => {
    const updated = await civiclensApi.acceptComplaint(id, officerName)
    setComplaints(updated)
    const vers = await civiclensApi.getVerifications()
    setVerifications(vers)
    setSelected(null)
  }

  const handleRejectConfirm = async () => {
    if (!targetRejectionId) return
    const updated = await civiclensApi.rejectComplaint(targetRejectionId, officerName, rejectionReason)
    setComplaints(updated)
    const vers = await civiclensApi.getVerifications()
    setVerifications(vers)
    setShowRejectionModal(false)
    setRejectionReason('')
    setTargetRejectionId('')
    setSelected(null)
  }

  const handleRequestMoreInfo = async (id: string) => {
    const updated = await civiclensApi.requestMoreInfo(id, officerName)
    setComplaints(updated)
    const vers = await civiclensApi.getVerifications()
    setVerifications(vers)
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [targetDeleteId, setTargetDeleteId] = useState('')

  const handleDeleteConfirm = async () => {
    if (!targetDeleteId) return
    const updated = await civiclensApi.deleteComplaint(targetDeleteId)
    setComplaints(updated)
    const vers = await civiclensApi.getVerifications()
    setVerifications(vers)
    setShowDeleteModal(false)
    setTargetDeleteId('')
    setSelected(null)
  }

  // Filter complaints list
  let filtered = complaints.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = selectedDept === 'All Departments' || c.category === selectedDept
    
    const matchesTab = activeTab === 'verification' 
      ? (c.status === 'PENDING_VERIFICATION' || c.status === 'REJECTED')
      : (c.status !== 'PENDING_VERIFICATION' && c.status !== 'REJECTED')
      
    return matchesSearch && matchesDept && matchesTab
  })

  // Sort complaints
  if (sortBy === 'Sort by Priority') {
    const priorityWeight = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 }
    filtered.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
  } else if (sortBy === 'Sort by Date') {
    filtered.sort((a, b) => b.date.localeCompare(a.date))
  }

  return (
    <div className="dark flex min-h-screen bg-background text-sm">
      <GovSidebar />

      {loading ? (
        <div className="pl-60 flex-1 flex flex-col items-center justify-center gap-6 min-h-screen">
          <UniqueLoading variant="morph" size="lg" className="opacity-80" />
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest animate-pulse">Loading Complaints…</p>
        </div>
      ) : (
      <div className="pl-60 flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="fixed top-0 left-60 right-0 h-14 bg-background/80 backdrop-blur-3xl z-40 px-6 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-on-surface-variant flex-1 max-w-xs">
            <span className="material-symbols-outlined text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-xs text-white focus:outline-none w-full placeholder-on-surface-variant/50"
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

        {/* Main Content Area */}
        <main className="relative pt-14 flex flex-col flex-1 min-h-0">
          <div className="flex flex-col flex-1 px-6 py-4 gap-4 min-h-0">

            {/* Tabs selector */}
            <div className="flex border-b border-white/[0.06] -mb-1">
              <button
                onClick={() => { setActiveTab('active'); setSelected(null) }}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'active' 
                    ? 'border-primary text-primary bg-primary/[0.02]' 
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">list_alt</span>
                Active Reports
              </button>
              <button
                onClick={() => { setActiveTab('verification'); setSelected(null) }}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'verification' 
                    ? 'border-primary text-primary bg-primary/[0.02]' 
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                AI Verification Queue
                {complaints.filter(c => c.status === 'PENDING_VERIFICATION' || c.status === 'REJECTED').length > 0 && (
                  <span className="bg-error text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                    {complaints.filter(c => c.status === 'PENDING_VERIFICATION' || c.status === 'REJECTED').length}
                  </span>
                )}
              </button>
            </div>

            {/* Sub-header section */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-primary tracking-tight">
                  {activeTab === 'verification' ? 'Verification Queue' : 'Active Reports'}
                </h2>
                <div className="px-2.5 py-0.5 rounded-full bg-surface-container-high border border-white/5 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTab === 'verification' ? 'bg-amber-400' : 'bg-error'}`} />
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">{filtered.length} {activeTab === 'verification' ? 'Pending Review' : 'Open Issues'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Department filter */}
                <div className="relative text-xs">
                  <select 
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="appearance-none bg-surface-container-low border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-on-surface focus:outline-none focus:border-white/30 transition-colors cursor-pointer hover:bg-surface-container"
                  >
                    {deptsList.map(name => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">expand_more</span>
                </div>
                {/* Sort */}
                <div className="relative text-xs">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-surface-container-low border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-on-surface focus:outline-none focus:border-white/30 transition-colors cursor-pointer hover:bg-surface-container"
                  >
                    <option>Sort by Priority</option>
                    <option>Sort by Date</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">expand_more</span>
                </div>
              </div>
            </div>

            {/* Split layout: Table + AI Sidebar */}
            <div className="flex flex-1 gap-4 min-h-0">
              
              {/* Table Container */}
              <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-xl border border-white/5 overflow-hidden backdrop-blur-2xl shadow-xl min-h-0">
                <div className="overflow-auto flex-1 no-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-surface-container/95 backdrop-blur z-10">
                      <tr>
                        {['ID / Date', 'Category', 'Location / Density', 'AI Priority', 'Time Limit', 'Assigned To'].map((h, i) => (
                          <th key={h} className={`text-[10px] text-on-surface-variant uppercase tracking-widest px-4 py-3 font-semibold border-b border-white/[0.06] ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filtered.map((c) => {
                        const p = priorityConfig[c.priority]
                        const isSelected = selectedId === c.id
                        return (
                          <tr
                            key={c.id}
                            onClick={() => setSelected(c.id)}
                            className={`hover:bg-surface-container-high/40 transition-colors cursor-pointer ${isSelected ? 'bg-surface-container-low/30' : ''}`}
                          >
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-semibold text-primary">{c.id}</span>
                                <span className="text-[10px] text-on-surface-variant mt-0.5">{c.date}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-secondary-container flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-on-secondary-container text-[14px]">{c.categoryIcon}</span>
                                </div>
                                <span className="text-on-surface font-medium">{c.category}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col">
                                <span className="text-on-surface truncate max-w-[150px]">{c.location}</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="w-12 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                                    <span className={`block h-full ${densityBar[c.density]}`} />
                                  </span>
                                  <span className="text-[9px] text-on-surface-variant uppercase">{c.density} density</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className={`badge ${p.cls} gap-1`}>
                                <span className="material-symbols-outlined text-[12px]">{p.icon}</span>
                                {p.label}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col">
                                <span className={`font-semibold ${
                                  c.status === 'RESOLVED' ? 'text-green-400' :
                                  c.status === 'REJECTED' ? 'text-error' :
                                  c.status === 'PENDING_VERIFICATION' ? 'text-amber-400' :
                                  slaColor[c.priority]
                                }`}>{c.slaRemaining}</span>
                                <span className="text-[10px] text-on-surface-variant mt-0.5">{c.slaTotal}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {activeTab === 'verification' ? (
                                  <>
                                    {c.status === 'PENDING_VERIFICATION' ? (
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAcceptVerification(c.id)}
                                          className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-semibold transition-all flex items-center gap-1 shrink-0 shadow-md"
                                        >
                                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                          Accept
                                        </button>
                                        <button
                                          onClick={() => { setTargetRejectionId(c.id); setShowRejectionModal(true) }}
                                          className="px-2.5 py-1 bg-error/15 border border-error/30 text-error hover:bg-error/25 rounded text-[10px] font-semibold transition-all flex items-center gap-1 shrink-0"
                                        >
                                          <span className="material-symbols-outlined text-[12px]">cancel</span>
                                          Reject
                                        </button>
                                      </div>
                                    ) : c.status === 'REJECTED' ? (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleAcceptVerification(c.id)}
                                          className="px-2 py-1 bg-green-600/20 border border-green-500/20 text-green-400 hover:bg-green-600/30 rounded text-[10px] font-semibold transition-all flex items-center gap-1 shrink-0"
                                        >
                                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                          Override Accept
                                        </button>
                                        <div className="flex items-center gap-1 text-error text-[10px] font-semibold shrink-0">
                                          <span className="material-symbols-outlined text-[14px]">cancel</span>
                                          Rejected
                                        </div>
                                      </div>
                                    ) : null}
                                  </>
                                ) : c.assignee ? (
                                  <>
                                    <span className="text-on-surface-variant">{c.assignee}</span>
                                    <div className="w-6 h-6 rounded-full bg-surface-container border border-white/10 flex items-center justify-center shrink-0">
                                      <span className="text-[10px] text-primary">{c.initials}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-on-surface-variant text-[11px]">Unassigned</span>
                                    <div className="w-6 h-6 rounded-full border border-dashed border-white/20 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors shrink-0">
                                      <span className="material-symbols-outlined text-[13px]">person_add</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="px-4 py-3 border-t border-white/[0.06] bg-surface-container-lowest flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Showing 1–{filtered.length} of {filtered.length} Active Reports</span>
                  <div className="flex gap-1">
                    <button disabled className="w-7 h-7 rounded border border-white/10 flex items-center justify-center text-on-surface-variant disabled:opacity-40">
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <button className="w-7 h-7 rounded bg-surface-container-high border border-white/10 text-primary font-semibold">1</button>
                    <button className="w-7 h-7 rounded border border-white/10 text-on-surface-variant hover:bg-surface-container">2</button>
                    <button className="w-7 h-7 rounded border border-white/10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── AI Insights Sidebar ─── */}
              {selected && (
                <div className="w-80 bg-surface-container-low rounded-xl border border-white/[0.08] backdrop-blur shadow-2xl flex flex-col min-h-0 overflow-y-auto no-scrollbar">
                  {/* Sidebar Header */}
                  <div className="p-4 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-surface-container-low/90 backdrop-blur z-10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                      <h3 className="font-semibold text-primary">AI Analysis</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setTargetDeleteId(selected.id); setShowDeleteModal(true) }}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-500/20 text-error/60 hover:text-error transition-colors"
                        title="Remove complaint"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                      <button onClick={() => setSelected(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  </div>

                  {/* Sidebar Body */}
                  <div className="p-4 flex flex-col gap-5 flex-1 justify-between">
                    
                    {activeTab === 'verification' ? (
                      (() => {
                        const verification = verifications.find(v => v.complaintId === selected.id)
                        if (!verification) {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                              <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40 animate-pulse">hourglass_empty</span>
                              <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">No verification record found. Awaiting analysis...</p>
                            </div>
                          )
                        }
                        const riskCls = verification.riskLevel === 'HIGH' ? 'text-error bg-error/10 border-error/20' : verification.riskLevel === 'MEDIUM' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-green-400 bg-green-400/10 border-green-400/20'
                        return (
                          <div className="flex flex-col gap-4">
                            {/* Overall Risk Card */}
                            <div className={`p-3 rounded-xl border flex items-center justify-between ${riskCls}`}>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">security</span>
                                <span className="text-xs font-bold uppercase tracking-wider">Risk Level</span>
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider">{verification.riskLevel}</span>
                            </div>

                            {/* Captured Image - use actual complaint photoUrl */}
                            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 bg-neutral-900 flex items-center justify-center">
                              {selected.photoUrl ? (
                                <img
                                  src={selected.photoUrl}
                                  alt="Evidence Photo"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-on-surface-variant/40">
                                  <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                                  <span className="text-[9px] uppercase tracking-widest">No photo</span>
                                </div>
                              )}
                            </div>

                            {/* Verification status breakdown */}
                            <div className="flex flex-col gap-2.5 bg-surface-container-lowest p-3.5 rounded-xl border border-white/5 text-xs text-on-surface-variant">
                              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="font-semibold text-[10px] uppercase tracking-wider">Auditing Signals</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-surface-container font-semibold">{verification.verificationStatus}</span>
                              </div>
                              
                              <div className="flex justify-between items-start pt-1">
                                <span className="flex items-center gap-1.5 text-[11px] shrink-0">
                                  <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                                  Image Match
                                </span>
                                <span className={`font-semibold text-right leading-snug ${verification.imageMatch ? 'text-green-400' : 'text-error'}`}>
                                  {verification.imageMatch ? 'Matched' : 'Mismatched'} ({Math.round((verification.imageConfidence || 0.9) * 100)}%)
                                </span>
                              </div>
                              <div className="text-[10px] text-on-surface-variant/60 -mt-1 pl-5">
                                Detected: <strong className="text-on-surface capitalize">{verification.detectedCategory || 'unclear'}</strong>
                              </div>

                              <div className="flex justify-between items-start pt-2 border-t border-white/5">
                                <span className="flex items-center gap-1.5 text-[11px] shrink-0">
                                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                                  GPS Offset
                                </span>
                                <span className={`font-semibold text-right leading-snug ${verification.gpsVerified === 'PASSED' ? 'text-green-400' : 'text-amber-400'}`}>
                                  {verification.gpsVerified === 'PASSED' ? 'Passed' : 'Suspicious'} ({verification.gpsDistance ? `${verification.gpsDistance.toFixed(2)} km` : '0 km'})
                                </span>
                              </div>

                              <div className="flex justify-between items-start pt-2 border-t border-white/5">
                                <span className="flex items-center gap-1.5 text-[11px] shrink-0">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  Timestamp
                                </span>
                                <span className={`font-semibold ${verification.timestampVerified ? 'text-green-400' : 'text-amber-400'}`}>
                                  {verification.timestampVerified ? 'Verified' : 'Uncertain'}
                                </span>
                              </div>
                            </div>

                            {/* Verification audit justification */}
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Audit Conclusion</span>
                              <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 text-[11px] text-on-surface-variant leading-relaxed">
                                {verification.verificationReason || 'No justification provided.'}
                              </div>
                            </div>

                            {/* Citizens details */}
                            <div className="flex flex-col gap-1.5 bg-surface-container-lowest/50 p-3 rounded-lg border border-white/5 text-[11px] text-on-surface-variant">
                              <div className="flex justify-between">
                                <span>Reported Area</span>
                                <span className="font-semibold text-on-surface truncate max-w-[150px]">{selected.location}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Citizen Phone</span>
                                <span className="font-semibold text-on-surface">{selected.citizenPhone || 'Not provided'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Citizen Email</span>
                                <span className="font-semibold text-on-surface truncate max-w-[150px]">{selected.citizenEmail || 'Not provided'}</span>
                              </div>
                            </div>

                            {/* Queue Actions */}
                            <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                              <button 
                                onClick={() => handleAcceptVerification(selected.id)}
                                className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Verify & Accept
                              </button>
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  onClick={() => { setTargetRejectionId(selected.id); setShowRejectionModal(true) }}
                                  className="py-2 bg-error/15 border border-error/30 text-error hover:bg-error/25 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">close</span>
                                  Reject
                                </button>
                                <button 
                                  onClick={() => handleRequestMoreInfo(selected.id)}
                                  className="py-2 bg-surface-container-high border border-white/10 hover:bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">info</span>
                                  Request Info
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      // Original Active Tab Layout
                      aiLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                          <UniqueLoading variant="morph" size="md" className="opacity-70" />
                          <p className="text-[10px] uppercase tracking-wider text-on-surface-variant animate-pulse">AI Agents analyzing issue…</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {/* Image analysis */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-on-surface-variant font-medium">Photo Check</span>
                              <span className={`font-semibold ${visionData?.isMatch === false ? 'text-error' : 'text-primary'}`}>
                                {visionData ? `${visionData.matchPercentage}% Match` : 'Checking...'}
                              </span>
                            </div>

                            {visionData && !visionData.isMatch && (
                              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-error">flag</span>
                                <span className="text-error text-[10px] font-semibold uppercase tracking-wider">Image not similar to complaint filed</span>
                              </div>
                            )}

                            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 bg-neutral-900 flex items-center justify-center">
                              {selected.photoUrl ? (
                                <img
                                  src={selected.photoUrl}
                                  alt="Complaint Evidence"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-on-surface-variant/40">
                                  <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                                  <span className="text-[9px] uppercase tracking-widest">No photo</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                              <div className="absolute bottom-2.5 left-2.5 right-2.5">
                                <span className="text-[9px] text-on-surface bg-surface-container/80 backdrop-blur px-1.5 py-0.5 rounded uppercase mb-1 block w-max">Category: {selected.category}</span>
                                <span className="text-xs font-semibold text-primary block leading-tight truncate">{selected.description || 'No description provided.'}</span>
                              </div>
                            </div>
                            {visionData?.explanation && (
                              <p className="text-[10px] text-on-surface-variant italic mt-1 leading-normal">{visionData.explanation}</p>
                            )}
                          </div>

                          {/* Safety Warning from Reasoning Agent */}
                          {reasoningData && reasoningData.safetyHazards && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                              <span className="material-symbols-outlined text-[16px] text-error shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                              <div className="text-xs">
                                <h4 className="font-semibold text-error text-[11px] uppercase tracking-wider">Safety Hazard Detected</h4>
                                <p className="text-on-surface-variant mt-0.5 leading-relaxed">{reasoningData.safetyHazards}</p>
                              </div>
                            </div>
                          )}

                          {/* Complexity & SLA from Analyst & Reasoning Agents */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 flex flex-col justify-between h-16">
                              <span className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">AI SLA Limit</span>
                              <span className="text-xs font-semibold text-primary leading-none">
                                {reasoningData?.suggestedSla || selected.slaTotal.split(':')[1]?.trim() || selected.slaTotal}
                              </span>
                            </div>
                            <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 flex flex-col justify-between h-16">
                              <span className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">Complexity</span>
                              <span className={`text-xs font-semibold leading-none ${
                                analystData?.complexity === 'High' ? 'text-error' : analystData?.complexity === 'Medium' ? 'text-secondary' : 'text-green-400'
                              }`}>
                                {analystData?.complexity || 'Medium'}
                              </span>
                            </div>
                          </div>

                          {/* SLA Reasoning from Reasoning Agent */}
                          {reasoningData && reasoningData.reasoning && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">SLA Reasoning</span>
                              <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 text-[11px] text-on-surface-variant leading-relaxed">
                                {reasoningData.reasoning}
                              </div>
                            </div>
                          )}

                          {/* Ground Impact from Analyst Agent */}
                          {analystData && analystData.impact && (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Local Impact</span>
                              <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 text-[11px] text-on-surface-variant leading-relaxed">
                                {analystData.impact}
                              </div>
                            </div>
                          )}

                          {/* Ground Crew Steps from Analyst Agent */}
                          {analystData && analystData.steps && analystData.steps.length > 0 && (
                            <div className="flex flex-col gap-2.5">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">AI Dispatch Guidelines</span>
                              <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 flex flex-col gap-2">
                                {analystData.steps.slice(0, 3).map((step, idx) => (
                                  <div key={idx} className="flex gap-2 text-[11px] text-on-surface-variant leading-relaxed">
                                    <span className="text-primary font-bold">{idx + 1}.</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Standard Details */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Description Details</span>
                            <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 text-[11px] text-on-surface-variant leading-relaxed">
                              {selected.description}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                            {selected.status === 'OPEN' && (() => {
                              const deptStaff = workers.filter(
                                w => w.role === 'STAFF' && 
                                w.department.toLowerCase() === selected.category.toLowerCase()
                              )
                              const displayStaff = deptStaff.length > 0 
                                ? deptStaff 
                                : workers.filter(w => w.role === 'STAFF')

                              return (
                                 <div className="flex flex-col gap-3.5 bg-surface-container-lowest/50 p-3.5 rounded-lg border border-white/5 text-left">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Assign to Field Staff</span>
                                    <button
                                      type="button"
                                      onClick={handleAutoFillAi}
                                      className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-all shrink-0 uppercase tracking-wider"
                                    >
                                      <span className="material-symbols-outlined text-[11px] animate-pulse">psychology</span>
                                      Auto-fill with AI
                                    </button>
                                  </div>
                                  
                                  {/* Field Staff Selector */}
                                  <div className="flex flex-col gap-1 text-xs">
                                    <label className="text-[9px] text-on-surface-variant/70 uppercase font-semibold">Select Staff</label>
                                    <div className="relative text-xs">
                                      <select
                                        value={selectedStaffName}
                                        onChange={e => setSelectedStaffName(e.target.value)}
                                        className="w-full appearance-none bg-surface-container-low border border-white/10 rounded-lg pl-3 pr-8 py-2 text-on-surface focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
                                      >
                                        <option value="">-- Choose Field Staff --</option>
                                        {displayStaff.map(s => (
                                          <option key={s.id} value={s.name} disabled={s.status === 'On Leave'}>
                                            {s.name} ({s.tasksCount} task{s.tasksCount !== 1 ? 's' : ''} · {s.status})
                                          </option>
                                        ))}
                                      </select>
                                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">expand_more</span>
                                    </div>
                                  </div>

                                  {/* Priority Override */}
                                  <div className="flex flex-col gap-1 text-xs">
                                    <label className="text-[9px] text-on-surface-variant/70 uppercase font-semibold">Priority Override</label>
                                    <div className="relative text-xs">
                                      <select
                                        value={manualPriority}
                                        onChange={e => setManualPriority(e.target.value as any)}
                                        className="w-full appearance-none bg-surface-container-low border border-white/10 rounded-lg pl-3 pr-8 py-2 text-on-surface focus:outline-none focus:border-white/30 transition-colors cursor-pointer"
                                      >
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HIGH">HIGH</option>
                                        <option value="CRITICAL">CRITICAL</option>
                                      </select>
                                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">expand_more</span>
                                    </div>
                                  </div>

                                  {/* Dispatch Time (Manual) */}
                                  <div className="flex flex-col gap-1 text-xs">
                                    <label className="text-[9px] text-on-surface-variant/70 uppercase font-semibold">Dispatch Time (Manual)</label>
                                    <input
                                      type="datetime-local"
                                      value={manualDispatchTime}
                                      onChange={e => setManualDispatchTime(e.target.value)}
                                      className="w-full bg-surface-container-low border border-white/10 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-white/30 text-xs"
                                    />
                                  </div>

                                  {/* Estimated Solution Time (Due Date) */}
                                  <div className="flex flex-col gap-1 text-xs">
                                    <label className="text-[9px] text-on-surface-variant/70 uppercase font-semibold">Est. Solution Due Date</label>
                                    <input
                                      type="datetime-local"
                                      value={manualSolutionTime}
                                      onChange={e => setManualSolutionTime(e.target.value)}
                                      className="w-full bg-surface-container-low border border-white/10 rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-white/30 text-xs"
                                    />
                                  </div>

                                  <button
                                    onClick={() => handleAssign(selected.id, selectedStaffName)}
                                    disabled={!selectedStaffName}
                                    className="w-full py-2.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 mt-2 shadow-lg"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">assignment_turned_in</span>
                                    Assign Task
                                  </button>
                                </div>
                              )
                            })()}
                            {selected.status === 'OPEN' && (
                              <button 
                                onClick={() => { setTargetRejectionId(selected.id); setShowRejectionModal(true) }}
                                className="w-full py-2 bg-error/15 border border-error/30 text-error hover:bg-error/25 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 font-semibold mt-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">cancel</span>
                                Reject Report
                              </button>
                            )}
                            {selected.status === 'ASSIGNED' && (
                              <div className="flex flex-col gap-2">
                                <button 
                                  onClick={() => handleResolve(selected.id)}
                                  className="w-full py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-500 transition-all"
                                >
                                  Mark as Resolved
                                </button>
                                <button 
                                  onClick={() => { setTargetRejectionId(selected.id); setShowRejectionModal(true) }}
                                  className="w-full py-2 bg-error/15 border border-error/30 text-error hover:bg-error/25 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 font-semibold"
                                >
                                  <span className="material-symbols-outlined text-[15px]">cancel</span>
                                  Reject Report
                                </button>
                              </div>
                            )}
                            {selected.status === 'RESOLVED' && (
                              <div className="w-full py-2 bg-surface-container-high/40 text-center text-xs text-green-500 font-semibold rounded-lg border border-green-500/20">
                                Status: Resolved
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}

                  </div>
                </div>
              )}

            </div>

          </div>
        </main>
      </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-sm">
          <div className="bg-surface-container border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-2xl animate-scale-up text-left">
            <h3 className="text-sm font-semibold text-on-surface mb-2 flex items-center gap-1.5 text-error">
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              Reject Complaint
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">Please specify why this report is rejected. E.g., The attached image does not match the chosen complaint category.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a constructive reason..."
              className="w-full bg-surface-container-lowest border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-white/30 h-24 resize-none mb-4"
            />
            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button 
                onClick={() => { setShowRejectionModal(false); setRejectionReason(''); setTargetRejectionId('') }}
                className="px-3.5 py-2 bg-surface-container border border-white/10 text-on-surface rounded-lg hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-error text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Complaint Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-sm">
          <div className="bg-surface-container border border-white/10 rounded-xl p-5 max-w-xs w-full shadow-2xl animate-scale-up text-left">
            <div className="w-12 h-12 rounded-full bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-error text-[24px]">delete_forever</span>
            </div>
            <h3 className="text-sm font-semibold text-on-surface mb-1 text-center">Remove Complaint?</h3>
            <p className="text-xs text-on-surface-variant mb-5 text-center">
              This will permanently remove complaint <code className="text-error font-bold bg-error/10 px-1 rounded">{targetDeleteId}</code> from the system. This action cannot be undone.
            </p>
            <div className="flex gap-2 text-xs font-semibold">
              <button 
                onClick={() => { setShowDeleteModal(false); setTargetDeleteId('') }}
                className="flex-1 py-2 bg-surface-container-high border border-white/10 text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 bg-error text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated Assignment Success Details Modal */}
      {assignedSuccessDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 text-sm animate-fade-in">
          <div className="bg-surface-container border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-up text-center flex flex-col gap-4">
            
            {/* Celebration Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(34,197,94,0.25)]">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-on-surface">Task Dispatched!</h3>
              <p className="text-xs text-on-surface-variant mt-1">Complaint details have been successfully broadcast to field staff.</p>
            </div>

            {/* Summary Details Card */}
            <div className="bg-surface-container-low border border-white/5 rounded-xl p-4 text-xs text-left flex flex-col gap-2.5">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-on-surface-variant">Ticket ID</span>
                <span className="font-mono text-primary font-bold">{assignedSuccessDetails.id}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-on-surface-variant">Assigned Crew</span>
                <span className="font-semibold text-on-surface">{assignedSuccessDetails.assignee}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-on-surface-variant">Priority Level</span>
                <span className={`font-semibold uppercase text-[10px] ${
                  assignedSuccessDetails.priority === 'CRITICAL' ? 'text-red-400' : assignedSuccessDetails.priority === 'HIGH' ? 'text-secondary' : 'text-primary'
                }`}>{assignedSuccessDetails.priority}</span>
              </div>
              {assignedSuccessDetails.dispatchTime && (
                <div className="flex justify-between border-b border-white/5 pb-1.5">
                  <span className="text-on-surface-variant">Dispatch Start</span>
                  <span className="text-on-surface font-semibold">{new Date(assignedSuccessDetails.dispatchTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              {assignedSuccessDetails.estimatedSolutionDate && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Est. Fix Target</span>
                  <span className="text-primary font-bold">{new Date(assignedSuccessDetails.estimatedSolutionDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setAssignedSuccessDetails(null)
                setSelected(null)
              }}
              className="w-full py-2.5 bg-primary text-on-primary font-semibold rounded-lg hover:opacity-90 transition-opacity text-xs mt-2"
            >
              Acknowledge & Close
            </button>

          </div>
        </div>
      )}
    </div>
  )
}
