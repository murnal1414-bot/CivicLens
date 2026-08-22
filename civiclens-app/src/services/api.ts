import { supabase } from './supabase'
import { runVisionCheckAgent } from './ai'
import { VERIFICATION_CONFIG } from '../config/verification'

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM'
export type ComplaintStatus = 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'PENDING_VERIFICATION' | 'REJECTED'

export type Complaint = {
  id: string
  date: string
  category: string
  categoryIcon: string
  location: string
  density: 'High' | 'Med' | 'Low'
  priority: Priority
  status: ComplaintStatus
  slaRemaining: string
  slaTotal: string
  assignee: string
  initials: string
  description: string
  voiceUrl?: string
  photoUrl?: string
  citizenEmail?: string
  citizenPhone?: string
  latitude?: number
  longitude?: number
  capturedAt?: string // Camera capture timestamp
}

export type ComplaintVerification = {
  id: string
  complaintId: string
  imageUrl?: string
  detectedCategory?: string
  selectedCategory?: string
  imageConfidence?: number
  imageMatch?: boolean
  gpsVerified?: string // 'PASSED' | 'SUSPICIOUS' | 'UNAVAILABLE'
  gpsDistance?: number // distance in km
  timestampVerified?: boolean
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED'
  verificationReason?: string
  verifiedBy?: string
  verifiedAt?: string
  createdAt: string
}

export type Department = {
  id: string
  name: string
  icon: string
  activeIssues: number
  workersCount: number
  status: 'Active' | 'Under Review'
  avgFixTime: string
  onTimeRate: number
}

// Initial mock complaints
const DEFAULT_COMPLAINTS: Complaint[] = [
  { 
    id: '#G-4092-W', 
    date: 'Oct 24, 09:12 AM', 
    category: 'Water Work and Drainage Department', 
    categoryIcon: 'water_drop', 
    location: 'Vijay Nagar, Sec 54', 
    density: 'High', 
    priority: 'CRITICAL', 
    status: 'OPEN',
    slaRemaining: '1h 14m left', 
    slaTotal: 'Limit: 4 hours', 
    assignee: 'A. Sharma', 
    initials: 'AS',
    description: 'Main water pipe burst near Sector 54 water tank. High pressure water flooding the streets.'
  },
  { 
    id: '#G-4091-R', 
    date: 'Oct 24, 08:45 AM', 
    category: 'Public Work Department', 
    categoryIcon: 'construction', 
    location: 'Palasia Square', 
    density: 'Med', 
    priority: 'HIGH', 
    status: 'ASSIGNED',
    slaRemaining: '14h 20m left', 
    slaTotal: 'Limit: 24 hours', 
    assignee: 'R. Mehta', 
    initials: 'RM',
    description: 'Deep pothole in Palasia Square causing traffic jams and potential accidents.'
  },
  { 
    id: '#G-4088-S', 
    date: 'Oct 23, 11:30 PM', 
    category: 'Health Department (Sanitation and Solid Waste Management)', 
    categoryIcon: 'delete_forever', 
    location: 'Bhawarkuan', 
    density: 'Low', 
    priority: 'MEDIUM', 
    status: 'OPEN',
    slaRemaining: '32h 10m left', 
    slaTotal: 'Limit: 48 hours', 
    assignee: '', 
    initials: '',
    description: 'Garbage dump overflowing for two days near Bhawarkuan bus stand.'
  },
]

// Initial mock departments
const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'DEPT-01', name: 'Water Work and Drainage Department', icon: 'water_drop', activeIssues: 28, workersCount: 42, status: 'Active', avgFixTime: '2.5h', onTimeRate: 98 },
  { id: 'DEPT-02', name: 'Public Work Department', icon: 'construction', activeIssues: 64, workersCount: 85, status: 'Active', avgFixTime: '12h', onTimeRate: 75 },
  { id: 'DEPT-03', name: 'Health Department (Sanitation and Solid Waste Management)', icon: 'delete_forever', activeIssues: 82, workersCount: 120, status: 'Active', avgFixTime: '1.8h', onTimeRate: 96 },
  { id: 'DEPT-04', name: 'Electrical and Mechanical Department', icon: 'lightbulb', activeIssues: 19, workersCount: 22, status: 'Active', avgFixTime: '6.2h', onTimeRate: 88 },
  { id: 'DEPT-05', name: 'Fire Department', icon: 'local_fire_department', activeIssues: 3, workersCount: 50, status: 'Active', avgFixTime: '0.4h', onTimeRate: 100 },
  { id: 'DEPT-06', name: 'Revenue Department', icon: 'payments', activeIssues: 7, workersCount: 10, status: 'Active', avgFixTime: '24h', onTimeRate: 95 },
  { id: 'DEPT-07', name: 'Information Technology Department', icon: 'computer', activeIssues: 4, workersCount: 8, status: 'Active', avgFixTime: '1.2h', onTimeRate: 98 },
  { id: 'DEPT-08', name: 'Housing & Environmental Department', icon: 'apartment', activeIssues: 15, workersCount: 18, status: 'Under Review', avgFixTime: '36h', onTimeRate: 70 },
  { id: 'DEPT-09', name: 'Food and Civil Supplies Department', icon: 'shopping_bag', activeIssues: 2, workersCount: 6, status: 'Active', avgFixTime: '8h', onTimeRate: 92 },
  { id: 'DEPT-10', name: 'Education Department', icon: 'school', activeIssues: 5, workersCount: 12, status: 'Active', avgFixTime: '15h', onTimeRate: 94 },
  { id: 'DEPT-11', name: 'Law and General Administration Department', icon: 'balance', activeIssues: 8, workersCount: 15, status: 'Active', avgFixTime: '72h', onTimeRate: 85 },
  { id: 'DEPT-12', name: 'Planning & Rehabilitation Department', icon: 'engineering', activeIssues: 6, workersCount: 18, status: 'Active', avgFixTime: '48h', onTimeRate: 89 },
  { id: 'DEPT-13', name: 'Accounts Department', icon: 'account_balance_wallet', activeIssues: 4, workersCount: 10, status: 'Active', avgFixTime: '24h', onTimeRate: 93 },
  { id: 'DEPT-14', name: 'Removal Department', icon: 'delete_sweep', activeIssues: 9, workersCount: 20, status: 'Active', avgFixTime: '12h', onTimeRate: 91 },
  { id: 'DEPT-15', name: 'Zoo Department', icon: 'pets', activeIssues: 3, workersCount: 15, status: 'Active', avgFixTime: '6h', onTimeRate: 97 },
  { id: 'DEPT-16', name: 'Garden Department & Regional Park', icon: 'forest', activeIssues: 12, workersCount: 14, status: 'Active', avgFixTime: '18h', onTimeRate: 90 },
]

// Helper function to cluster active complaints by area
function clusterComplaints(list: Complaint[]): Complaint[] {
  const activeList = list.filter(c => c.status !== 'RESOLVED')
  const clusters: Complaint[][] = []

  for (const c of activeList) {
    let added = false
    for (const cl of clusters) {
      if (cl.some(item => {
        if (item.latitude && item.longitude && c.latitude && c.longitude) {
          return Math.hypot(item.latitude - c.latitude, item.longitude - c.longitude) < 0.008
        }
        const loc1 = item.location.toLowerCase()
        const loc2 = c.location.toLowerCase()
        const clean = (s: string) => s.split(',')[0].trim().split(' ')[0]
        const w1 = clean(loc1)
        const w2 = clean(loc2)
        if (w1 && w2 && w1.length > 2 && w2.length > 2) {
          return w1 === w2 || loc1.includes(w2) || loc2.includes(w1)
        }
        return loc1 === loc2
      })) {
        cl.push(c)
        added = true
        break
      }
    }
    if (!added) {
      clusters.push([c])
    }
  }

  const clusterMap = new Map<string, { size: number; priority: Priority; displayLocation: string }>()
  for (const cl of clusters) {
    if (cl.length >= 4) {
      const count = cl.length
      const mainLocation = cl[0].location.replace(/^🚨\s*\[MAJOR CLUSTER[^\]]*\]\s*/, '')
      for (const c of cl) {
        clusterMap.set(c.id, {
          size: count,
          priority: 'CRITICAL',
          displayLocation: `🚨 [MAJOR CLUSTER - ${count} Reports] ${mainLocation}`
        })
      }
    }
  }

  const officialCategoryMapping: Record<string, string> = {
    'water': 'Water Work and Drainage Department',
    'drain': 'Water Work and Drainage Department',
    'sanitat': 'Health Department (Sanitation and Solid Waste Management)',
    'health': 'Health Department (Sanitation and Solid Waste Management)',
    'waste': 'Health Department (Sanitation and Solid Waste Management)',
    'streetlight': 'Electrical and Mechanical Department',
    'electric': 'Electrical and Mechanical Department',
    'mechanical': 'Electrical and Mechanical Department',
    'road': 'Public Work Department',
    'public work': 'Public Work Department',
    'park': 'Garden Department & Regional Park',
    'garden': 'Garden Department & Regional Park',
    'fire': 'Fire Department',
    'revenue': 'Revenue Department',
    'it': 'Information Technology Department',
    'information': 'Information Technology Department',
    'housing': 'Housing & Environmental Department',
    'supply': 'Food and Civil Supplies Department',
    'food': 'Food and Civil Supplies Department',
    'education': 'Education Department',
    'school': 'Education Department',
    'law': 'Law and General Administration Department',
    'admin': 'Law and General Administration Department',
    'planning': 'Planning & Rehabilitation Department',
    'rehab': 'Planning & Rehabilitation Department',
    'account': 'Accounts Department',
    'audit': 'Accounts Department',
    'removal': 'Removal Department',
    'encroach': 'Removal Department',
    'zoo': 'Zoo Department',
  }

  return list.map(c => {
    const catLower = c.category.toLowerCase()
    let mappedCategory = c.category
    for (const [keyword, officialName] of Object.entries(officialCategoryMapping)) {
      if (catLower.includes(keyword)) {
        mappedCategory = officialName
        break
      }
    }

    const info = clusterMap.get(c.id)
    if (info) {
      return {
        ...c,
        category: mappedCategory,
        priority: info.priority,
        location: info.displayLocation,
        slaRemaining: 'Immediate action required',
        slaTotal: `Cluster: ${info.size} active reports`
      }
    }
    return {
      ...c,
      category: mappedCategory
    }
  })
}

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

export const civiclensApi = {
  async getComplaints(): Promise<Complaint[]> {
    let list: Complaint[] = []
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching complaints from Supabase:', error.message);
        const local = localStorage.getItem('civiclens_complaints');
        list = local ? JSON.parse(local) : DEFAULT_COMPLAINTS;
      } else {
        list = data || [];
      }
    } catch (e) {
      console.error('Database connection failed:', e);
      const local = localStorage.getItem('civiclens_complaints');
      list = local ? JSON.parse(local) : DEFAULT_COMPLAINTS;
    }
    return clusterComplaints(list)
  },

  async addComplaint(complaint: Omit<Complaint, 'id' | 'date' | 'status' | 'slaRemaining' | 'slaTotal' | 'initials'> & { deviceLatitude?: number; deviceLongitude?: number; capturedAt?: string }): Promise<Complaint> {
    const id = `#G-${Math.floor(1000 + Math.random() * 9000)}-${complaint.category.charAt(0).toUpperCase()}`
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    const dateStr = new Date().toLocaleDateString('en-US', options)

    // 1. Synchronously execute AI verification to determine initial risk & status
    let initialStatus: ComplaintStatus = 'OPEN'
    let verification: ComplaintVerification | null = null

    if (complaint.photoUrl) {
      try {
        verification = await this.verifyComplaintEvidence(
          id,
          complaint.category,
          complaint.description,
          complaint.photoUrl,
          complaint.latitude,
          complaint.longitude,
          complaint.deviceLatitude,
          complaint.deviceLongitude,
          complaint.capturedAt
        )
        if (verification.riskLevel === 'HIGH') {
          initialStatus = 'PENDING_VERIFICATION'
        }
      } catch (e) {
        console.error("AI Evidence Verification failed, placing in review queue:", e)
        initialStatus = 'PENDING_VERIFICATION'
      }
    }

    const newComplaint: Complaint = {
      ...complaint,
      id,
      date: dateStr,
      status: initialStatus,
      slaRemaining: initialStatus === 'PENDING_VERIFICATION' ? 'Awaiting Verification' : '23h 59m left',
      slaTotal: 'Limit: 24 hours',
      initials: complaint.assignee ? complaint.assignee.split(' ').map(n => n[0]).join('').toUpperCase() : ''
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .insert(newComplaint);

      if (error) {
        console.error('Error saving complaint in Supabase:', error.message);
      }
    } catch (e) {
      console.error('Failed to insert into Supabase:', e);
    }

    const localList = localStorage.getItem('civiclens_complaints') ? JSON.parse(localStorage.getItem('civiclens_complaints')!) : [...DEFAULT_COMPLAINTS];
    localList.unshift(newComplaint);
    localStorage.setItem('civiclens_complaints', JSON.stringify(localList));

    const depts = this.getDepartments();
    const targetDept = depts.find(d => d.name.toLowerCase().includes(complaint.category.toLowerCase()) || complaint.category.toLowerCase().includes(d.name.toLowerCase()));
    if (targetDept && initialStatus === 'OPEN') {
      targetDept.activeIssues += 1;
      localStorage.setItem('civiclens_departments', JSON.stringify(depts));
    }

    return newComplaint;
  },

  async updateComplaint(id: string, updates: Partial<Complaint>): Promise<Complaint[]> {
    try {
      const { error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating complaint in Supabase:', error.message);
      }
    } catch (e) {
      console.error('Failed to update Supabase complaint:', e);
    }

    const localList = localStorage.getItem('civiclens_complaints') ? JSON.parse(localStorage.getItem('civiclens_complaints')!) : [...DEFAULT_COMPLAINTS];
    const index = localList.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      const original = localList[index];
      if (updates.status === 'RESOLVED' && original.status !== 'RESOLVED') {
        const depts = this.getDepartments();
        const targetDept = depts.find(d => d.name.toLowerCase().includes(original.category.toLowerCase()) || original.category.toLowerCase().includes(d.name.toLowerCase()));
        if (targetDept) {
          targetDept.activeIssues = Math.max(0, targetDept.activeIssues - 1);
          localStorage.setItem('civiclens_departments', JSON.stringify(depts));
        }
      }

      localList[index] = { ...original, ...updates };
      localStorage.setItem('civiclens_complaints', JSON.stringify(localList));
    }

    return this.getComplaints();
  },

  getDepartments(): Department[] {
    const data = localStorage.getItem('civiclens_departments')
    if (!data || JSON.parse(data).length !== 16 || JSON.parse(data)[0]?.name !== 'Water Work and Drainage Department') {
      localStorage.setItem('civiclens_departments', JSON.stringify(DEFAULT_DEPARTMENTS))
      return DEFAULT_DEPARTMENTS
    }
    return JSON.parse(data)
  },

  updateDepartment(id: string, updates: Partial<Department>): Department[] {
    const list = this.getDepartments()
    const index = list.findIndex(d => d.id === id)
    if (index !== -1) {
      list[index] = { ...list[index]!, ...updates }
      localStorage.setItem('civiclens_departments', JSON.stringify(list))
    }
    return list
  },

  async getKpis() {
    const list = await this.getComplaints()
    const total = list.length
    const open = list.filter(c => c.status !== 'RESOLVED').length
    const resolved = list.filter(c => c.status === 'RESOLVED').length
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 100

    return {
      total,
      open,
      resolved,
      slaComplianceRate: `${Math.max(90, Math.min(99, 90 + (rate / 10)))}%`
    }
  },

  // ── AI Verification Queue APIs ───────────────────────────────────────────
  async getVerifications(): Promise<ComplaintVerification[]> {
    try {
      const { data, error } = await supabase
        .from('complaint_verifications')
        .select('*');
      if (error) {
        console.error('Error fetching verifications:', error.message);
        const local = localStorage.getItem('civiclens_verifications');
        return local ? JSON.parse(local) : [];
      }
      return data || [];
    } catch (e) {
      const local = localStorage.getItem('civiclens_verifications');
      return local ? JSON.parse(local) : [];
    }
  },

  async getVerificationForComplaint(complaintId: string): Promise<ComplaintVerification | null> {
    try {
      const { data, error } = await supabase
        .from('complaint_verifications')
        .select('*')
        .eq('complaintId', complaintId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching single verification:', error.message);
        const local = localStorage.getItem('civiclens_verifications');
        const list = local ? JSON.parse(local) : [];
        return list.find((v: any) => v.complaintId === complaintId) || null;
      }
      if (data) return data;
      const local = localStorage.getItem('civiclens_verifications');
      const list = local ? JSON.parse(local) : [];
      return list.find((v: any) => v.complaintId === complaintId) || null;
    } catch (e) {
      const local = localStorage.getItem('civiclens_verifications');
      const list = local ? JSON.parse(local) : [];
      return list.find((v: any) => v.complaintId === complaintId) || null;
    }
  },

  async saveVerification(verification: ComplaintVerification): Promise<void> {
    try {
      const { error } = await supabase
        .from('complaint_verifications')
        .insert(verification);
      if (error) {
        console.error('Error inserting verification:', error.message);
      }
    } catch (e) {
      console.error('Supabase verification save failed:', e);
    }
    const local = localStorage.getItem('civiclens_verifications');
    const list = local ? JSON.parse(local) : [];
    list.push(verification);
    localStorage.setItem('civiclens_verifications', JSON.stringify(list));
  },

  async updateVerification(complaintId: string, updates: Partial<ComplaintVerification>): Promise<void> {
    try {
      const { error } = await supabase
        .from('complaint_verifications')
        .update(updates)
        .eq('complaintId', complaintId);
      if (error) {
        console.error('Error updating verification:', error.message);
      }
    } catch (e) {
      console.error('Supabase verification update failed:', e);
    }
    const local = localStorage.getItem('civiclens_verifications');
    if (local) {
      const list = JSON.parse(local);
      const idx = list.findIndex((v: any) => v.complaintId === complaintId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem('civiclens_verifications', JSON.stringify(list));
      }
    }
  },

  async verifyComplaintEvidence(
    complaintId: string,
    category: string,
    description: string,
    photoUrl: string,
    pinnedLat?: number,
    pinnedLng?: number,
    deviceLat?: number,
    deviceLng?: number,
    capturedAt?: string
  ): Promise<ComplaintVerification> {
    // 1. Run AI Vision Auditor
    let aiRes;
    try {
      aiRes = await runVisionCheckAgent(photoUrl, description, category);
    } catch (e) {
      console.error('AI verification failed, falling back:', e);
      aiRes = {
        detectedIssue: category.toLowerCase().split(' ')[0] || "civic issue",
        isMatch: true,
        matchPercentage: Math.round(VERIFICATION_CONFIG.AI_API_FALLBACK_CONFIDENCE * 100),
        explanation: "Verification service temporarily offline. Scheduled for manual check.",
        riskLevel: "MEDIUM" as const
      };
    }

    // 2. Validate GPS coordinates (Pinned Map Location vs Device Captured Location)
    let gpsVerified: 'PASSED' | 'SUSPICIOUS' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let gpsDistance = 0;
    if (pinnedLat && pinnedLng && deviceLat && deviceLng) {
      gpsDistance = getOrthoDistanceKm(pinnedLat, pinnedLng, deviceLat, deviceLng);
      if (gpsDistance <= VERIFICATION_CONFIG.ACCEPTABLE_GPS_DISTANCE_KM) {
        gpsVerified = 'PASSED';
      } else {
        gpsVerified = 'SUSPICIOUS';
      }
    }

    // 3. Validate capture timestamp
    let timestampVerified = true;
    if (capturedAt) {
      const captureTime = new Date(capturedAt).getTime();
      const now = Date.now();
      const hoursDiff = (now - captureTime) / (1000 * 60 * 60);
      if (hoursDiff < -1 || hoursDiff > 24) {
        timestampVerified = false;
      }
    }

    // 4. Check for duplicate complaints
    let isDuplicate = false;
    try {
      const allComplaints = await this.getComplaints();
      const duplicates = allComplaints.filter(c => {
        if (c.id === complaintId || c.status === 'RESOLVED' || c.status === 'REJECTED') return false;
        if (c.category !== category) return false;
        if (c.latitude && c.longitude && pinnedLat && pinnedLng) {
          const dist = getOrthoDistanceKm(c.latitude, c.longitude, pinnedLat, pinnedLng);
          return dist < 0.5; // within 500m
        }
        return false;
      });
      isDuplicate = duplicates.length > 0;
    } catch (e) {
      console.error("Duplicate check failed:", e);
    }

    // 5. Calculate overall risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let verificationReason = aiRes.explanation;

    if (!aiRes.isMatch || aiRes.matchPercentage < VERIFICATION_CONFIG.CONFIDENCE_LOW_THRESHOLD * 100) {
      riskLevel = 'HIGH';
      verificationReason = `AI match check failed: ${aiRes.explanation}`;
    } else if (gpsVerified === 'SUSPICIOUS' && gpsDistance > 5.0) {
      riskLevel = 'HIGH';
      verificationReason = `Severe location mismatch: Reported and actual camera coordinates are ${gpsDistance.toFixed(1)} km apart.`;
    } else if (aiRes.matchPercentage < VERIFICATION_CONFIG.CONFIDENCE_HIGH_THRESHOLD * 100) {
      riskLevel = 'MEDIUM';
      verificationReason = `Moderate AI confidence (${aiRes.matchPercentage}%): ${aiRes.explanation}`;
    } else if (gpsVerified === 'SUSPICIOUS') {
      riskLevel = 'MEDIUM';
      verificationReason = `GPS location mismatch: Reported and camera coordinates are ${gpsDistance.toFixed(1)} km apart.`;
    } else if (!timestampVerified) {
      riskLevel = 'MEDIUM';
      verificationReason = "Image capture timestamp is invalid or older than 24 hours.";
    } else if (isDuplicate) {
      riskLevel = 'MEDIUM';
      verificationReason = "Potential duplicate: another active complaint of the same type exists nearby.";
    }

    // 6. Create verification record
    const verification: ComplaintVerification = {
      id: `VR-${Math.floor(1000 + Math.random() * 9000)}`,
      complaintId,
      imageUrl: photoUrl,
      detectedCategory: aiRes.detectedIssue,
      selectedCategory: category,
      imageConfidence: aiRes.matchPercentage / 100,
      imageMatch: aiRes.isMatch,
      gpsVerified,
      gpsDistance,
      timestampVerified,
      riskLevel,
      verificationStatus: 'PENDING',
      verificationReason,
      createdAt: new Date().toISOString()
    };

    await this.saveVerification(verification);
    return verification;
  },

  async acceptComplaint(id: string, officerName: string): Promise<Complaint[]> {
    const complaints = await this.getComplaints();
    const complaint = complaints.find(c => c.id === id);
    if (complaint && complaint.status === 'PENDING_VERIFICATION') {
      await this.updateComplaint(id, { status: 'OPEN', slaRemaining: '23h 59m left' });
      const depts = this.getDepartments();
      const targetDept = depts.find(d => d.name.toLowerCase().includes(complaint.category.toLowerCase()) || complaint.category.toLowerCase().includes(d.name.toLowerCase()));
      if (targetDept) {
        targetDept.activeIssues += 1;
        localStorage.setItem('civiclens_departments', JSON.stringify(depts));
      }
      await this.updateVerification(id, {
        verificationStatus: 'VERIFIED',
        verifiedBy: officerName,
        verifiedAt: new Date().toISOString()
      });
    }
    return this.getComplaints();
  },

  async rejectComplaint(id: string, officerName: string, reason: string): Promise<Complaint[]> {
    const complaints = await this.getComplaints();
    const complaint = complaints.find(c => c.id === id);
    if (complaint) {
      await this.updateComplaint(id, { status: 'REJECTED', slaRemaining: 'Rejected' });
      if (complaint.status === 'OPEN') {
        const depts = this.getDepartments();
        const targetDept = depts.find(d => d.name.toLowerCase().includes(complaint.category.toLowerCase()) || complaint.category.toLowerCase().includes(d.name.toLowerCase()));
        if (targetDept) {
          targetDept.activeIssues = Math.max(0, targetDept.activeIssues - 1);
          localStorage.setItem('civiclens_departments', JSON.stringify(depts));
        }
      }
      await this.updateVerification(id, {
        verificationStatus: 'REJECTED',
        verificationReason: reason,
        verifiedBy: officerName,
        verifiedAt: new Date().toISOString()
      });
    }
    return this.getComplaints();
  },

  async requestMoreInfo(id: string, officerName: string): Promise<Complaint[]> {
    const complaints = await this.getComplaints();
    const complaint = complaints.find(c => c.id === id);
    if (complaint) {
      await this.updateVerification(id, {
        verificationStatus: 'PENDING',
        verificationReason: 'Officer requested additional information or higher-quality evidence.',
        verifiedBy: officerName,
        verifiedAt: new Date().toISOString()
      });
    }
    return this.getComplaints();
  }
}
