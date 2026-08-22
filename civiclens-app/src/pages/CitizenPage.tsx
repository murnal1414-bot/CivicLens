import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { civiclensApi } from '../services/api'
import { supabase } from '../services/supabase'
import { runRouterAgent } from '../services/ai'

const SUBCATS: Record<string, string[]> = {
  water:      ['Water leaking from pipe', 'No water supply', 'Low water pressure', 'Dirty water'],
  drainage:   ['Drain blocked', 'Open manhole', 'Sewage overflow'],
  sanitation: ['Garbage not collected', 'Illegal dumping', 'Public toilet issue'],
  electrical: ['Streetlight not working', 'Exposed wiring', 'Transformer problem'],
  roads:      ['Pothole', 'Broken footpath', 'Road caved in'],
  parks:      ['Broken equipment', 'Overgrown grass', 'Broken fence'],
  fire:       ['Fire hazard', 'Blocked fire exit'],
  revenue:    ['Property tax problem', 'Unauthorized construction'],
  housing:    ['Illegal building', 'Pollution or bad smell'],
}

const AI_HINTS: Record<string, string> = {
  water:      '→ Water Department · Priority: High · Expected fix: within 24 hours',
  drainage:   '→ Water Works · Priority: High · Expected fix: within 24 hours',
  sanitation: '→ Health & Sanitation · Priority: Medium · Expected fix: within 48 hours',
  electrical: '→ Electrical Department · Priority: Medium · Expected fix: within 48 hours',
  roads:      '→ Public Works · Priority: Medium–High · Depends on traffic impact',
  parks:      '→ Housing & Environment · Priority: Low · Expected fix: within 72 hours',
  fire:       '→ Fire Department · Priority: CRITICAL · Immediate action initiated',
  revenue:    '→ Revenue Department · Priority: Low · Expected: 5–7 business days',
  housing:    '→ Housing Department · Priority: Medium · Expected fix: within 72 hours',
}

export default function CitizenPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [lang, setLang]           = useState<'en' | 'hi'>('en')
  const [dept, setDept]           = useState('')
  const [subcat, setSubcat]       = useState('')
  const [text, setText]           = useState('')
  const [address, setAddress]     = useState('')
  const [micActive, setMic]       = useState(false)
  const [previews, setPreviews]   = useState<string[]>([])
  const [trackingId, setTracking] = useState('')
  const [showModal, setModal]     = useState(false)
  const [gpsLoading, setGpsLoad]  = useState(false)
  const [gpsOk, setGpsOk]         = useState(false)
  const [error, setError]         = useState('')

  const [citizenEmail, setCitizenEmail] = useState('')
  const [citizenPhone, setCitizenPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const phone = localStorage.getItem('citizen_phone')
      if (!session && !phone) {
        navigate('/login?role=citizen')
      } else {
        setCitizenEmail(session?.user?.email || '')
        setCitizenPhone(phone || '')
        setLoading(false)
      }
    }
    checkAuth()
  }, [navigate])

  const [aiRunning, setAiRunning] = useState(false)
  const [aiExplanation, setAiExplanation] = useState('')

  const handleAiAutoFill = async () => {
    if (!text.trim()) {
      setError('Please write a description first so the AI Agent can analyze it.')
      return
    }
    setAiRunning(true)
    setError('')
    try {
      const result = await runRouterAgent(text)
      const categoryToKey: Record<string, string> = {
        'Water Supply': 'water',
        'Drainage & Sewerage': 'drainage',
        'Health & Sanitation': 'sanitation',
        'Electrical & Mechanical': 'electrical',
        'Streetlights': 'electrical',
        'Roads & Public Works': 'roads',
        'Parks & Gardens': 'parks',
        'Fire Safety': 'fire',
        'Revenue': 'revenue',
        'Housing & Environment': 'housing'
      }
      
      const key = categoryToKey[result.category] || ''
      if (key) {
        setDept(key)
        if (SUBCATS[key]?.[0]) {
          setSubcat(SUBCATS[key][0])
        }
      }
      setAiExplanation(result.explanation)
    } catch (e) {
      console.error(e)
      setError('AI routing failed. Please configure manually.')
    } finally {
      setAiRunning(false)
    }
  }

  const addPreviews = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(f => {
      const r = new FileReader()
      r.onload = e => setPreviews(p => [...p, e.target?.result as string])
      r.readAsDataURL(f)
    })
  }, [])

  const getLocation = () => {
    setGpsLoad(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setAddress(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        setGpsOk(true)
        setGpsLoad(false)
      },
      () => setGpsLoad(false)
    )
  }

  const submit = async () => {
    if (!text.trim()) { setError('Please describe the problem before submitting.'); return }
    setError('')
    setSubmitting(true)
    
    // Map selected dept key to official department names
    const categoryMapping: Record<string, string> = {
      water: 'Water Supply',
      drainage: 'Drainage & Sewerage',
      sanitation: 'Health & Sanitation',
      electrical: 'Electrical & Mechanical',
      roads: 'Roads & Public Works',
      parks: 'Parks & Gardens',
      fire: 'Fire Safety',
      revenue: 'Revenue',
      housing: 'Housing & Environment',
    }

    const categoryName = categoryMapping[dept] || 'General Administration'
    const categoryIconMapping: Record<string, string> = {
      water: 'water_drop',
      drainage: 'waves',
      sanitation: 'delete_forever',
      electrical: 'lightbulb',
      roads: 'add_road',
      parks: 'forest',
      fire: 'local_fire_department',
      revenue: 'payments',
      housing: 'apartment',
    }
    const categoryIcon = categoryIconMapping[dept] || 'balance'

    try {
      const newTicket = await civiclensApi.addComplaint({
        category: categoryName,
        categoryIcon,
        location: address || 'Vijay Nagar, Indore',
        density: 'Med',
        priority: dept === 'fire' ? 'CRITICAL' : 'MEDIUM',
        description: text,
        photoUrl: previews[0] || '',
        assignee: '',
        citizenEmail,
        citizenPhone
      })

      setTracking(newTicket.id)
      setModal(true)
    } catch (e) {
      console.error(e)
      setError('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getEtaMessage = () => {
    switch (dept) {
      case 'fire':
        return '🚨 EMERGENCY SLA: Immediate dispatch initiated!'
      case 'water':
      case 'drainage':
        return '🕒 SLA Target: Fixed within 24 hours'
      case 'sanitation':
      case 'electrical':
      case 'housing':
        return '🕒 SLA Target: Fixed within 48 hours'
      case 'parks':
        return '🕒 SLA Target: Fixed within 72 hours'
      case 'roads':
        return '🕒 SLA Target: Fixed within 5 business days'
      default:
        return '🕒 SLA Target: Fixed within 48 hours'
    }
  }

  const reset = () => {
    setText(''); setDept(''); setSubcat(''); setAddress('')
    setPreviews([]); setGpsOk(false); setModal(false); setError('')
  }

  const pageTitle  = lang === 'en' ? 'Report a Problem' : 'शिकायत दर्ज करें'
  const pageDesc   = lang === 'en'
    ? 'Fill in the details below and we\'ll make sure your complaint reaches the right team.'
    : 'नीचे जानकारी भरें और हम सुनिश्चित करेंगे कि आपकी शिकायत सही टीम तक पहुंचे।'

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-on-surface-variant uppercase tracking-widest">Checking Authentication...</p>
      </div>
    )
  }

  return (
    <div className="dark min-h-screen bg-background">
      <Navbar />

      <main className="pt-16 pb-16">
        {/* Subtle background blurs */}
        <div className="fixed top-0 left-0 w-[40vw] h-[40vw] bg-primary/[0.025] rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[50vw] h-[50vw] bg-secondary/[0.02] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-10 py-10 flex flex-col gap-8">

          {/* ── Page Header ── */}
          <div className="flex flex-col gap-3 border-l-2 border-primary pl-5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full text-[10px] text-on-surface-variant border border-white/5 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live · System Online
              </span>
              <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5 border border-white/5">
                {(['en', 'hi'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${lang === l ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-primary tracking-tight">{pageTitle}</h1>
            <p className="text-sm text-on-surface-variant max-w-xl">{pageDesc}</p>
          </div>

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* ── Left Column ── */}
            <div className="lg:col-span-7 flex flex-col gap-5">

              {/* What's the problem? */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">description</span>
                    What's the problem?
                  </h2>
                  <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">1 of 3</span>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Text area */}
                  <div className="relative">
                    <textarea
                      value={text}
                      onChange={e => { setText(e.target.value); if (error) setError('') }}
                      rows={5}
                      className={`form-input resize-none ${error ? 'border-error/50' : ''}`}
                      placeholder="Describe the issue clearly. E.g. 'The streetlight near Palasia Square has not been working for 3 days.'"
                    />
                    {error && <p className="text-xs text-error mt-1">{error}</p>}
                    
                    {/* Actions Panel */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        onClick={handleAiAutoFill}
                        disabled={aiRunning}
                        type="button"
                        title="AI Auto-Fill Department & Priority"
                        className="h-9 px-3 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs rounded-full flex items-center gap-1.5 transition-all"
                      >
                        <span className={`material-symbols-outlined text-[15px] ${aiRunning ? 'animate-spin' : ''}`}>
                          {aiRunning ? 'refresh' : 'psychology'}
                        </span>
                        {aiRunning ? 'Analyzing...' : 'AI Route'}
                      </button>
                      
                      <button
                        onClick={() => setMic(m => !m)}
                        title={micActive ? 'Stop recording' : 'Record voice message'}
                        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${micActive ? 'bg-error/20 border-error/40' : 'bg-surface-container hover:bg-surface-bright border-white/10'}`}
                      >
                        {micActive && <span className="absolute inset-0 rounded-full border border-error/30 animate-ping" />}
                        <span className={`material-symbols-outlined text-[16px] ${micActive ? 'text-error' : 'text-on-surface-variant'}`}>
                          {micActive ? 'stop' : 'mic'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Department + Sub-cat */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-on-surface-variant uppercase tracking-wider">Which department?</label>
                      <div className="relative">
                        <select
                          value={dept}
                          onChange={e => { setDept(e.target.value); setSubcat('') }}
                          className="form-input appearance-none pr-9 cursor-pointer"
                        >
                          <option value="" disabled>Choose a department</option>
                          {Object.keys(SUBCATS).map(k => (
                            <option key={k} value={k} className="bg-surface-container capitalize">{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-on-surface-variant uppercase tracking-wider">Specific issue</label>
                      <div className="relative">
                        <select
                          value={subcat}
                          onChange={e => setSubcat(e.target.value)}
                          disabled={!dept}
                          className={`form-input appearance-none pr-9 ${!dept ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="" disabled>{dept ? 'Choose issue type' : 'Pick department first'}</option>
                          {(SUBCATS[dept] || []).map(s => <option key={s} value={s} className="bg-surface-container">{s}</option>)}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none text-[18px]">expand_more</span>
                      </div>
                    </div>
                  </div>

                  {/* AI hint */}
                  {(aiExplanation || (dept && AI_HINTS[dept])) && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/[0.06] border border-primary/15">
                      <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                      <div>
                        <p className="text-xs font-semibold text-primary mb-0.5">
                          {aiExplanation ? 'AI Router Agent Recommendation' : 'AI Routing'}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {aiExplanation || AI_HINTS[dept]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Add photos */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">add_a_photo</span>
                    Add photos (optional)
                  </h2>
                  <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">2 of 3</span>
                </div>

                <div
                  className="border-2 border-dashed border-white/10 hover:border-primary/40 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-surface-dim/20 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('file-input')?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); addPreviews(e.dataTransfer.files) }}
                >
                  <input id="file-input" type="file" multiple accept="image/*" className="hidden" onChange={e => addPreviews(e.target.files)} />
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/5">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">upload_file</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-on-surface font-medium">Drag photos here or click to upload</p>
                    <p className="text-xs text-on-surface-variant mt-1">Photos help us verify and speed up the fix</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full border border-white/5">
                    <span className="material-symbols-outlined text-[13px] text-primary">psychology</span>
                    <span className="text-[10px] text-on-surface-variant">AI checks for duplicate reports using your photo</span>
                  </div>
                </div>

                {previews.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group/img">
                        <img src={src} className="w-full h-full object-cover" alt="" />
                        <button
                          onClick={() => setPreviews(p => p.filter((_, j) => j !== i))}
                          className="absolute inset-0 bg-black/60 hidden group-hover/img:flex items-center justify-center text-white"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column: Location ── */}
            <div className="lg:col-span-5">
              <div className="glass-card p-6 h-full flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">location_on</span>
                    Where is this problem?
                  </h2>
                  <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">3 of 3</span>
                </div>

                {/* Map thumbnail */}
                <div className="relative w-full h-52 rounded-xl overflow-hidden border border-white/10 bg-surface-container grayscale hover:grayscale-0 transition-all duration-500 cursor-crosshair">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAtBoZExASt7kFi7OV92ddP4mS6MKgGbo8GFgpYwa-sP-7ex6ccYJNyc7fpV3gqmViBuNlRcIfjveOl8NVhdWo26IxgearDkF-B-yJ-H4M_BF_eMEpds8qVS2m_0FrkITLkS-YF2dnPYo3k0BbwYjE4BnXVL6c0cozwRxmkaDv7Bua1mNScFOOG2rGiDuTEs1gzxF2eB7WY5_CdBROSexYoXgRA2WHVF0L2mhGVglOK1E-aaXokEXFr')` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="material-symbols-outlined text-primary text-[36px] drop-shadow-lg" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  </div>
                  <button
                    onClick={getLocation}
                    title="Use my current location"
                    className="absolute top-3 right-3 w-9 h-9 bg-surface-container/80 backdrop-blur rounded-full border border-white/10 flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors text-on-surface shadow"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${gpsLoading ? 'animate-spin' : ''}`}>
                      {gpsLoading ? 'refresh' : 'my_location'}
                    </span>
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wider">Address or landmark</label>
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="form-input"
                    placeholder="E.g., Near Palasia Square, M.G. Road"
                    type="text"
                  />
                </div>

                {gpsOk && (
                  <div className="flex items-center gap-2 text-[11px] text-green-400">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Location detected from GPS
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-white/[0.08]">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-lowest/60 border border-white/5">
                    <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">analytics</span>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">
                      Our AI uses your location to detect nearby complaints and route your ticket to the fastest available team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-white/[0.08]">
            <Link to="/" className="text-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to home
            </Link>
            <div className="flex items-center gap-3">
              <button className="btn-ghost">
                <span className="material-symbols-outlined text-[16px]">save</span>
                Save as draft
              </button>
              <button 
                onClick={submit} 
                disabled={submitting} 
                className="btn-primary px-8 flex items-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Submit complaint'}
                <span className={`material-symbols-outlined text-[16px] ${submitting ? 'animate-spin' : ''}`}>
                  {submitting ? 'autorenew' : 'send'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Success Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-surface-container-low border border-white/[0.12] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in relative overflow-hidden">
            {/* Ambient glow in background of modal */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-green-500/10 rounded-full blur-xl pointer-events-none" />
            
            {/* Animated checkmark circle */}
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5 animate-pulse-slow">
              <span className="material-symbols-outlined text-green-400 text-[36px] animate-scale-up" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            
            <h2 className="text-xl font-semibold text-primary mb-1.5">Complaint Filed!</h2>
            <p className="text-sm text-on-surface-variant mb-4">Your report has been successfully recorded on the Supabase network.</p>
            
            {/* Ticket details container */}
            <div className="bg-surface-container-lowest/60 border border-white/5 rounded-xl p-4 mb-6 flex flex-col gap-2.5 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant">Ticket ID</span>
                <code className="bg-surface-container px-2 py-0.5 rounded text-primary font-bold">{trackingId}</code>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-on-surface-variant">Priority</span>
                <span className={`font-semibold ${dept === 'fire' ? 'text-error' : 'text-primary'}`}>
                  {dept === 'fire' ? 'CRITICAL' : 'MEDIUM'}
                </span>
              </div>
              <div className="flex flex-col border-t border-white/5 pt-2 gap-0.5">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Estimated Resolution</span>
                <span className="text-xs font-semibold text-green-400">{getEtaMessage()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setModal(false)
                  navigate('/citizen/dashboard')
                }} 
                className="flex-1 btn-ghost py-2.5 rounded-xl text-xs font-semibold hover:bg-white/5 transition-all"
              >
                Track on Dashboard
              </button>
              <button 
                onClick={() => {
                  reset()
                }} 
                className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-semibold shadow-lg hover:opacity-95 transition-all"
              >
                File Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-surface-container-low py-10 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-on-surface-variant text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            <span className="tracking-widest font-medium uppercase">CivicLens · IMC Indore</span>
          </div>
          <div className="flex gap-6">
            {['Privacy', 'Contact', 'Terms'].map(l => (
              <a key={l} href="#" className="hover:text-primary transition-colors">{l}</a>
            ))}
          </div>
          <div className="text-on-surface-variant/40">© 2026 Indore Municipal Corporation</div>
        </div>
      </footer>
    </div>
  )
}
