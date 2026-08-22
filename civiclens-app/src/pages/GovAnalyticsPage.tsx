import { useState, useEffect } from 'react'
import GovSidebar from '../components/GovSidebar'
import { civiclensApi } from '../services/api'

const depts = [
  { label: 'Solid Waste Mgmt', pct: 98, color: 'bg-primary',   count: '420 active', status: '98% on time', statusColor: 'text-[#4ade80]' },
  { label: 'Sewage & Water',   pct: 82, color: 'bg-secondary', count: '315 active', status: '82% on time', statusColor: 'text-[#facc15]' },
  { label: 'Public Health',    pct: 65, color: 'bg-error',     count: '189 active', status: '65% on time', statusColor: 'text-[#f87171]' },
]

const workers = [
  { name: 'Ramesh Patel', zone: 'Zone 3', count: '42 resolved', pct: '99% on time', initials: 'RP', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXFkgtwmlXs7DDCUWv_zrCApgosYhQ6Mv0CRk7Cg09dkn0m4jbA76hoDHjR66O7BwPGjm8U7ezY7IeMc89uVw33KG9I-eYss77U1FFB2SGFFfvCVvVXm4akIsiBE7pEkWfQVfJQfW2UL37db7ROuOMFzxg_N_Li9QoDA-I5CrExuURsF0JBFHNeGD9VJ5_e_0frd-e-MbJETTfw7QDHI-8QN__445MIVsBmJuhucHCBPW4modDUf6P' },
  { name: 'Sunita Sharma', zone: 'Zone 1', count: '38 resolved', pct: '97% on time', initials: 'SS', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD4dDmdrNySQW6LPZLnO6WMoNmT7loi-15gAlkQUn_0-qvWKs9S_EtKZusJ8PVgs1dL854Jprxule--dZrcX4ZvQgbuVJKLh3iNDYXsaXTJpxSgcxFwLZ775pXm6901WGixBdR7Z2Q6T05_ZUA5Wim6l69uQVUWDhZOVeG2TXqoVYiNdyzOc5y-I1OxCJ2b7KVTQQ7zGqxuNzYeISfMTiBTcsyITwaZSVog0lmZbdzhD2sDXGqhVaVe' },
  { name: 'Vijay Kumar', zone: 'Zone 5', count: '31 resolved', pct: '94% on time', initials: 'VK', img: '' },
]

export default function GovAnalyticsPage() {
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, slaComplianceRate: '0%' })
  const [departments, setDepartments] = useState<any[]>([])
  const totalWorkers = departments.reduce((sum, d) => sum + d.workersCount, 0)
  const activeIssues = stats.open

  const [deptFilter, setDeptFilter] = useState('Health & Sanitation')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month')

  useEffect(() => {
    const load = async () => {
      const data = await civiclensApi.getKpis()
      setStats(data)

      const complaints = await civiclensApi.getComplaints()
      const rawDepts = civiclensApi.getDepartments()
      
      const computedDepts = rawDepts.map(d => {
        const activeCount = complaints.filter(c => c.category.toLowerCase() === d.name.toLowerCase() && c.status !== 'RESOLVED').length
        return {
          ...d,
          activeIssues: activeCount
        }
      })
      setDepartments(computedDepts)
    }
    load()
  }, [])

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

        {/* Main Content */}
        <main className="pt-20 px-6 pb-10 flex flex-col gap-5 w-full max-w-[1200px] mx-auto min-h-0">
          
          {/* Subheader Title & Filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">
                <span>Overview</span>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                <span className="text-primary font-medium">Analytics</span>
              </div>
              <h1 className="text-lg font-semibold text-primary tracking-tight">Department Analytics</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Dropdown */}
              <div className="relative text-xs">
                <select 
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="appearance-none bg-surface-container-low border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-on-surface focus:outline-none focus:border-white/30 transition-colors cursor-pointer hover:bg-surface-container"
                >
                  <option>Health &amp; Sanitation</option>
                  <option>Water Supply</option>
                  <option>Drainage</option>
                  <option>Roads</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[16px]">expand_more</span>
              </div>
              
              {/* Tab Selector */}
              <div className="flex bg-surface-container/30 rounded-lg p-0.5 border border-white/5 text-xs">
                {(['week', 'month', 'quarter'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeRange(t)}
                    className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${timeRange === t ? 'bg-surface-container-high text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Key Metrics cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Workforce */}
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Active Workers</span>
                <span className="material-symbols-outlined text-primary/80 text-[18px]">group</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold text-primary leading-none">{totalWorkers}</span>
                <span className="text-[10px] text-green-400 font-medium bg-green-500/10 px-1.5 py-0.5 rounded flex items-center mb-1"><span className="material-symbols-outlined text-[12px]">arrow_upward</span> 12%</span>
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-on-surface-variant/60 border-t border-white/5 pt-2">
                <span>Field: {Math.round(totalWorkers * 0.78)}</span>
                <span>Office: {Math.round(totalWorkers * 0.22)}</span>
              </div>
            </div>

            {/* Average Dispatch Time */}
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Active Issues</span>
                <span className="material-symbols-outlined text-primary/80 text-[18px]">timer</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-semibold text-primary leading-none">{activeIssues}</span>
                <span className="text-xs text-on-surface-variant mb-0.5">issues</span>
              </div>
              <div className="mt-4 w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[60%]" />
              </div>
            </div>

            {/* Resource Utilization */}
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Resource Usage</span>
                <span className="material-symbols-outlined text-primary/80 text-[18px]">pie_chart</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-10 h-10 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle className="text-surface-container-highest" cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" />
                    <circle className="text-primary" cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeDasharray="92, 100" strokeLinecap="round" strokeWidth="3" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-primary">92%</div>
                </div>
                <div className="flex flex-col gap-0.5 text-[10px] text-on-surface-variant/75">
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Active Tasks</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-surface-container-highest" /> Idle</div>
                </div>
              </div>
            </div>

            {/* Budget Burn Rate */}
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Budget Used</span>
                <span className="material-symbols-outlined text-primary/80 text-[18px]">account_balance_wallet</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-semibold text-primary leading-none">68</span>
                <span className="text-xs text-on-surface-variant mb-0.5">%</span>
                <span className="text-[10px] text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center mb-1 ml-1"><span className="material-symbols-outlined text-[12px]">warning</span> High</span>
              </div>
              <div className="mt-3 text-[10px] text-on-surface-variant/60 border-t border-white/5 pt-2">
                Q3 Projected: 104% (Review needed)
              </div>
            </div>
          </div>

          {/* Main Grid split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left — Graphs & Sub-depts */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              
              {/* Workload trends chart */}
              <div className="bg-surface-container-low/40 backdrop-blur-2xl rounded-2xl p-5 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-primary">Workload Trends</h2>
                    <p className="text-xs text-on-surface-variant">Daily volume comparing incoming and fixed reports</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-on-surface-variant">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/40" /> Incoming</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /> Fixed</div>
                  </div>
                </div>
                
                <div className="h-44 w-full relative">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                    <line stroke="rgba(255,255,255,0.04)" strokeWidth="1" x1="0" x2="800" y1="50" y2="50" />
                    <line stroke="rgba(255,255,255,0.04)" strokeWidth="1" x1="0" x2="800" y1="100" y2="100" />
                    <line stroke="rgba(255,255,255,0.04)" strokeWidth="1" x1="0" x2="800" y1="150" y2="150" />
                    
                    <path d="M0,180 Q100,160 200,120 T400,140 T600,80 T800,100 L800,200 L0,200 Z" fill="rgba(255,255,255,0.03)" />
                    <path d="M0,180 Q100,160 200,120 T400,140 T600,80 T800,100" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                    <path d="M0,190 Q100,170 200,130 T400,110 T600,100 T800,70" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                  <div className="absolute bottom-0 left-0 w-full flex justify-between transform translate-y-4 text-[10px] text-on-surface-variant/65 px-2">
                    <span>Oct 1</span>
                    <span>Oct 8</span>
                    <span>Oct 15</span>
                    <span>Oct 22</span>
                    <span>Oct 29</span>
                  </div>
                </div>
              </div>

              {/* Team Efficiency lists */}
              <div className="bg-surface-container-low/40 backdrop-blur-2xl rounded-2xl p-5 border border-white/5">
                <h2 className="text-sm font-semibold text-primary mb-4">Team Efficiency</h2>
                <div className="flex flex-col gap-4">
                  {depts.map(d => (
                    <div key={d.label} className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-white/5">
                        <span className="material-symbols-outlined text-primary text-[16px]">
                          {d.label.includes('Waste') ? 'delete' : d.label.includes('Water') ? 'water_drop' : 'local_hospital'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="font-semibold text-on-surface">{d.label}</span>
                          <span className={`font-semibold ${d.statusColor}`}>{d.status}</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${d.color} rounded-full`} style={{ width: `${d.pct}%` }} />
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-xs text-on-surface-variant">{d.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right — AI staff suggestions & top list */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              
              {/* AI Allocation Insights */}
              <div className="bg-surface-container-low/50 border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-[80px]">auto_awesome</span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-primary mb-1">AI Staff Suggestions</h2>
                  <p className="text-xs text-on-surface-variant mb-4">Recommended resource reallocation based on traffic and upcoming civic events.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-surface-container-highest/40 rounded-xl border border-white/5 border-l-2 border-l-[#facc15] text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-on-surface">Zone 4 (Palasia)</span>
                      <span className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">+15% Demand</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">Festival expected this weekend. Reallocate 4 workers from Zone 2 for sanitation.</p>
                    <button className="mt-2.5 w-full py-1.5 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-fixed transition-colors text-[11px]">Reallocate Now</button>
                  </div>
                  
                  <div className="p-3 bg-surface-container-highest/40 rounded-xl border border-white/5 border-l-2 border-l-error text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-on-surface">Zone 1 (Rajwada)</span>
                      <span className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded text-error border border-error/10">Critical</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">Sewage stress expected within 48h based on rainfall forecasts.</p>
                    <button className="mt-2.5 w-full py-1.5 bg-transparent border border-white/10 text-primary font-semibold rounded-lg hover:bg-surface-container transition-colors text-[11px]">View Details</button>
                  </div>
                </div>
              </div>

              {/* Top Workers leaderboard */}
              <div className="bg-surface-container-low/40 border border-white/5 rounded-2xl p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-semibold text-primary">Top Workers</h2>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">more_horiz</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {workers.map(w => (
                    <div key={w.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-high/30 transition-colors cursor-pointer group">
                      <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center relative overflow-hidden border border-white/5 shrink-0">
                        {w.img ? (
                          <img className="w-full h-full object-cover mix-blend-luminosity opacity-85 group-hover:opacity-100 transition-opacity" src={w.img} alt="" />
                        ) : (
                          <span className="text-xs font-semibold text-primary">{w.initials}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-on-surface truncate">{w.name}</div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">{w.zone} • {w.count}</div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-semibold text-green-400 leading-none">{w.pct}</span>
                        <span className="text-[9px] text-on-surface-variant uppercase tracking-wider mt-0.5">On time</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-4 pt-3 text-xs text-on-surface-variant border-t border-white/5 hover:text-primary transition-colors text-center font-medium">
                  View All Personnel
                </button>
              </div>

            </div>

          </div>

        </main>
      </div>
    </div>
  )
}
