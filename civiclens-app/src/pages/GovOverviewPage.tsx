import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GovSidebar from '../components/GovSidebar'
import { civiclensApi } from '../services/api'
import { supabase } from '../services/supabase'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function GovOverviewPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, slaComplianceRate: '100%' })
  const [departments, setDepartments] = useState<any[]>([])
  const [recentActions, setRecentActions] = useState<any[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [alertInfo, setAlertInfo] = useState<any>({
    title: 'All Systems Operating Normally',
    desc: 'No active municipal issues reported. Citizen satisfaction rating remains high at 100%.',
    type: 'check_circle',
    color: 'primary',
    isUrgent: false
  })

  const [officerName, setOfficerName] = useState('Municipal Officer')
  const [officerEmail, setOfficerEmail] = useState('')
  const [officerAvatar, setOfficerAvatar] = useState('')

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const [complaintsList, setComplaintsList] = useState<any[]>([])

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

      // Single query fetch for speed & consistency
      const complaints = await civiclensApi.getComplaints()
      setComplaintsList(complaints)
      const total = complaints.length
      const open = complaints.filter(c => c.status !== 'RESOLVED').length
      const resolved = complaints.filter(c => c.status === 'RESOLVED').length
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 100
      setStats({
        total,
        open,
        resolved,
        slaComplianceRate: rate + '%'
      })

      const rawDepts = civiclensApi.getDepartments()
      const computedDepts = rawDepts.map(d => {
        const activeCount = complaints.filter(c => c.category.toLowerCase() === d.name.toLowerCase() && c.status !== 'RESOLVED').length
        return {
          ...d,
          activeIssues: activeCount,
          workersCount: activeCount > 0 ? activeCount * 3 : 0
        }
      })
      // Sort by active issues descending so departments WITH issues appear first
      const sortedDepts = [...computedDepts].sort((a, b) => b.activeIssues - a.activeIssues)
      setDepartments(sortedDepts.slice(0, 5))

      // Generate dynamic activity feed
      const computedActivity = complaints.slice(0, 3).map(c => {
        if (c.status === 'RESOLVED') {
          return {
            icon: 'check_circle',
            color: 'primary',
            title: 'Complaint Resolved',
            time: c.date,
            desc: `Complaint #${c.id} for ${c.category} in ${c.location} was resolved.`
          }
        } else if (c.assignee) {
          return {
            icon: 'assignment_ind',
            color: 'secondary',
            title: 'Officer Assigned',
            time: c.date,
            desc: `Assigned ${c.assignee} to look into ${c.category} issue #${c.id}.`
          }
        } else {
          return {
            icon: 'campaign',
            color: 'secondary',
            title: 'New Complaint Filed',
            time: c.date,
            desc: `A new ${c.category} complaint #${c.id} was filed in ${c.location}.`
          }
        }
      })
      
      if (computedActivity.length === 0) {
        setRecentActions([
          {
            icon: 'info',
            color: 'primary',
            title: 'System Initialized',
            time: 'Just now',
            desc: 'CivicLens system is online. Awaiting citizen complaints.'
          }
        ])
      } else {
        setRecentActions(computedActivity)
      }

      // Generate dynamic alert
      const activeOverdue = complaints.find(c => (c.priority === 'CRITICAL' || c.priority === 'HIGH') && c.status !== 'RESOLVED')
      if (activeOverdue) {
        setAlertInfo({
          title: `Critical Issue in ${activeOverdue.location.split(',')[0] || activeOverdue.location}`,
          desc: `${activeOverdue.category} issue reported: "${activeOverdue.description}". Recommended response SLA limit is ${activeOverdue.slaTotal}. AI recommends immediate crew dispatch.`,
          type: 'warning',
          color: 'error',
          isUrgent: true
        })
      } else if (open > 0) {
        setAlertInfo({
          title: 'Open Issues Awaiting Assignment',
          desc: `There are currently ${open} unassigned issues in the queue. Please assign crews to maintain high SLA compliance.`,
          type: 'info',
          color: 'secondary',
          isUrgent: false
        })
      } else {
        setAlertInfo({
          title: 'All Systems Operating Normally',
          desc: 'No active municipal issues reported. Citizen satisfaction rating remains high at 100%.',
          type: 'check_circle',
          color: 'primary',
          isUrgent: false
        })
      }
    }
    load()
  }, [])

  // Initialize and populate Leaflet Map on complaintsList update
  useEffect(() => {
    if (!mapRef.current || complaintsList.length === 0) return

    if (!mapInstance.current) {
      if ((mapRef.current as any)._leaflet_id) {
        (mapRef.current as any)._leaflet_id = null;
        mapRef.current.innerHTML = '';
      }
      const map = L.map(mapRef.current, { zoomControl: false }).setView([22.7196, 75.8577], 12)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)
      mapInstance.current = map
    }

    // Clear existing markers/circles before drawing updated list
    mapInstance.current.eachLayer((layer: any) => {
      if (layer instanceof L.Circle || layer instanceof L.Marker) {
        mapInstance.current?.removeLayer(layer)
      }
    })

    const bounds = L.latLngBounds([])

    complaintsList.forEach(c => {
      // Color markers based on priority: Critical = Red, High = Orange, Medium = Blue
      let color = '#3b82f6' // Blue
      if (c.priority === 'CRITICAL') {
        color = '#ef4444' // Red
      } else if (c.priority === 'HIGH') {
        color = '#facc15' // Orange/Yellow
      }

      let latVal = c.latitude != null ? Number(c.latitude) : null
      let lngVal = c.longitude != null ? Number(c.longitude) : null

      // If coordinates are genuinely missing/NaN or are the exact default centre (stacking), spread via hash
      const missingCoords = latVal == null || lngVal == null || isNaN(latVal) || isNaN(lngVal)
      const isDefaultCentre = !missingCoords && Math.abs(latVal! - 22.7196) < 0.0001 && Math.abs(lngVal! - 75.8577) < 0.0001
      if (missingCoords || isDefaultCentre) {
        const hash = c.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
        latVal = 22.7196 + ((hash % 100) * 0.0004) - 0.02
        lngVal = 75.8577 + ((hash % 70) * 0.0004) - 0.015
      }

      const circle = L.circle([latVal!, lngVal!], {
        color: color,
        fillColor: color,
        fillOpacity: 0.8,
        radius: 120
      }).addTo(mapInstance.current!)

      bounds.extend([latVal!, lngVal!])

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; padding: 2px; color: #111;">
          <strong style="color: ${color}; font-size: 12px;">${c.priority} Priority</strong><br/>
          <strong>ID:</strong> ${c.id}<br/>
          <strong>Category:</strong> ${c.category}<br/>
          <strong>Location:</strong> ${c.location}<br/>
          <strong>Status:</strong> ${c.status}<br/>
          <p style="margin: 4px 0 0 0; color: #555;">${c.description}</p>
        </div>
      `)
    })
    
    // Fit map bounds to show all markers
    if (bounds.isValid() && mapInstance.current) {
      mapInstance.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
    }
    
    // Watch for dynamic size changes (hover expansions)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize()
      }
    })
    if (mapRef.current) {
      resizeObserver.observe(mapRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [complaintsList])

  const kpis = [
    { icon: 'forum',           label: 'Total Complaints',   value: stats.total.toString(), trend: '+12%', trendUp: true,  accent: 'primary',   bar: 70 },
    { icon: 'pending_actions', label: 'Still Open',         value: stats.open.toString(),  trend: '+4%',  trendUp: false, accent: 'secondary', bar: Math.round((stats.open / Math.max(1, stats.total)) * 100) },
    { icon: 'verified', label: 'Fixed On Time', value: stats.slaComplianceRate, trend: '+2.5%', trendUp: true, accent: 'green-400', bar: parseInt(stats.slaComplianceRate) || 100 },
  ]

  const maxIssues = Math.max(1, ...departments.map(d => d.activeIssues))
  const depts = departments.map(d => ({
    label: d.name.split(' ')[0] || d.name,
    pct: Math.round((d.activeIssues / maxIssues) * 100),
    color: d.activeIssues > 0 ? 'bg-primary' : 'bg-secondary',
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

        {/* Main content */}
        <main className="pt-20 px-6 pb-10 flex flex-col gap-5 w-full max-w-[1200px] mx-auto">
          
          {/* AI Alert Banner */}
          {!dismissed && (
          <div className={`w-full bg-${alertInfo.color}-container/10 backdrop-blur-md rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-${alertInfo.color}/15 relative overflow-hidden`}>
            <div className="flex items-start gap-3 relative z-10">
              <div className={`w-9 h-9 rounded-full bg-${alertInfo.color}-container/20 flex items-center justify-center shrink-0 border border-${alertInfo.color}/20`}>
                <span className={`material-symbols-outlined text-${alertInfo.color} text-[18px]`}>{alertInfo.type}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] text-${alertInfo.color} font-semibold uppercase tracking-widest`}>AI Officer Alert</span>
                  {alertInfo.isUrgent && (
                    <span className="px-2 py-0.5 rounded-full bg-error/10 text-error text-[9px] font-medium uppercase animate-pulse">Urgent</span>
                  )}
                </div>
                <h2 className="text-sm font-semibold text-on-surface">{alertInfo.title}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5 max-w-2xl leading-relaxed">
                  {alertInfo.desc}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10 shrink-0 self-end sm:self-center">
              <button
                onClick={() => setDismissed(true)}
                className={`px-4 py-1.5 rounded-lg border border-${alertInfo.color}/30 text-${alertInfo.color} text-xs font-semibold hover:bg-${alertInfo.color}/5 transition-colors`}
              >Dismiss</button>
              <button
                onClick={() => navigate('/gov/complaints')}
                className={`px-4 py-1.5 rounded-lg bg-${alertInfo.color} text-white text-xs font-semibold hover:opacity-90 transition-colors shadow`}
              >Take Action</button>
            </div>
          </div>
          )}

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
            <div className="lg:col-span-4 bg-surface-container-low/40 border border-white/5 rounded-2xl p-4 flex flex-col relative overflow-hidden group z-10 transition-[height] duration-500 ease-in-out h-[320px] hover:h-[500px]">
              <div className="absolute inset-0 z-0">
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} className="text-black" />
              </div>
              <div className="relative z-10 flex justify-between items-start pointer-events-none">
                <span className="px-2.5 py-1 bg-background/90 border border-white/10 rounded-full text-[9px] text-on-surface uppercase tracking-widest font-semibold flex items-center gap-1.5 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Live Map
                </span>
                
                <button 
                  onClick={() => {
                    const mapEl = mapRef.current?.parentElement?.parentElement
                    if (mapEl) {
                      if (document.fullscreenElement) {
                        document.exitFullscreen()
                      } else {
                        mapEl.requestFullscreen()
                      }
                    }
                  }}
                  className="z-[1000] p-2 bg-surface-container/90 backdrop-blur text-on-surface hover:text-primary rounded-xl border border-white/10 hover:border-primary/50 shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-auto cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  <span className="material-symbols-rounded text-[20px]">fullscreen</span>
                </button>
              </div>

              <div className="relative z-10 mt-auto bg-surface-container-lowest/95 backdrop-blur border border-white/10 p-3 rounded-xl shadow-lg pointer-events-none">
                <h4 className="text-xs font-semibold text-on-surface mb-2">Priority Legend</h4>
                <div className="space-y-1.5">
                  {[
                    { color: 'bg-error', name: 'Critical Issues' },
                    { color: 'bg-secondary', name: 'High Issues' },
                    { color: 'bg-primary', name: 'Medium Issues' },
                  ].map(a => (
                    <div key={a.name} className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${a.color}`} />
                      <span className="text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">{a.name}</span>
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
              {recentActions.map(({ icon, color, title, time, desc }) => (
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
