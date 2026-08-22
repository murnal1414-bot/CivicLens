import { useState } from 'react'
import GovSidebar from '../components/GovSidebar'

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM'
type Complaint = {
  id: string; date: string; category: string; categoryIcon: string
  location: string; density: 'High' | 'Med' | 'Low'; priority: Priority
  slaRemaining: string; slaTotal: string; assignee: string; initials: string
}

const complaints: Complaint[] = [
  { id: '#G-4092-W', date: 'Oct 24, 09:12 AM', category: 'Broken Water Pipe', categoryIcon: 'water_drop', location: 'Vijay Nagar, Sec 54', density: 'High', priority: 'CRITICAL', slaRemaining: '1h 14m left', slaTotal: 'Limit: 4 hours', assignee: 'A. Sharma', initials: 'AS' },
  { id: '#G-4091-R', date: 'Oct 24, 08:45 AM', category: 'Deep Pothole', categoryIcon: 'add_road', location: 'Palasia Square', density: 'Med', priority: 'HIGH', slaRemaining: '14h 20m left', slaTotal: 'Limit: 24 hours', assignee: 'R. Mehta', initials: 'RM' },
  { id: '#G-4088-S', date: 'Oct 23, 11:30 PM', category: 'Streetlight Out', categoryIcon: 'lightbulb', location: 'Bhawarkuan', density: 'Low', priority: 'MEDIUM', slaRemaining: '32h 10m left', slaTotal: 'Limit: 48 hours', assignee: '', initials: '' },
]

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
  const [selectedId, setSelected] = useState<string | null>('#G-4092-W')
  const selected = complaints.find(c => c.id === selectedId)

  return (
    <div className="dark flex min-h-screen bg-background text-sm">
      <GovSidebar />

      <div className="pl-60 flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="fixed top-0 left-60 right-0 h-14 bg-background/80 backdrop-blur-3xl z-40 px-6 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">search</span>
            <span className="text-xs">Search reports, officers, or places...</span>
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
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">14 Overdue Issues</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Department filter */}
                <div className="relative text-xs">
                  <select className="appearance-none bg-surface-container-low border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-on-surface focus:outline-none focus:border-white/30 transition-colors cursor-pointer hover:bg-surface-container">
                    <option>All Departments</option>
                    <option>Water &amp; Drainage</option>
                    <option>Roads &amp; Transport</option>
                    <option>Sanitation &amp; Waste</option>
                    <option>Streetlights</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">expand_more</span>
                </div>
                {/* Sort */}
                <div className="relative text-xs">
                  <select className="appearance-none bg-surface-container-low border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-on-surface focus:outline-none focus:border-white/30 transition-colors cursor-pointer hover:bg-surface-container">
                    <option>Sort by Priority</option>
                    <option>Sort by Time Left</option>
                    <option>Sort by Date</option>
                    <option>Sort by Density</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">expand_more</span>
                </div>
                <button className="bg-primary text-on-primary text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-primary/95 transition-all flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Report
                </button>
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
                      {complaints.map((c) => {
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
                    
                    <div className="flex flex-col gap-4">
                      {/* Image analysis */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-on-surface-variant font-medium">Photo Check</span>
                          <span className="text-primary font-semibold">98% Match</span>
                        </div>
                        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCEcXRkud4uZsDQVo8Xtgnbjs0S8j4AxRJb9DFT7sVywluabp_NlW7EjZEmM-7_EHkBJA0CaduQKNQ1VcfwvQMT9qKaLoh6hgZZNAfNu7DGf3mK6b3uJqAtTZr2H30cixOOZO6t-jNBT4uQ1xCz1_amVpOIX4lB8KCK7ddGQ1KMpFAW8OTbuNmQi7bq7dAoHShNE8i3Ib0IVzi4W_6re30rGFSRzYV-rh9yzsWJ89nZ9pE7dNFbNcWg')` }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                          <div className="absolute bottom-2.5 left-2.5">
                            <span className="text-[9px] text-on-surface bg-surface-container/80 backdrop-blur px-1.5 py-0.5 rounded uppercase mb-1 block w-max">Detected: Infrastructure issue</span>
                            <span className="text-xs font-semibold text-primary block leading-none">Severe Water Leak</span>
                          </div>
                        </div>
                      </div>

                      {/* Small KPI tiles */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 flex flex-col justify-between h-16">
                          <span className="text-[10px] text-on-surface-variant uppercase">AI Priority</span>
                          <span className="text-sm font-semibold text-error leading-none">Critical</span>
                        </div>
                        <div className="bg-surface-container-lowest p-3 rounded-lg border border-white/5 flex flex-col justify-between h-16">
                          <span className="text-[10px] text-on-surface-variant uppercase">Expected Fix</span>
                          <span className="text-sm font-semibold text-primary leading-none">3.5 hours</span>
                        </div>
                      </div>

                      {/* Similar reports */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-on-surface-variant font-medium">Similar Reports</span>
                          <span className="text-secondary font-medium">3 found</span>
                        </div>
                        <div className="bg-surface-container-lowest rounded-lg border border-white/5 divide-y divide-white/5">
                          {[{ id: '#G-4089-W', time: '12m ago', match: '92% match' }, { id: '#G-4085-W', time: '45m ago', match: '85% match' }].map(d => (
                            <div key={d.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-surface-container transition-colors">
                              <div className="flex flex-col">
                                <span className="font-semibold text-primary">{d.id}</span>
                                <span className="text-[10px] text-on-surface-variant">Reported {d.time}</span>
                              </div>
                              <span className="text-[10px] text-secondary font-medium">{d.match}</span>
                            </div>
                          ))}
                        </div>
                        <button className="w-full py-1.5 bg-surface-container border border-white/10 rounded-lg text-xs font-semibold text-primary hover:bg-surface-container-high transition-colors">
                          Group Together (3)
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                      <button className="w-full py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:opacity-95 transition-all">
                        Send Repair Crew
                      </button>
                      <button className="w-full py-2 bg-transparent border border-white/20 text-primary text-xs font-semibold rounded-lg hover:bg-surface-container transition-all">
                        Change Worker
                      </button>
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
