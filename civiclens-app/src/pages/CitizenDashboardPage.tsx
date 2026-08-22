import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { civiclensApi } from '../services/api'
import type { Complaint, Worker, ComplaintVerification } from '../services/api'
import { supabase } from '../services/supabase'
import UniqueLoading from '@/components/ui/morph-loading'

export default function CitizenDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [citizenEmail, setCitizenEmail] = useState('')
  const [citizenPhone, setCitizenPhone] = useState('')
  const [workers, setWorkers] = useState<Worker[]>([])
  const [verifications, setVerifications] = useState<ComplaintVerification[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const phone = localStorage.getItem('citizen_phone') || ''
      const email = session?.user?.email || ''

      // If user is logged in as an officer, redirect them to the officer overview
      const activeRole = localStorage.getItem('active_role')
      if (activeRole === 'officer') {
        navigate('/gov/overview')
        return
      }

      if (!session && !phone) {
        navigate('/login?role=citizen')
        return
      }

      setCitizenEmail(email)
      setCitizenPhone(phone)

      // Fetch complaints from Supabase
      try {
        const allComplaints = await civiclensApi.getComplaints()
        const vers = await civiclensApi.getVerifications()
        const workersList = civiclensApi.getWorkers()
        
        setVerifications(vers)
        setWorkers(workersList)

        // Filter complaints reported by this citizen
        const filtered = allComplaints.filter(c => {
          const emailMatch = email && c.citizenEmail && c.citizenEmail.toLowerCase() === email.toLowerCase()
          const phoneMatch = phone && c.citizenPhone && c.citizenPhone === phone
          return emailMatch || phoneMatch
        })
        setComplaints(filtered)
      } catch (e) {
        console.error('Failed to load citizen data', e)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetch()
  }, [navigate])

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <UniqueLoading variant="morph" size="lg" className="opacity-80" />
        <p className="text-xs text-on-surface-variant uppercase tracking-widest animate-pulse">Loading Dashboard…</p>
      </div>
    )
  }

  const totalReported = complaints.length
  const fixedComplaints = complaints.filter(c => c.status === 'RESOLVED').length
  const pendingComplaints = totalReported - fixedComplaints

  return (
    <div className="dark min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16 px-4 md:px-10 max-w-[1200px] mx-auto flex flex-col gap-8">
        {/* Subtle background blurs */}
        <div className="fixed top-0 left-0 w-[40vw] h-[40vw] bg-primary/[0.025] rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[50vw] h-[50vw] bg-secondary/[0.02] rounded-full blur-[120px] pointer-events-none" />

        {/* ── Dashboard Header ── */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-2 border-primary pl-5">
          <div>
            <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">Citizen Workspace</span>
            <h1 className="text-3xl font-semibold text-primary tracking-tight mt-1">My Civic Dashboard</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Logged in as: <span className="text-on-surface font-semibold">{citizenEmail || citizenPhone}</span>
            </p>
          </div>
          <Link
            to="/file-complaint"
            className="btn-primary py-2.5 px-6 rounded-full flex items-center gap-2 text-xs font-semibold shadow-lg hover:opacity-90 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            File New Complaint
          </Link>
        </div>

        {/* ── KPI Grid ── */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Complaints */}
          <div className="kpi-card flex flex-col justify-between p-5 bg-surface-container-low border border-white/5 rounded-2xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Total Reported</span>
              <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
            </div>
            <p className="text-3xl font-bold text-on-surface tracking-tight mt-3">{totalReported}</p>
          </div>

          {/* Pending Complaints */}
          <div className="kpi-card flex flex-col justify-between p-5 bg-surface-container-low border border-white/5 rounded-2xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Pending Fix</span>
              <span className="material-symbols-outlined text-secondary text-[20px]">pending_actions</span>
            </div>
            <p className="text-3xl font-bold text-on-surface tracking-tight mt-3">{pendingComplaints}</p>
          </div>

          {/* Fixed Complaints */}
          <div className="kpi-card flex flex-col justify-between p-5 bg-surface-container-low border border-white/5 rounded-2xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Fixed &amp; Resolved</span>
              <span className="material-symbols-outlined text-green-400 text-[20px]">verified</span>
            </div>
            <p className="text-3xl font-bold text-green-400 tracking-tight mt-3">{fixedComplaints}</p>
          </div>
        </div>

        {/* ── Complaint List ── */}
        <div className="relative z-10 bg-surface-container-lowest rounded-2xl border border-white/5 p-6 backdrop-blur-2xl shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
            <h3 className="font-semibold text-primary text-base">My Registered Reports</h3>
            <span className="px-2 py-0.5 rounded bg-surface-container-high border border-white/5 text-[10px] text-on-surface-variant uppercase font-semibold">
              Live Feed
            </span>
          </div>

          {complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant/30">
                <span className="material-symbols-outlined text-[24px]">drafts</span>
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">No complaints reported yet</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">If you notice any municipal issues in your area, please file a complaint.</p>
              </div>
              <Link to="/file-complaint" className="btn-ghost py-2 px-4 rounded-lg mt-2 text-xs font-semibold">
                Report a Problem Now
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-on-surface-variant text-[10px] uppercase tracking-widest font-semibold">
                    <th className="py-3 px-4">Ticket ID / Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Workforce</th>
                    <th className="py-3 px-4">Estimated Resolution / ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-on-surface">
                  {complaints.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedId(c.id)}
                      className="hover:bg-surface-container-low/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">{c.id}</span>
                          <span className="text-[9px] text-on-surface-variant mt-0.5">{c.date}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[15px] text-primary">{c.categoryIcon}</span>
                          <span className="font-medium">{c.category}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant truncate max-w-[160px]">
                        {c.location}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          c.status === 'RESOLVED' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : c.status === 'ASSIGNED' 
                              ? 'bg-secondary/10 text-secondary border border-secondary/20' 
                              : c.status === 'PENDING_VERIFICATION'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                : c.status === 'REJECTED'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-primary/10 text-primary border border-primary/20'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            c.status === 'RESOLVED' 
                              ? 'bg-green-400' 
                              : c.status === 'ASSIGNED' 
                                ? 'bg-secondary' 
                                : c.status === 'PENDING_VERIFICATION'
                                  ? 'bg-yellow-400'
                                  : c.status === 'REJECTED'
                                    ? 'bg-red-400'
                                    : 'bg-primary animate-pulse'
                          }`} />
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-left">
                        {(() => {
                          if (c.status === 'ASSIGNED' || c.status === 'RESOLVED') {
                            const staff = workers.find(w => w.name.toLowerCase() === c.assignee.toLowerCase())
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-on-surface font-semibold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px] text-primary">person</span>
                                  {c.assignee}
                                </span>
                                {staff?.phone && (
                                  <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[11px] text-on-surface-variant/70">call</span>
                                    {staff.phone}
                                  </span>
                                )}
                              </div>
                            )
                          }
                          if (c.status === 'REJECTED') {
                            const ver = verifications.find(v => v.complaintId === c.id)
                            return (
                              <span className="text-error font-semibold text-[10px] flex items-center gap-1.5 line-clamp-1 max-w-[160px]" title={ver?.verificationReason || 'Evidence did not match'}>
                                <span className="material-symbols-outlined text-[13px]">cancel</span>
                                Reason: {ver?.verificationReason || 'Rejected'}
                              </span>
                            )
                          }
                          if (c.status === 'PENDING_VERIFICATION') {
                            return (
                              <span className="text-amber-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] animate-pulse">security</span>
                                Under AI Review
                              </span>
                            )
                          }
                          return (
                            <span className="text-on-surface-variant/60 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
                              Pending Dispatch
                            </span>
                          )
                        })()}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {c.status === 'RESOLVED' ? (
                          <span className="text-green-400 font-semibold">Resolved Successfully</span>
                        ) : c.status === 'REJECTED' ? (
                          <span className="text-error">Closed</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-primary font-semibold">{c.slaRemaining}</span>
                            <span className="text-[9px] text-on-surface-variant mt-0.5">{c.slaTotal}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Detailed Complaint Modal */}
      {selectedId && (() => {
        const c = complaints.find(item => item.id === selectedId)
        if (!c) return null
        const ver = verifications.find(v => v.complaintId === c.id)
        const staff = c.assignee ? workers.find(w => w.name.toLowerCase() === c.assignee.toLowerCase()) : null

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-sm">
            <div className="bg-surface-container border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl animate-scale-up text-left flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar">
              
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex flex-col">
                  <span className="text-xs text-primary font-mono tracking-wider font-bold">TICKET #{c.id}</span>
                  <span className="text-[10px] text-on-surface-variant mt-0.5">Reported: {c.date}</span>
                </div>
                <button 
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Photo Evidence */}
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-white/10 bg-neutral-900">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${c.photoUrl || 'https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=600&q=80'}')` }}
                />
              </div>

              {/* Basic description */}
              <div className="flex flex-col gap-1 bg-surface-container-lowest p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Citizen Description</span>
                <p className="text-xs text-on-surface leading-relaxed">{c.description || 'No description provided.'}</p>
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1 bg-surface-container-lowest p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Location Landmark</span>
                <p className="text-xs text-on-surface leading-relaxed flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[15px]">location_on</span>
                  {c.location}
                </p>
              </div>

              {/* Dynamic Status / Workforce Card */}
              <div className="flex flex-col gap-3 bg-surface-container-low border border-white/5 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Department & Workforce Status</span>
                  
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    c.status === 'RESOLVED' 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : c.status === 'ASSIGNED' 
                        ? 'bg-secondary/10 text-secondary border border-secondary/20' 
                        : c.status === 'PENDING_VERIFICATION'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : c.status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-on-surface-variant">Assigned Department</span>
                    <span className="font-semibold text-on-surface text-right max-w-[200px] truncate">{c.category}</span>
                  </div>

                  {c.status === 'ASSIGNED' || c.status === 'RESOLVED' ? (
                    <>
                      <div className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-on-surface-variant">Field Staff</span>
                        <span className="font-semibold text-primary">{c.assignee}</span>
                      </div>
                      {staff?.phone && (
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-on-surface-variant">Contact Staff</span>
                          <span className="font-semibold text-on-surface flex items-center gap-1 select-all cursor-pointer hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[13px]">call</span>
                            {staff.phone}
                          </span>
                        </div>
                      )}
                      {c.dispatchTime && (
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-on-surface-variant">Dispatch Date/Time</span>
                          <span className="font-semibold text-on-surface">{new Date(c.dispatchTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                      {c.estimatedSolutionDate && (
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-on-surface-variant">Est. Fix Target Date</span>
                          <span className="font-semibold text-primary">{new Date(c.estimatedSolutionDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </>
                  ) : null}

                  {c.status === 'REJECTED' && ver?.verificationReason && (
                    <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-xs flex gap-2">
                      <span className="material-symbols-outlined text-error shrink-0 text-[16px] mt-0.5">cancel</span>
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-semibold text-error block uppercase tracking-wider text-[9px] mb-0.5">Rejection Log</span>
                        {ver.verificationReason}
                      </div>
                    </div>
                  )}

                  {c.status === 'PENDING_VERIFICATION' && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs flex gap-2">
                      <span className="material-symbols-outlined text-yellow-400 shrink-0 text-[16px] mt-0.5">info</span>
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-semibold text-yellow-400 block uppercase tracking-wider text-[9px] mb-0.5">Queue Status</span>
                        Your complaint is currently undergoing automated AI content checks. Once approved, the department will assign a crew member.
                      </div>
                    </div>
                  )}

                  {c.status === 'OPEN' && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs flex gap-2">
                      <span className="material-symbols-outlined text-primary shrink-0 text-[16px] mt-0.5 animate-pulse">hourglass_empty</span>
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-semibold text-primary block uppercase tracking-wider text-[9px] mb-0.5">Dispatch Queue</span>
                        Your evidence was successfully validated. Your ticket is open, and a supervisor will assign a field crew member shortly.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedId(null)}
                className="w-full py-2 bg-surface-container-high border border-white/10 text-on-surface font-semibold rounded-lg hover:bg-surface-container-highest transition-colors text-xs mt-2"
              >
                Close Details
              </button>

            </div>
          </div>
        )
      })()}
    </div>
  )
}
