import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GovSidebar from '../components/GovSidebar'
import { civiclensApi } from '../services/api'

const activity = [
  { icon: 'check_circle',    color: 'primary', title: 'Extended deadline', time: '10m ago', desc: 'Approved extra time for Complaint #4928-A due to bad weather in Zone 2.' },
  { icon: 'assignment_ind',  color: 'secondary', title: 'Team Dispatched', time: '45m ago', desc: 'Sent a repair crew to Sector 9 for urgent electrical work.' },
  { icon: 'comment',         color: 'surface-variant', title: 'Added a note', time: '2h ago', desc: 'Met with sanitation head to discuss the cleaning schedule for next month.' },
]

export default function GovOverviewPage() {
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, slaComplianceRate: '0%' })
  const departments = civiclensApi.getDepartments().slice(0, 5)

  useEffect(() => {
    const load = async () => {
      const data = await civiclensApi.getKpis()
      setStats(data)
    }
    load()
  }, [])

  const kpis = [
    { icon: 'forum',           label: 'Total Complaints',   value: stats.total.toString(), trend: '+12%', trendUp: true,  accent: 'primary',   bar: 70 },
    { icon: 'pending_actions', label: 'Still Open',         value: stats.open.toString(),  trend: '+4%',  trendUp: false, accent: 'secondary', bar: Math.round((stats.open / Math.max(1, stats.total)) * 100) },
    { icon: 'verified',        label: 'Fixed On Time',      value: stats.slaComplianceRate,  trend: '+2.5%',trendUp: true,  accent: 'primary',   bar: parseInt(stats.slaComplianceRate) || 92 },
  ]

  const maxIssues = Math.max(1, ...departments.map(d => d.activeIssues))
  const depts = departments.map(d => ({
    label: d.name.split(' ')[0] || d.name,
    pct: Math.round((d.activeIssues / maxIssues) * 100),
    color: d.activeIssues > 40 ? 'bg-primary' : 'bg-secondary',
    pts: d.activeIssues.toString()
  }))
  return (
    <div className="dark flex min-h-screen bg-background text-sm">
      <GovSidebar />

      {/* Main panel - offset by w-60 sidebar */}
      <div className="pl-60 flex-1 flex flex-col min-w-0">
        
        {/* Top header */}
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

        {/* Main content */}
        <main className="pt-20 px-6 pb-10 flex flex-col gap-5 w-full max-w-[1200px] mx-auto">
          
          {/* AI Alert Banner */}
          <div className="w-full bg-error-container/10 backdrop-blur-md rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-error/15 relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-9 h-9 rounded-full bg-error-container/20 flex items-center justify-center shrink-0 border border-error/20">
                <span className="material-symbols-outlined text-error text-[18px]">warning</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] text-error font-semibold uppercase tracking-widest">AI Officer Alert</span>
                  <span className="px-2 py-0.5 rounded-full bg-error/10 text-error text-[9px] font-medium uppercase">Urgent</span>
                </div>
                <h2 className="text-sm font-semibold text-on-surface">Overdue Issues in Zone 4</h2>
                <p className="text-xs text-on-surface-variant mt-0.5 max-w-2xl leading-relaxed">
                  Sanitation issues in Zone 4 are taking longer than the 48-hour limit. AI warns that local complaints might rise if this is not resolved in 6 hours.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10 shrink-0 self-end sm:self-center">
              <button className="px-4 py-1.5 rounded-lg border border-error/30 text-error text-xs font-semibold hover:bg-error/5 transition-colors">Dismiss</button>
              <button className="px-4 py-1.5 rounded-lg bg-error text-on-error text-xs font-semibold hover:bg-error/90 transition-colors shadow">Take Action</button>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpis.map(({ icon, label, value, trend, trendUp, accent, bar }) => (
              <div key={label} className="kpi-card group">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center border border-white/5">
                    <span className={`material-symbols-outlined text-${accent} text-[18px]`}>{icon}</span>
                  </div>
                  <span className={`flex items-center text-${trendUp ? 'primary' : 'error'} text-[10px] font-medium gap-0.5 bg-${trendUp ? 'primary' : 'error'}/10 px-1.5 py-0.5 rounded`}>
                    {trend}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs text-on-surface-variant mb-0.5">{label}</h3>
                  <p className="text-2xl font-semibold text-on-surface tracking-tight">{value}</p>
                </div>
                <div className="mt-3 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className={`h-full bg-${accent} rounded-full`} style={{ width: `${bar}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Charts + live state split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Department workload */}
            <div className="lg:col-span-8 bg-surface-container-low/40 backdrop-blur-2xl rounded-2xl p-5 border border-white/5 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-primary">Issues by Department</h3>
                  <p className="text-xs text-on-surface-variant">Active issues currently assigned</p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-colors border border-white/5">
                  <span className="material-symbols-outlined text-[14px]">filter_list</span>Filter
                </button>
              </div>
              
              <div className="flex items-end justify-between gap-3 h-48 pt-2">
                {depts.map(({ label, pct, color, pts }) => (
                  <div key={label} className="flex flex-col items-center gap-2 w-full group">
                    <div className="w-full h-36 bg-surface-container/50 relative rounded-lg border-b border-surface-variant overflow-hidden flex items-end">
                      <div className={`w-full ${color} rounded-t-sm opacity-80 group-hover:opacity-100 transition-all duration-300`} style={{ height: `${pct}%` }} />
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-on-surface font-medium block">{label}</span>
                      <span className="text-[10px] text-on-surface-variant">{pts}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live map card */}
            <div className="lg:col-span-4 bg-surface-container-low/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between min-h-[220px] relative overflow-hidden group">
              <div className="absolute inset-0 bg-cover bg-center opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500"
                style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDQ4wiH1bQhCBa1LKNInZd9FPoEiqWNBz840I5RaGsPNA3pdQE34tm7NVgSbCeNWAK0BcNvig25zIpny5KBqSIgtzVyCeT9ekDSsp1rP1szfafH5xL00xm-DCkKwsxMaWIt2XwrCf8oi4omAXbgabEavNH8kK8dgyZujwQrbyB2aow9XSdaz2buNOKy82xOxn0LXV9lQPlQEElmBEfn9MAuZ5gnAPB3WDyyLcHu8gXz_6zsqGKbiCxe')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent z-[1]" />
              
              <div className="relative z-10 flex justify-between items-start">
                <span className="px-2.5 py-1 bg-background/85 border border-white/10 rounded-full text-[9px] text-on-surface uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Live Map
                </span>
              </div>

              <div className="relative z-10 mt-auto bg-surface-container-lowest/90 backdrop-blur border border-white/5 p-3 rounded-xl">
                <h4 className="text-xs font-semibold text-on-surface mb-2">Active Areas</h4>
                <div className="space-y-1.5">
                  {[
                    { color: 'bg-error', name: 'Zone 4 (Sanitation)', count: '42 issues' },
                    { color: 'bg-secondary', name: 'Zone 1 (Water)', count: '18 issues' },
                  ].map(a => (
                    <div key={a.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${a.color}`} />
                        <span className="text-on-surface-variant text-[11px]">{a.name}</span>
                      </div>
                      <span className="text-on-surface font-medium text-[11px]">{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent actions activity */}
          <div className="bg-surface-container-low/40 backdrop-blur-2xl rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-on-surface">Recent Actions</h3>
              <Link to="/gov/complaints" className="text-xs text-primary hover:underline font-medium">View all reports</Link>
            </div>
            <div className="flex flex-col divide-y divide-white/5">
              {activity.map(({ icon, color, title, time, desc }) => (
                <div key={title} className="flex items-start gap-3.5 p-4 hover:bg-surface-container-high/20 transition-colors cursor-pointer">
                  <div className={`w-8 h-8 rounded-full bg-${color}/10 border border-${color}/20 flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined text-${color} text-[16px]`}>{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-on-surface truncate">{title}</p>
                      <span className="text-[10px] text-on-surface-variant shrink-0 ml-3">{time}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
