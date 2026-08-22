import { useState, useEffect } from 'react'
import GovSidebar from '../components/GovSidebar'
import { civiclensApi } from '../services/api'
import type { Complaint } from '../services/api'
import { runAnalystAgent, runReasoningAgent } from '../services/ai'

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
  const [selectedId, setSelected] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [sortBy, setSortBy] = useState('Sort by Priority')
  const [aiLoading, setAiLoading] = useState(false)
  const [analystData, setAnalystData] = useState<{ impact: string; complexity: 'Low' | 'Medium' | 'High'; complexityReason: string; steps: string[] } | null>(null)
  const [reasoningData, setReasoningData] = useState<{ safetyHazards: string; suggestedSla: string; reasoning: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      const data = await civiclensApi.getComplaints()
      setComplaints(data)
      if (data.length > 0 && !selectedId) {
        setSelected(data[0].id)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setAnalystData(null)
      setReasoningData(null)
      return
    }
    
    const runAgents = async () => {
      const complaint = complaints.find(c => c.id === selectedId)
      if (!complaint) return
      
      setAiLoading(true)
      try {
        const [analystRes, reasoningRes] = await Promise.all([
          runAnalystAgent(complaint),
          runReasoningAgent(complaint)
        ])
        setAnalystData(analystRes)
        setReasoningData(reasoningRes)
      } catch (e) {
        console.error("AI Agents failed to run", e)
        setAnalystData(null)
        setReasoningData(null)
      } finally {
        setAiLoading(false)
      }
    }
    
    runAgents()
  }, [selectedId, complaints])

  const selected = complaints.find(c => c.id === selectedId)

  // Handle assigning/resolving complaints
  const handleAssign = async (id: string, name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase()
    const updated = await civiclensApi.updateComplaint(id, { 
      status: 'ASSIGNED', 
      assignee: name, 
      initials 
    })
    setComplaints(updated)
  }

  const handleResolve = async (id: string) => {
    const updated = await civiclensApi.updateComplaint(id, { 
      status: 'RESOLVED',
      slaRemaining: 'Resolved on time'
    })
    setComplaints(updated)
  }

  // Filter complaints list
  let filtered = complaints.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = selectedDept === 'All Departments' || c.category === selectedDept
    return matchesSearch && matchesDept
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
                <span className="block text-xs font-semibold text-primary">Shivam Gupta</span>
                <span className="block text-[10px] text-on-surface-variant">Officer-in-charge</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[16px]">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative pt-14 flex flex-col flex-1 min-h-0">
          <div className="flex flex-col flex-1 px-6 py-4 gap-4 min-h-0">

            {/* Sub-header section */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-primary tracking-tight">Active Reports</h2>
                <div className="px-2.5 py-0.5 rounded-full bg-surface-container-high border border-white/5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">{filtered.length} Open Issues</span>
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
                    <option>All Departments</option>
                    <option>Water Supply</option>
                    <option>Drainage &amp; Sewerage</option>
                    <option>Health &amp; Sanitation</option>
                    <option>Streetlights</option>
                    <option>Roads &amp; Public Works</option>
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
                                <span className={`font-semibold ${slaColor[c.priority]}`}>{c.slaRemaining}</span>
                                <span className="text-[10px] text-on-surface-variant mt-0.5">{c.slaTotal}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {c.assignee ? (
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
                  <span className="text-on-surface-variant">Showing 1–3 of 142 Active Reports</span>
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
                    <button onClick={() => setSelected(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>

                  {/* Sidebar Body */}
                  <div className="p-4 flex flex-col gap-5 flex-1 justify-between">
                    
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">AI Agents analyzing issue...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {/* Image analysis */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant font-medium">Photo Check</span>
                            <span className="text-primary font-semibold">98% Match</span>
                          </div>
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
                            <div
                              className="absolute inset-0 bg-cover bg-center bg-neutral-900"
                              style={{ backgroundImage: `url('${selected.photoUrl || 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=400&q=80'}')` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                            <div className="absolute bottom-2.5 left-2.5 right-2.5">
                              <span className="text-[9px] text-on-surface bg-surface-container/80 backdrop-blur px-1.5 py-0.5 rounded uppercase mb-1 block w-max">Category: {selected.category}</span>
                              <span className="text-xs font-semibold text-primary block leading-tight truncate">{selected.description || 'No description provided.'}</span>
                            </div>
                          </div>
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
                              {analystData.steps.map((step, idx) => (
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
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                      {selected.status === 'OPEN' && (
                        <button 
                          onClick={() => handleAssign(selected.id, 'R. Verma')}
                          className="w-full py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:opacity-95 transition-all"
                        >
                          Assign Crew (R. Verma)
                        </button>
                      )}
                      {selected.status === 'ASSIGNED' && (
                        <button 
                          onClick={() => handleResolve(selected.id)}
                          className="w-full py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-500 transition-all"
                        >
                          Mark as Resolved
                        </button>
                      )}
                      {selected.status === 'RESOLVED' && (
                        <div className="w-full py-2 bg-surface-container-high/40 text-center text-xs text-green-500 font-semibold rounded-lg border border-green-500/20">
                          Status: Resolved
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>
        </main>

      </div>
    </div>
  )
}
