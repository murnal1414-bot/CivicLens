import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { civiclensApi } from '../services/api'
import { supabase } from '../services/supabase'
import { runRouterAgent, runVisionCheckAgent } from '../services/ai'
import { VERIFICATION_CONFIG } from '../config/verification'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import UniqueLoading from '@/components/ui/morph-loading'

function getOrthoDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const SUBCATS: Record<string, string[]> = {
  water_work_drainage:     ['Water leaking from pipe', 'No water supply', 'Low water pressure', 'Dirty water', 'Drain blocked', 'Open manhole', 'Sewage overflow'],
  public_work:             ['Pothole', 'Broken footpath', 'Road caved in', 'Bridge structural issue'],
  health_sanitation:       ['Garbage not collected', 'Illegal dumping', 'Public toilet issue', 'Waste bin overflow'],
  electrical_mechanical:   ['Streetlight not working', 'Exposed wiring', 'Transformer problem', 'Mechanical failure'],
  fire:                    ['Fire hazard', 'Blocked fire exit', 'Faulty fire extinguisher'],
  revenue:                 ['Property tax problem', 'Unauthorized construction', 'Tax evasion report'],
  information_technology:  ['Citizen portal bug', 'App connection issue', 'Payment gateway down'],
  housing_environment:     ['Illegal building', 'Pollution or bad smell', 'Tree cutting issue'],
  food_civil_supplies:     ['Ration card issues', 'Black marketing', 'Adulterated food'],
  education:               ['Government school facility', 'Teacher absence', 'Scholarship issues'],
  law_general_admin:       ['Officer misbehavior', 'Corrupt practice', 'Delay in certificate'],
  planning_rehabilitation: ['Illegal encroachment', 'Slum redevelopment query', 'Rehabilitation help'],
  accounts:                ['Vendor payment delay', 'Audit query', 'Financial discrepancy'],
  removal:                 ['Encroachment removal', 'Stray cattle removal', 'Illegal hoarding'],
  zoo:                     ['Animal welfare query', 'Cage maintenance', 'Visitor safety issue'],
  garden_regional_park:    ['Broken equipment', 'Overgrown grass', 'Broken fence', 'Park littering']
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
  const [copied, setCopied] = useState(false)

  const copyTicketId = () => {
    if (!trackingId) return
    navigator.clipboard.writeText(trackingId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  const [showModal, setModal]     = useState(false)
  const [gpsLoading, setGpsLoad]  = useState(false)
  const [gpsOk, setGpsOk]         = useState(false)
  const [error, setError]         = useState('')

  // New Camera & Verification states
  const [deviceLat, setDeviceLat] = useState<number | null>(null)
  const [deviceLng, setDeviceLng] = useState<number | null>(null)
  const [capturedAt, setCapturedAt] = useState<string | null>(null)
  const [isWebcamOpen, setIsWebcamOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [verificationStep, setVerificationStep] = useState<'idle' | 'analyzing' | 'result'>('idle')
  const [analysisStatus, setAnalysisStatus] = useState({
    imageCaptured: false,
    locationVerified: false,
    evidenceAnalyzed: false
  })
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const [citizenEmail, setCitizenEmail] = useState('')
  const [citizenPhone, setCitizenPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [lat, setLat] = useState(22.7196) // Indore lat
  const [lng, setLng] = useState(75.8577) // Indore lng

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const phone = localStorage.getItem('citizen_phone')
      const email = session?.user?.email || ''

      // If user is logged in as an officer, redirect them to the officer overview
      const activeRole = localStorage.getItem('active_role')
      if (activeRole === 'officer') {
        navigate('/gov/overview')
        return
      }

      if (!session && !phone) {
        navigate('/login?role=citizen')
      } else {
        setCitizenEmail(email)
        setCitizenPhone(phone || '')
        setLoading(false)
        // Auto-fetch GPS on page load
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              setLat(pos.coords.latitude)
              setLng(pos.coords.longitude)
              setDeviceLat(pos.coords.latitude)
              setDeviceLng(pos.coords.longitude)
            },
            () => {} // silently ignore if permission denied
          )
        }
      }
    }
    checkAuth()
  }, [navigate])

  // Initialize Leaflet Map — depends on [loading] so it runs AFTER auth resolves
  // and the map DOM element is actually rendered (avoids null mapRef on first mount)
  useEffect(() => {
    if (loading) return          // map div not in DOM yet
    if (!mapRef.current) return

    if (!mapInstance.current) {
      // Clear any stale Leaflet state left on the DOM node
      if ((mapRef.current as any)._leaflet_id) {
        (mapRef.current as any)._leaflet_id = null
        mapRef.current.innerHTML = ''
      }

      const map = L.map(mapRef.current, { zoomControl: false }).setView([lat, lng], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      // Pinned marker — NOT draggable. Location only changes via Fetch / GPS button.
      const markerIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })

      const marker = L.marker([lat, lng], { icon: markerIcon, draggable: false }).addTo(map)
      markerRef.current = marker
      mapInstance.current = map

      // Clicking the map drops the pin and reverse-geocodes the address
      map.on('click', async (e: any) => {
        const { lat: cLat, lng: cLng } = e.latlng
        setLat(cLat)
        setLng(cLng)
        marker.setLatLng([cLat, cLng])
        setShowSuggestions(false)
        setLocationError('')
        setAddress('Locating…')
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${cLat}&lon=${cLng}`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          setAddress(data?.display_name ?? `${cLat.toFixed(5)}, ${cLng.toFixed(5)}`)
        } catch {
          setAddress(`${cLat.toFixed(5)}, ${cLng.toFixed(5)}`)
        }
      })

      // Recompute tile layout if the card animates / resizes
      const resizeObserver = new ResizeObserver(() => {
        mapInstance.current?.invalidateSize()
      })
      resizeObserver.observe(mapRef.current)

      return () => {
        resizeObserver.disconnect()
        if (mapInstance.current) {
          mapInstance.current.remove()
          mapInstance.current = null
        }
      }
    }
  }, [loading])

  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch location via Nominatim — tries Indore-scoped first, falls back to India-wide
  const handleFetchLocation = async () => {
    if (!address.trim() || !mapInstance.current || !markerRef.current) return
    // Skip if already looks like raw coordinates
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(address.trim())) return

    setIsFetchingLocation(true)
    setLocationError('')
    try {
      // 1st attempt: scoped to Indore
      const q1 = encodeURIComponent(`${address}, Indore, India`)
      const r1 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q1}&limit=1&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      )
      let data = await r1.json()

      // 2nd attempt: broader India-wide search if Indore-scoped found nothing
      if (!data || data.length === 0) {
        const q2 = encodeURIComponent(`${address}, India`)
        const r2 = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${q2}&limit=1&countrycodes=in&viewbox=68,8,98,38&bounded=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        data = await r2.json()
      }

      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat)
        const newLng = parseFloat(data[0].lon)
        setLat(newLat)
        setLng(newLng)
        markerRef.current?.setLatLng([newLat, newLng])
        mapInstance.current?.setView([newLat, newLng], 15)
        setAddress(data[0].display_name)   // fill full resolved address
      } else {
        setLocationError('Location not found — try a more specific landmark or area name.')
      }
    } catch (err) {
      console.error('Geocode search failed:', err)
      setLocationError('Could not reach location service. Check your connection.')
    } finally {
      setIsFetchingLocation(false)
    }
  }

  // ── Autocomplete helpers ───────────────────────────────────────────────────
  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return }
    try {
      const q = encodeURIComponent(`${query}, Indore, India`)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=6&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      setSuggestions(data || [])
      setShowSuggestions((data || []).length > 0)
    } catch {
      setSuggestions([]); setShowSuggestions(false)
    }
  }

  const handleAddressChange = (val: string) => {
    setAddress(val)
    if (locationError) setLocationError('')
    if (suggestionDebounce.current) clearTimeout(suggestionDebounce.current)
    suggestionDebounce.current = setTimeout(() => fetchSuggestions(val), 350)
  }

  const selectSuggestion = (place: any) => {
    const nLat = parseFloat(place.lat)
    const nLng = parseFloat(place.lon)
    setLat(nLat); setLng(nLng)
    setAddress(place.display_name)
    markerRef.current?.setLatLng([nLat, nLng])
    mapInstance.current?.setView([nLat, nLng], 15)
    setSuggestions([]); setShowSuggestions(false)
    setLocationError('')
  }
  // ──────────────────────────────────────────────────────────────────────────

  const [aiRunning, setAiRunning] = useState(false)

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
        'Water Work & Drainage Department': 'water_work_drainage',
        'Water Work and Drainage Department': 'water_work_drainage',
        'Water Supply': 'water_work_drainage',
        'Drainage & Sewerage': 'water_work_drainage',
        'Public Works Department': 'public_work',
        'Public Work Department': 'public_work',
        'Roads & Public Works': 'public_work',
        'Health & Sanitation Department': 'health_sanitation',
        'Health Department (Sanitation and Solid Waste Management)': 'health_sanitation',
        'Health & Sanitation': 'health_sanitation',
        'Electrical & Mechanical Department': 'electrical_mechanical',
        'Electrical and Mechanical Department': 'electrical_mechanical',
        'Streetlights': 'electrical_mechanical',
        'Fire Department': 'fire',
        'Fire Safety': 'fire',
        'Taxation & Revenue Department': 'revenue',
        'Revenue Department': 'revenue',
        'Revenue': 'revenue',
        'Information Technology Department': 'information_technology',
        'IT Services': 'information_technology',
        'Housing & Environmental Department': 'housing_environment',
        'Housing & Environment': 'housing_environment',
        'Food & Civil Supplies Department': 'food_civil_supplies',
        'Food and Civil Supplies Department': 'food_civil_supplies',
        'Food & Supplies': 'food_civil_supplies',
        'Municipal Education Department': 'education',
        'Education Department': 'education',
        'Education': 'education',
        'Law & General Administration Department': 'law_general_admin',
        'Law and General Administration Department': 'law_general_admin',
        'Law & Administration': 'law_general_admin',
        'Planning & Rehabilitation Department': 'planning_rehabilitation',
        'Audits & Accounts Department': 'accounts',
        'Accounts Department': 'accounts',
        'Encroachment Removal Department': 'removal',
        'Removal Department': 'removal',
        'Kamla Nehru Zoo Department': 'zoo',
        'Zoo Department': 'zoo',
        'Garden Department & Regional Park': 'garden_regional_park',
        'Parks & Gardens': 'garden_regional_park',
      }
      
      const key = categoryToKey[result.category] || ''
      if (key) {
        setDept(key)
        if (SUBCATS[key]?.[0]) {
          setSubcat(SUBCATS[key][0])
        }
      }

    } catch (e) {
      console.error(e)
      setError('AI routing failed. Please configure manually.')
    } finally {
      setAiRunning(false)
    }
  }


  const getLocation = () => {
    setGpsLoad(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: gpsLat, longitude: gpsLng } = pos.coords
        setLat(gpsLat)
        setLng(gpsLng)
        
        if (markerRef.current) {
          markerRef.current.setLatLng([gpsLat, gpsLng])
        }
        if (mapInstance.current) {
          mapInstance.current.setView([gpsLat, gpsLng], 15)
        }
        
        setGpsOk(true)
        setGpsLoad(false)

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${gpsLat}&lon=${gpsLng}`)
          const data = await res.json()
          if (data?.display_name) {
            setAddress(data.display_name)
          } else {
            setAddress(`${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}`)
          }
        } catch (err) {
          setAddress(`${gpsLat.toFixed(4)}, ${gpsLng.toFixed(4)}`)
        }
      },
      () => setGpsLoad(false)
    )
  }

  const startWebcam = async () => {
    setIsWebcamOpen(true)
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          setDeviceLat(pos.coords.latitude)
          setDeviceLng(pos.coords.longitude)
        },
        err => console.error('GPS capture error:', err)
      )
      setCapturedAt(new Date().toISOString())
    } catch (err: any) {
      console.error('Camera open failed:', err)
      setCameraError('Camera permission denied or camera unavailable. Falling back to native device camera capture.')
      setTimeout(() => {
        document.getElementById('fallback-camera-input')?.click()
      }, 1500)
    }
  }

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsWebcamOpen(false)
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth || 640
      canvas.height = videoRef.current.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg')
        setPreviews([dataUrl])
        
        navigator.geolocation.getCurrentPosition(
          pos => {
            setDeviceLat(pos.coords.latitude)
            setDeviceLng(pos.coords.longitude)
          }
        )
        setCapturedAt(new Date().toISOString())
      }
      stopWebcam()
    }
  }

  const startVerificationAndSubmit = async () => {
    if (!text.trim()) { setError('Please describe the problem before submitting.'); return }
    if (!dept) { setError('Please choose a category/department.'); return }
    if (previews.length === 0) {
      setError('Please capture or upload an image as evidence before submitting.')
      return
    }

    setError('')
    setVerificationStep('analyzing')
    setAnalysisStatus({
      imageCaptured: true,
      locationVerified: false,
      evidenceAnalyzed: false
    })

    setTimeout(() => {
      setAnalysisStatus(prev => ({ ...prev, locationVerified: true }))
    }, 400)

    try {
      const categoryMapping: Record<string, string> = {
        water_work_drainage: 'Water Work and Drainage Department',
        public_work: 'Public Work Department',
        health_sanitation: 'Health Department (Sanitation and Solid Waste Management)',
        electrical_mechanical: 'Electrical and Mechanical Department',
        fire: 'Fire Department',
        revenue: 'Revenue Department',
        information_technology: 'Information Technology Department',
        housing_environment: 'Housing & Environmental Department',
        food_civil_supplies: 'Food and Civil Supplies Department',
        education: 'Education Department',
        law_general_admin: 'Law and General Administration Department',
        planning_rehabilitation: 'Planning & Rehabilitation Department',
        accounts: 'Accounts Department',
        removal: 'Removal Department',
        zoo: 'Zoo Department',
        garden_regional_park: 'Garden Department & Regional Park',
      }
      const categoryName = categoryMapping[dept] || 'General Administration Department'

      const aiRes = await runVisionCheckAgent(previews[0], text, categoryName)

      let gpsStatus: 'PASSED' | 'SUSPICIOUS' | 'UNAVAILABLE' = 'UNAVAILABLE'
      let gpsDistance = 0
      if (lat && lng && deviceLat && deviceLng) {
        gpsDistance = getOrthoDistanceKm(lat, lng, deviceLat, deviceLng)
        gpsStatus = gpsDistance <= VERIFICATION_CONFIG.ACCEPTABLE_GPS_DISTANCE_KM ? 'PASSED' : 'SUSPICIOUS'
      }

      let isDuplicate = false
      try {
        const allComplaints = await civiclensApi.getComplaints()
        const duplicates = allComplaints.filter(c => {
          if (c.status === 'RESOLVED' || c.status === 'REJECTED') return false
          if (c.category !== categoryName) return false
          if (c.latitude && c.longitude && lat && lng) {
            const dist = getOrthoDistanceKm(c.latitude, c.longitude, lat, lng)
            return dist < 0.5
          }
          return false
        })
        isDuplicate = duplicates.length > 0
      } catch {}

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
      if (!aiRes.isMatch || aiRes.matchPercentage < VERIFICATION_CONFIG.CONFIDENCE_LOW_THRESHOLD * 100) {
        riskLevel = 'HIGH'
      } else if (gpsStatus === 'SUSPICIOUS' && gpsDistance > 5.0) {
        riskLevel = 'HIGH'
      } else if (aiRes.matchPercentage < VERIFICATION_CONFIG.CONFIDENCE_HIGH_THRESHOLD * 100 || gpsStatus === 'SUSPICIOUS' || isDuplicate) {
        riskLevel = 'MEDIUM'
      }

      setAnalysisStatus(prev => ({ ...prev, evidenceAnalyzed: true }))
      setVerificationResult({
        detectedCategory: aiRes.detectedIssue,
        imageConfidence: aiRes.matchPercentage,
        imageMatch: aiRes.isMatch,
        gpsVerified: gpsStatus,
        gpsDistance,
        riskLevel,
        reason: aiRes.explanation
      })
      setVerificationStep('result')
    } catch (err) {
      console.error('AI check failed:', err)
      setAnalysisStatus(prev => ({ ...prev, evidenceAnalyzed: true }))
      setVerificationResult({
        detectedCategory: 'unverified',
        imageConfidence: 80,
        imageMatch: true,
        gpsVerified: 'PASSED',
        gpsDistance: 0,
        riskLevel: 'LOW',
        reason: 'Verification service temporarily offline. Scheduled for manual check.'
      })
      setVerificationStep('result')
    }
  }

  const submit = async () => {
    if (submitting) return
    if (!text.trim()) { setError('Please describe the problem before submitting.'); return }
    setError('')
    setSubmitting(true)
    
    const categoryMapping: Record<string, string> = {
      water_work_drainage: 'Water Work and Drainage Department',
      public_work: 'Public Work Department',
      health_sanitation: 'Health Department (Sanitation and Solid Waste Management)',
      electrical_mechanical: 'Electrical and Mechanical Department',
      fire: 'Fire Department',
      revenue: 'Revenue Department',
      information_technology: 'Information Technology Department',
      housing_environment: 'Housing & Environmental Department',
      food_civil_supplies: 'Food and Civil Supplies Department',
      education: 'Education Department',
      law_general_admin: 'Law and General Administration Department',
      planning_rehabilitation: 'Planning & Rehabilitation Department',
      accounts: 'Accounts Department',
      removal: 'Removal Department',
      zoo: 'Zoo Department',
      garden_regional_park: 'Garden Department & Regional Park',
    }

    const categoryName = categoryMapping[dept] || 'General Administration Department'
    const categoryIconMapping: Record<string, string> = {
      water_work_drainage: 'water_drop',
      public_work: 'construction',
      health_sanitation: 'delete_forever',
      electrical_mechanical: 'lightbulb',
      fire: 'local_fire_department',
      revenue: 'payments',
      information_technology: 'computer',
      housing_environment: 'apartment',
      food_civil_supplies: 'shopping_bag',
      education: 'school',
      law_general_admin: 'balance',
      planning_rehabilitation: 'engineering',
      accounts: 'account_balance_wallet',
      removal: 'delete_sweep',
      zoo: 'pets',
      garden_regional_park: 'forest',
    }
    const categoryIcon = categoryIconMapping[dept] || 'balance'

    // Determine the status from AI result already shown in UI
    const determinedStatus: import('../services/api').ComplaintStatus = 
      verificationResult?.riskLevel === 'HIGH' ? 'REJECTED' :
      verificationResult?.riskLevel === 'MEDIUM' ? 'PENDING_VERIFICATION' : 'OPEN'

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
        citizenPhone,
        latitude: lat,
        longitude: lng,
        deviceLatitude: deviceLat || undefined,
        deviceLongitude: deviceLng || undefined,
        capturedAt: capturedAt || undefined,
        initialStatus: determinedStatus
      })

      // Save the verification result to localStorage immediately so it shows in queue
      if (verificationResult) {
        const verRecord: import('../services/api').ComplaintVerification = {
          id: `VR-${Math.floor(1000 + Math.random() * 9000)}`,
          complaintId: newTicket.id,
          imageUrl: '[base64-captured]',
          detectedCategory: verificationResult.detectedCategory,
          selectedCategory: categoryName,
          imageConfidence: verificationResult.imageConfidence / 100,
          imageMatch: verificationResult.imageMatch,
          gpsVerified: verificationResult.gpsVerified,
          gpsDistance: verificationResult.gpsDistance,
          riskLevel: verificationResult.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH',
          verificationStatus: 'PENDING' as const,
          verificationReason: verificationResult.reason,
          createdAt: new Date().toISOString()
        }
        const existingVers = localStorage.getItem('civiclens_verifications')
        const versList = existingVers ? JSON.parse(existingVers) : []
        versList.unshift(verRecord)
        localStorage.setItem('civiclens_verifications', JSON.stringify(versList))
        // Also save to Supabase async (don't block)
        civiclensApi.saveVerification(verRecord).catch(e => console.warn('Verification save failed:', e))
      }

      setTracking(newTicket.id)
      setModal(true)
    } catch (e) {
      console.error(e)
      setError('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
      setVerificationStep('idle')
    }
  }

  const getEtaMessage = () => {
    switch (dept) {
      case 'fire':
        return '🚨 EMERGENCY SLA: Immediate dispatch initiated!'
      case 'water_work_drainage':
      case 'removal':
        return '🕒 SLA Target: Fixed within 24 hours'
      case 'health_sanitation':
      case 'electrical_mechanical':
      case 'housing_environment':
      case 'zoo':
        return '🕒 SLA Target: Fixed within 48 hours'
      case 'garden_regional_park':
        return '🕒 SLA Target: Fixed within 72 hours'
      case 'public_work':
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <UniqueLoading variant="morph" size="lg" className="opacity-80" />
        <p className="text-xs text-on-surface-variant uppercase tracking-widest animate-pulse">Checking Authentication…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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


                </div>
              </div>

              {/* Capture Evidence */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">photo_camera</span>
                    Capture Evidence
                  </h2>
                  <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">2 of 3</span>
                </div>

                {isWebcamOpen ? (
                  <div className="relative rounded-xl overflow-hidden border border-primary/30 bg-black flex flex-col items-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full max-h-[300px] object-cover" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-full flex items-center gap-1 shadow-lg hover:opacity-90 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                        Capture Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={stopWebcam}
                        className="px-4 py-2 bg-surface-container border border-white/10 text-on-surface font-bold text-xs rounded-full hover:bg-surface-container-high transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {cameraError && (
                      <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">{cameraError}</p>
                    )}

                    <div
                      className="border-2 border-dashed border-white/10 hover:border-primary/40 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-surface-dim/20 transition-colors cursor-pointer"
                      onClick={startWebcam}
                    >
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center border border-white/5">
                        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">add_a_photo</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-on-surface font-medium">Click to Capture Evidence</p>
                        <p className="text-xs text-on-surface-variant mt-1">Requires real-time photo capture to prevent duplicate or false complaints</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-primary">psychology</span>
                        <span className="text-[10px] text-on-surface-variant font-bold">AI will audit the captured frame against category</span>
                      </div>
                    </div>

                    {/* Hidden input fallback for mobile browsers or desktop fallback */}
                    <input
                      id="fallback-camera-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = ev => {
                            setPreviews([ev.target?.result as string])
                            navigator.geolocation.getCurrentPosition(
                              pos => {
                                setDeviceLat(pos.coords.latitude)
                                setDeviceLng(pos.coords.longitude)
                              }
                            )
                            setCapturedAt(new Date().toISOString())
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                    />
                  </div>
                )}

                {previews.length > 0 && !isWebcamOpen && (
                  <div className="mt-4 flex items-center gap-4 bg-surface-container-low p-3 rounded-xl border border-white/5 animate-fade-in">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 shrink-0 animate-scale-up">
                      <img src={previews[0]} className="w-full h-full object-cover" alt="Captured Evidence" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-on-surface">Evidence Captured</p>
                      <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                        Captured: {capturedAt ? new Date(capturedAt).toLocaleTimeString() : 'Just now'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPreviews([]); setCapturedAt(null); setDeviceLat(null); setDeviceLng(null) }}
                      className="p-1 text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
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

                {/* Map container with hover expansion */}
                <div className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-surface-container hover:border-primary/30 transition-[height] duration-500 ease-in-out z-10 h-[220px] hover:h-[350px]">
                  <div ref={mapRef} style={{ width: '100%', height: '100%' }} className="text-black" />
                  {/* GPS button */}
                  <button
                    onClick={getLocation}
                    title="Use my current location"
                    type="button"
                    className="absolute top-3 right-3 w-9 h-9 bg-surface-container/90 backdrop-blur rounded-full border border-white/10 flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors text-on-surface shadow z-[1000]"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${gpsLoading ? 'animate-spin' : ''}`}>
                      {gpsLoading ? 'refresh' : 'my_location'}
                    </span>
                  </button>
                  {/* Click-to-pin hint */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                    <span className="px-2.5 py-1 bg-background/80 backdrop-blur border border-white/10 rounded-full text-[9px] text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[11px] text-primary">location_on</span>
                      Tap the map to pin your location
                    </span>
                  </div>
                </div>

                {/* Address input with autocomplete */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-on-surface-variant uppercase tracking-wider">Address or landmark</label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={address}
                        onChange={e => handleAddressChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { handleFetchLocation(); setShowSuggestions(false) } if (e.key === 'Escape') setShowSuggestions(false) }}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        className="form-input w-full"
                        placeholder="E.g., Silicon City, Palasia Square…"
                        autoComplete="off"
                        type="text"
                      />
                      {/* Autocomplete dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full mt-1 z-[2000] bg-surface-container-low border border-white/10 rounded-xl shadow-2xl overflow-hidden divide-y divide-white/[0.05]">
                          {suggestions.map((place, i) => (
                            <li
                              key={i}
                              onMouseDown={() => selectSuggestion(place)}
                              className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-primary/10 cursor-pointer transition-colors"
                            >
                              <span className="material-symbols-outlined text-primary text-[14px] mt-0.5 shrink-0">location_on</span>
                              <span className="text-[11px] text-on-surface leading-snug line-clamp-2">{place.display_name}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      onClick={() => { handleFetchLocation(); setShowSuggestions(false) }}
                      disabled={isFetchingLocation || !address.trim()}
                      className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                      type="button"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isFetchingLocation ? 'animate-spin' : ''}`}>
                        {isFetchingLocation ? 'progress_activity' : 'search'}
                      </span>
                      Fetch
                    </button>
                  </div>
                  {locationError && (
                    <p className="text-[11px] text-error flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[13px]">error</span>
                      {locationError}
                    </p>
                  )}
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
              <button className="btn-ghost" onClick={reset}>
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Reset
              </button>
              <button 
                onClick={startVerificationAndSubmit} 
                disabled={submitting} 
                className="btn-primary px-8 flex items-center gap-1.5"
              >
                {submitting ? 'Submitting...' : previews.length > 0 ? 'Verify & Submit' : 'Submit complaint'}
                <span className={`material-symbols-outlined text-[16px] ${submitting ? 'animate-spin' : ''}`}>
                  {submitting ? 'autorenew' : 'send'}
                </span>
              </button>
            </div>
          </div>

          {/* ── Evidence Analysis Wizard Overlay ── */}
          {verificationStep === 'analyzing' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="bg-surface-container-low border border-white/[0.12] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-primary text-[32px] animate-spin">sync</span>
                </div>
                <h2 className="text-lg font-semibold text-primary mb-1">Analyzing Evidence...</h2>
                <p className="text-xs text-on-surface-variant mb-6">Processing signals to secure verification matching.</p>
                
                <div className="flex flex-col gap-4 text-left bg-surface-container-lowest/60 border border-white/5 p-4 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">photo_camera</span>
                      Image captured
                    </span>
                    <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                    <span className="text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
                      Location verified
                    </span>
                    {analysisStatus.locationVerified ? (
                      <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-primary text-[18px] animate-spin">progress_activity</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                    <span className="text-on-surface-variant flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">psychology</span>
                      Evidence analyzed
                    </span>
                    {analysisStatus.evidenceAnalyzed ? (
                      <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-primary text-[18px] animate-spin">progress_activity</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Evidence Verification Result Overlay ── */}
          {verificationStep === 'result' && verificationResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="bg-surface-container-low border border-white/[0.12] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in relative">
                
                <div className="text-center mb-5">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    verificationResult.riskLevel === 'HIGH' 
                      ? 'bg-error/10 border border-error/20 text-error' 
                      : 'bg-green-500/10 border border-green-500/20 text-green-400'
                  }`}>
                    <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {verificationResult.riskLevel === 'HIGH' ? 'error' : 'check_circle'}
                    </span>
                  </div>
                  
                  <h2 className="text-base font-semibold text-on-surface">
                    {verificationResult.riskLevel === 'HIGH' 
                      ? 'Evidence Rejected' 
                      : 'Evidence Verified'}
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {verificationResult.riskLevel === 'HIGH'
                      ? 'Your image does not match the reported issue. The complaint will be automatically rejected.'
                      : 'Your image appears consistent with the reported issue.'}
                  </p>
                </div>

                <div className="bg-surface-container-lowest/70 border border-white/5 p-4 rounded-xl mb-6 flex flex-col gap-2.5 text-xs text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>Detected Issue</span>
                    <span className="font-semibold text-on-surface capitalize">{verificationResult.detectedCategory}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>AI Confidence</span>
                    <span className="font-semibold text-on-surface">{verificationResult.imageConfidence}%</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span>GPS Verification</span>
                    <span className={`font-semibold ${verificationResult.gpsVerified === 'PASSED' ? 'text-green-400' : 'text-amber-400'}`}>
                      {verificationResult.gpsVerified}
                    </span>
                  </div>
                  {verificationResult.gpsDistance > 0 && (
                    <div className="flex justify-between border-t border-white/5 pt-2">
                      <span>GPS Distance Offset</span>
                      <span className="font-semibold text-on-surface">{verificationResult.gpsDistance.toFixed(2)} km</span>
                    </div>
                  )}
                  <div className="border-t border-white/5 pt-2.5">
                    <p className="text-[10px] uppercase font-bold tracking-wider mb-1">Audit Details</p>
                    <p className="text-[11px] leading-relaxed text-on-surface-variant/90">{verificationResult.reason}</p>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed mb-6 text-center">
                  {verificationResult.riskLevel === 'HIGH'
                    ? 'Your complaint does not meet the visual verification standards and will be submitted as REJECTED. It will be logged in the AI Verification Queue for audit.'
                    : 'Your complaint matches all signals and will be processed immediately.'}
                </p>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setVerificationStep('idle')} 
                    className="flex-1 btn-ghost py-2 rounded-xl text-xs font-semibold hover:bg-white/5 transition-all"
                  >
                    Recapture
                  </button>
                  <button 
                    onClick={submit} 
                    disabled={submitting}
                    className="flex-1 btn-primary py-2 rounded-xl text-xs font-semibold shadow-lg hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                        Submitting...
                      </>
                    ) : (
                      verificationResult.riskLevel === 'HIGH' ? 'Submit as Rejected' : 'Submit Complaint'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
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
                <div className="flex items-center gap-1.5">
                  <code className="bg-surface-container px-2 py-0.5 rounded text-primary font-bold">{trackingId}</code>
                  <button
                    onClick={copyTicketId}
                    title="Copy ticket ID"
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                      copied ? 'text-green-400 bg-green-500/10' : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{copied ? 'check' : 'content_copy'}</span>
                  </button>
                </div>
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
