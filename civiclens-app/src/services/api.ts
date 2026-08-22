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
  estimatedSolutionDate?: string
  dispatchTime?: string
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

export type Worker = {
  id: string
  name: string
  role: 'OFFICER' | 'STAFF'
  department: string
  parentId?: string
  status: 'Active' | 'On Leave' | 'Busy'
  phone: string
  tasksCount: number
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

const DEFAULT_WORKERS: Worker[] = [
  // 1. Water Work and Drainage Department
  { id: 'OFF-01', name: 'A. Sharma', role: 'OFFICER', department: 'Water Work and Drainage Department', phone: '+91 98260 11111', status: 'Active', tasksCount: 1 },
  { id: 'STF-01-1', name: 'K. Rawat', role: 'STAFF', department: 'Water Work and Drainage Department', parentId: 'OFF-01', phone: '+91 98260 11112', status: 'Active', tasksCount: 0 },
  { id: 'STF-01-2', name: 'J. Patel', role: 'STAFF', department: 'Water Work and Drainage Department', parentId: 'OFF-01', phone: '+91 98260 11113', status: 'Active', tasksCount: 0 },
  { id: 'STF-01-3', name: 'P. Verma', role: 'STAFF', department: 'Water Work and Drainage Department', parentId: 'OFF-01', phone: '+91 98260 11114', status: 'On Leave', tasksCount: 0 },

  // 2. Public Work Department
  { id: 'OFF-02', name: 'R. Mehta', role: 'OFFICER', department: 'Public Work Department', phone: '+91 98260 22222', status: 'Active', tasksCount: 0 },
  { id: 'STF-02-1', name: 'M. Singh', role: 'STAFF', department: 'Public Work Department', parentId: 'OFF-02', phone: '+91 98260 22223', status: 'Active', tasksCount: 1 },
  { id: 'STF-02-2', name: 'S. Yadav', role: 'STAFF', department: 'Public Work Department', parentId: 'OFF-02', phone: '+91 98260 22224', status: 'Active', tasksCount: 0 },
  { id: 'STF-02-3', name: 'K. Chouhan', role: 'STAFF', department: 'Public Work Department', parentId: 'OFF-02', phone: '+91 98260 22225', status: 'Busy', tasksCount: 0 },

  // 3. Health Department (Sanitation and Solid Waste Management)
  { id: 'OFF-03', name: 'Dr. A. Saxena', role: 'OFFICER', department: 'Health Department (Sanitation and Solid Waste Management)', phone: '+91 98260 33333', status: 'Active', tasksCount: 0 },
  { id: 'STF-03-1', name: 'D. Mishra', role: 'STAFF', department: 'Health Department (Sanitation and Solid Waste Management)', parentId: 'OFF-03', phone: '+91 98260 33334', status: 'Active', tasksCount: 0 },
  { id: 'STF-03-2', name: 'S. Choudhary', role: 'STAFF', department: 'Health Department (Sanitation and Solid Waste Management)', parentId: 'OFF-03', phone: '+91 98260 33335', status: 'Active', tasksCount: 0 },
  { id: 'STF-03-3', name: 'R. Solanki', role: 'STAFF', department: 'Health Department (Sanitation and Solid Waste Management)', parentId: 'OFF-03', phone: '+91 98260 33336', status: 'Busy', tasksCount: 0 },

  // 4. Electrical and Mechanical Department
  { id: 'OFF-04', name: 'H. Pathak', role: 'OFFICER', department: 'Electrical and Mechanical Department', phone: '+91 98260 44444', status: 'Active', tasksCount: 0 },
  { id: 'STF-04-1', name: 'N. Gehlot', role: 'STAFF', department: 'Electrical and Mechanical Department', parentId: 'OFF-04', phone: '+91 98260 44445', status: 'Active', tasksCount: 0 },
  { id: 'STF-04-2', name: 'T. Joshi', role: 'STAFF', department: 'Electrical and Mechanical Department', parentId: 'OFF-04', phone: '+91 98260 44446', status: 'Active', tasksCount: 0 },
  { id: 'STF-04-3', name: 'V. Sen', role: 'STAFF', department: 'Electrical and Mechanical Department', parentId: 'OFF-04', phone: '+91 98260 44447', status: 'On Leave', tasksCount: 0 },

  // 5. Fire Department
  { id: 'OFF-05', name: 'F. Khan', role: 'OFFICER', department: 'Fire Department', phone: '+91 98260 55555', status: 'Active', tasksCount: 0 },
  { id: 'STF-05-1', name: 'A. Qureshi', role: 'STAFF', department: 'Fire Department', parentId: 'OFF-05', phone: '+91 98260 55556', status: 'Active', tasksCount: 0 },
  { id: 'STF-05-2', name: 'Z. Ahmed', role: 'STAFF', department: 'Fire Department', parentId: 'OFF-05', phone: '+91 98260 55557', status: 'Active', tasksCount: 0 },
  { id: 'STF-05-3', name: 'S. Sheikh', role: 'STAFF', department: 'Fire Department', parentId: 'OFF-05', phone: '+91 98260 55558', status: 'Active', tasksCount: 0 },

  // 6. Revenue Department
  { id: 'OFF-06', name: 'S. Deshpande', role: 'OFFICER', department: 'Revenue Department', phone: '+91 98260 66666', status: 'Active', tasksCount: 0 },
  { id: 'STF-06-1', name: 'P. Joshi', role: 'STAFF', department: 'Revenue Department', parentId: 'OFF-06', phone: '+91 98260 66667', status: 'Active', tasksCount: 0 },
  { id: 'STF-06-2', name: 'M. Kulkarni', role: 'STAFF', department: 'Revenue Department', parentId: 'OFF-06', phone: '+91 98260 66668', status: 'Active', tasksCount: 0 },
  { id: 'STF-06-3', name: 'A. Shinde', role: 'STAFF', department: 'Revenue Department', parentId: 'OFF-06', phone: '+91 98260 66669', status: 'Active', tasksCount: 0 },

  // 7. Information Technology Department
  { id: 'OFF-07', name: 'T. Srinivas', role: 'OFFICER', department: 'Information Technology Department', phone: '+91 98260 77777', status: 'Active', tasksCount: 0 },
  { id: 'STF-07-1', name: 'R. Nair', role: 'STAFF', department: 'Information Technology Department', parentId: 'OFF-07', phone: '+91 98260 77778', status: 'Active', tasksCount: 0 },
  { id: 'STF-07-2', name: 'S. Pillai', role: 'STAFF', department: 'Information Technology Department', parentId: 'OFF-07', phone: '+91 98260 77779', status: 'Active', tasksCount: 0 },
  { id: 'STF-07-3', name: 'V. Menon', role: 'STAFF', department: 'Information Technology Department', parentId: 'OFF-07', phone: '+91 98260 77780', status: 'Active', tasksCount: 0 },

  // 8. Housing & Environmental Department
  { id: 'OFF-08', name: 'V. Chaturvedi', role: 'OFFICER', department: 'Housing & Environmental Department', phone: '+91 98260 88888', status: 'Active', tasksCount: 0 },
  { id: 'STF-08-1', name: 'R. Tiwari', role: 'STAFF', department: 'Housing & Environmental Department', parentId: 'OFF-08', phone: '+91 98260 88889', status: 'Active', tasksCount: 0 },
  { id: 'STF-08-2', name: 'A. Dwivedi', role: 'STAFF', department: 'Housing & Environmental Department', parentId: 'OFF-08', phone: '+91 98260 88890', status: 'Active', tasksCount: 0 },
  { id: 'STF-08-3', name: 'G. Pandey', role: 'STAFF', department: 'Housing & Environmental Department', parentId: 'OFF-08', phone: '+91 98260 88891', status: 'Active', tasksCount: 0 },

  // 9. Food and Civil Supplies Department
  { id: 'OFF-09', name: 'S. Mittal', role: 'OFFICER', department: 'Food and Civil Supplies Department', phone: '+91 98260 99999', status: 'Active', tasksCount: 0 },
  { id: 'STF-09-1', name: 'P. Bansal', role: 'STAFF', department: 'Food and Civil Supplies Department', parentId: 'OFF-09', phone: '+91 98260 99991', status: 'Active', tasksCount: 0 },
  { id: 'STF-09-2', name: 'A. Gupta', role: 'STAFF', department: 'Food and Civil Supplies Department', parentId: 'OFF-09', phone: '+91 98260 99992', status: 'Active', tasksCount: 0 },
  { id: 'STF-09-3', name: 'M. Garg', role: 'STAFF', department: 'Food and Civil Supplies Department', parentId: 'OFF-09', phone: '+91 98260 99993', status: 'Active', tasksCount: 0 },

  // 10. Education Department
  { id: 'OFF-10', name: 'M. Sahu', role: 'OFFICER', department: 'Education Department', phone: '+91 98260 10101', status: 'Active', tasksCount: 0 },
  { id: 'STF-10-1', name: 'K. Rathore', role: 'STAFF', department: 'Education Department', parentId: 'OFF-10', phone: '+91 98260 10102', status: 'Active', tasksCount: 0 },
  { id: 'STF-10-2', name: 'D. Sisodia', role: 'STAFF', department: 'Education Department', parentId: 'OFF-10', phone: '+91 98260 10103', status: 'Active', tasksCount: 0 },
  { id: 'STF-10-3', name: 'N. Rajput', role: 'STAFF', department: 'Education Department', parentId: 'OFF-10', phone: '+91 98260 10104', status: 'Active', tasksCount: 0 },

  // 11. Law and General Administration Department
  { id: 'OFF-11', name: 'Adv. R. C. Joshi', role: 'OFFICER', department: 'Law and General Administration Department', phone: '+91 98260 20202', status: 'Active', tasksCount: 0 },
  { id: 'STF-11-1', name: 'P. Dube', role: 'STAFF', department: 'Law and General Administration Department', parentId: 'OFF-11', phone: '+91 98260 20203', status: 'Active', tasksCount: 0 },
  { id: 'STF-11-2', name: 'A. Bhargava', role: 'STAFF', department: 'Law and General Administration Department', parentId: 'OFF-11', phone: '+91 98260 20204', status: 'Active', tasksCount: 0 },
  { id: 'STF-11-3', name: 'J. Tripathi', role: 'STAFF', department: 'Law and General Administration Department', parentId: 'OFF-11', phone: '+91 98260 20205', status: 'Active', tasksCount: 0 },

  // 12. Planning & Rehabilitation Department
  { id: 'OFF-12', name: 'K. Vijayvargiya', role: 'OFFICER', department: 'Planning & Rehabilitation Department', phone: '+91 98260 30303', status: 'Active', tasksCount: 0 },
  { id: 'STF-12-1', name: 'S. Patidar', role: 'STAFF', department: 'Planning & Rehabilitation Department', parentId: 'OFF-12', phone: '+91 98260 30304', status: 'Active', tasksCount: 0 },
  { id: 'STF-12-2', name: 'Y. Chouhan', role: 'STAFF', department: 'Planning & Rehabilitation Department', parentId: 'OFF-12', phone: '+91 98260 30305', status: 'Active', tasksCount: 0 },
  { id: 'STF-12-3', name: 'L. Raghuvanshi', role: 'STAFF', department: 'Planning & Rehabilitation Department', parentId: 'OFF-12', phone: '+91 98260 30306', status: 'Active', tasksCount: 0 },

  // 13. Accounts Department
  { id: 'OFF-13', name: 'CA R. Jaiswal', role: 'OFFICER', department: 'Accounts Department', phone: '+91 98260 40404', status: 'Active', tasksCount: 0 },
  { id: 'STF-13-1', name: 'A. Agrawal', role: 'STAFF', department: 'Accounts Department', parentId: 'OFF-13', phone: '+91 98260 40405', status: 'Active', tasksCount: 0 },
  { id: 'STF-13-2', name: 'S. Maheshwari', role: 'STAFF', department: 'Accounts Department', parentId: 'OFF-13', phone: '+91 98260 40406', status: 'Active', tasksCount: 0 },
  { id: 'STF-13-3', name: 'R. Porwal', role: 'STAFF', department: 'Accounts Department', parentId: 'OFF-13', phone: '+91 98260 40407', status: 'Active', tasksCount: 0 },

  // 14. Removal Department
  { id: 'OFF-14', name: 'R. Verma', role: 'OFFICER', department: 'Removal Department', phone: '+91 98260 50505', status: 'Active', tasksCount: 0 },
  { id: 'STF-14-1', name: 'G. Kushwah', role: 'STAFF', department: 'Removal Department', parentId: 'OFF-14', phone: '+91 98260 50506', status: 'Active', tasksCount: 0 },
  { id: 'STF-14-2', name: 'P. Malviya', role: 'STAFF', department: 'Removal Department', parentId: 'OFF-14', phone: '+91 98260 50507', status: 'Active', tasksCount: 0 },
  { id: 'STF-14-3', name: 'J. Solanki', role: 'STAFF', department: 'Removal Department', parentId: 'OFF-14', phone: '+91 98260 50508', status: 'Active', tasksCount: 0 },

  // 15. Zoo Department
  { id: 'OFF-15', name: 'Dr. N. Yadav', role: 'OFFICER', department: 'Zoo Department', phone: '+91 98260 60606', status: 'Active', tasksCount: 0 },
  { id: 'STF-15-1', name: 'A. Malviya', role: 'STAFF', department: 'Zoo Department', parentId: 'OFF-15', phone: '+91 98260 60607', status: 'Active', tasksCount: 0 },
  { id: 'STF-15-2', name: 'R. Mewada', role: 'STAFF', department: 'Zoo Department', parentId: 'OFF-15', phone: '+91 98260 60608', status: 'Active', tasksCount: 0 },
  { id: 'STF-15-3', name: 'D. Bhalerao', role: 'STAFF', department: 'Zoo Department', parentId: 'OFF-15', phone: '+91 98260 60609', status: 'Active', tasksCount: 0 },

  // 16. Garden Department & Regional Park
  { id: 'OFF-16', name: 'M. Chouhan', role: 'OFFICER', department: 'Garden Department & Regional Park', phone: '+91 98260 70707', status: 'Active', tasksCount: 0 },
  { id: 'STF-16-1', name: 'S. Panwar', role: 'STAFF', department: 'Garden Department & Regional Park', parentId: 'OFF-16', phone: '+91 98260 70708', status: 'Active', tasksCount: 0 },
  { id: 'STF-16-2', name: 'R. Thakur', role: 'STAFF', department: 'Garden Department & Regional Park', parentId: 'OFF-16', phone: '+91 98260 70709', status: 'Active', tasksCount: 0 },
  { id: 'STF-16-3', name: 'L. Gehlot', role: 'STAFF', department: 'Garden Department & Regional Park', parentId: 'OFF-16', phone: '+91 98260 70710', status: 'Active', tasksCount: 0 },
]

// Helper function to cluster active complaints by area
function clusterComplaints(list: Complaint[]): Complaint[] {
  const activeList = list.filter(c => c.status !== 'RESOLVED' && c.status !== 'REJECTED' && c.status !== 'PENDING_VERIFICATION')
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
        // Merge Supabase data with localStorage to include newly added complaints
        // (which may not yet be in Supabase due to base64 size limits)
        const supabaseList = data || [];
        const local = localStorage.getItem('civiclens_complaints');
        const localList: Complaint[] = local ? JSON.parse(local) : [];
        
        // For complaints in Supabase, prefer Supabase data (more authoritative)
        const supabaseIds = new Set(supabaseList.map((c: any) => c.id));
        // Include local complaints not yet in Supabase, with full photoUrl
        const localOnly = localList.filter((c: Complaint) => !supabaseIds.has(c.id));
        list = [...supabaseList, ...localOnly];
      }
    } catch (e) {
      console.error('Database connection failed:', e);
      const local = localStorage.getItem('civiclens_complaints');
      list = local ? JSON.parse(local) : DEFAULT_COMPLAINTS;
    }

    // Merge with extended local storage metadata to show date/time overrides
    const extended = localStorage.getItem('civiclens_complaints_extended');
    const extendedMap = extended ? JSON.parse(extended) : {};
    // Also restore full photoUrl from localStorage for base64 images
    const local = localStorage.getItem('civiclens_complaints');
    const localList: Complaint[] = local ? JSON.parse(local) : [];
    const localPhotoMap = new Map(localList.map(c => [c.id, c.photoUrl]));
    
    const mergedList = list.map(c => ({
      ...c,
      ...(extendedMap[c.id] || {}),
      // Restore full base64 photoUrl from localStorage if Supabase has placeholder
      photoUrl: (!c.photoUrl || c.photoUrl === '') && localPhotoMap.has(c.id)
        ? localPhotoMap.get(c.id)
        : c.photoUrl
    }));

    return clusterComplaints(mergedList)
  },

  async addComplaint(
    complaint: Omit<Complaint, 'id' | 'date' | 'status' | 'slaRemaining' | 'slaTotal' | 'initials'> &
    { deviceLatitude?: number; deviceLongitude?: number; capturedAt?: string; initialStatus?: ComplaintStatus }
  ): Promise<Complaint> {
    const id = `#G-${Math.floor(1000 + Math.random() * 9000)}-${complaint.category.charAt(0).toUpperCase()}`
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    const dateStr = new Date().toLocaleDateString('en-US', options)

    // Use the pre-determined status from the frontend (AI was already run in the UI)
    // This avoids a second slow AI API call that blocks submission
    const initialStatus: ComplaintStatus = complaint.initialStatus || 'OPEN'

    const newComplaint: Complaint = {
      ...complaint,
      id,
      date: dateStr,
      status: initialStatus,
      slaRemaining: initialStatus === 'REJECTED'
        ? 'Rejected by AI'
        : initialStatus === 'PENDING_VERIFICATION'
          ? 'Awaiting Verification'
          : '23h 59m left',
      slaTotal: 'Limit: 24 hours',
      initials: complaint.assignee ? complaint.assignee.split(' ').map(n => n[0]).join('').toUpperCase() : ''
    }

    // Always save to localStorage FIRST so it appears immediately even if Supabase fails
    const localList = localStorage.getItem('civiclens_complaints')
      ? JSON.parse(localStorage.getItem('civiclens_complaints')!)
      : [...DEFAULT_COMPLAINTS];
    localList.unshift(newComplaint);
    localStorage.setItem('civiclens_complaints', JSON.stringify(localList));

    // Then save to Supabase (strip base64 photoUrl — too large for DB row)
    try {
      const supabasePayload = {
        ...newComplaint,
        photoUrl: newComplaint.photoUrl?.startsWith('data:')
          ? '' // store empty string; localStorage has the full image
          : (newComplaint.photoUrl || '')
      };
      const { error } = await supabase
        .from('complaints')
        .insert(supabasePayload);

      if (error) {
        console.error('Error saving complaint in Supabase:', error.message);
      }
    } catch (e) {
      console.error('Failed to insert into Supabase:', e);
    }

    const depts = this.getDepartments();
    const targetDept = depts.find(d => d.name.toLowerCase().includes(complaint.category.toLowerCase()) || complaint.category.toLowerCase().includes(d.name.toLowerCase()));
    if (targetDept && initialStatus === 'OPEN') {
      targetDept.activeIssues += 1;
      localStorage.setItem('civiclens_departments', JSON.stringify(depts));
    }

    return newComplaint;
  },

  async updateComplaint(id: string, updates: Partial<Complaint>): Promise<Complaint[]> {
    // Strip base64 photoUrl from DB updates too
    const dbUpdates = { ...updates };
    if (dbUpdates.photoUrl?.startsWith('data:')) {
      delete dbUpdates.photoUrl;
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('Error updating complaint in Supabase:', error.message);
      }
    } catch (e) {
      console.error('Failed to update Supabase complaint:', e);
    }

    // Save extended metadata locally
    if (updates.dispatchTime || updates.estimatedSolutionDate) {
      const extended = localStorage.getItem('civiclens_complaints_extended');
      const extendedMap = extended ? JSON.parse(extended) : {};
      extendedMap[id] = {
        ...(extendedMap[id] || {}),
        ...(updates.dispatchTime ? { dispatchTime: updates.dispatchTime } : {}),
        ...(updates.estimatedSolutionDate ? { estimatedSolutionDate: updates.estimatedSolutionDate } : {})
      };
      localStorage.setItem('civiclens_complaints_extended', JSON.stringify(extendedMap));
    }

    const localList = localStorage.getItem('civiclens_complaints') ? JSON.parse(localStorage.getItem('civiclens_complaints')!) : [...DEFAULT_COMPLAINTS];
    const index = localList.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      const original = localList[index];
      
      // Update department issues count on resolution
      if (updates.status === 'RESOLVED' && original.status !== 'RESOLVED') {
        const depts = this.getDepartments();
        const targetDept = depts.find(d => d.name.toLowerCase().includes(original.category.toLowerCase()) || original.category.toLowerCase().includes(d.name.toLowerCase()));
        if (targetDept) {
          targetDept.activeIssues = Math.max(0, targetDept.activeIssues - 1);
          localStorage.setItem('civiclens_departments', JSON.stringify(depts));
        }

        // Decrement task count of the assignee
        if (original.assignee) {
          const workers = this.getWorkers();
          const worker = workers.find(w => w.name.toLowerCase() === original.assignee.toLowerCase());
          if (worker) {
            worker.tasksCount = Math.max(0, worker.tasksCount - 1);
            localStorage.setItem('civiclens_workers', JSON.stringify(workers));
          }
        }
      }

      // Update worker tasks counts when assignee changes
      if (updates.assignee && updates.assignee !== original.assignee) {
        const newAssignee = updates.assignee;
        const workers = this.getWorkers();
        
        // Decrement old assignee if existed
        if (original.assignee) {
          const oldWorker = workers.find(w => w.name.toLowerCase() === original.assignee.toLowerCase());
          if (oldWorker) {
            oldWorker.tasksCount = Math.max(0, oldWorker.tasksCount - 1);
          }
        }

        // Increment new assignee
        const newWorker = workers.find(w => w.name.toLowerCase() === newAssignee.toLowerCase());
        if (newWorker) {
          newWorker.tasksCount += 1;
        }

        localStorage.setItem('civiclens_workers', JSON.stringify(workers));
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

  getWorkers(): Worker[] {
    const data = localStorage.getItem('civiclens_workers')
    if (!data || JSON.parse(data).length !== 64) {
      localStorage.setItem('civiclens_workers', JSON.stringify(DEFAULT_WORKERS))
      return DEFAULT_WORKERS
    }
    return JSON.parse(data)
  },

  getWorkersByDepartment(deptName: string): Worker[] {
    const list = this.getWorkers()
    return list.filter(w => w.department.toLowerCase() === deptName.toLowerCase())
  },

  updateWorker(id: string, updates: Partial<Worker>): Worker[] {
    const list = this.getWorkers()
    const index = list.findIndex(w => w.id === id)
    if (index !== -1) {
      list[index] = { ...list[index]!, ...updates }
      localStorage.setItem('civiclens_workers', JSON.stringify(list))
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
      
      const local = localStorage.getItem('civiclens_verifications');
      const localList: ComplaintVerification[] = local ? JSON.parse(local) : [];
      
      if (error || !data || data.length === 0) {
        console.warn('Supabase verifications unavailable, using localStorage:', error?.message);
        return localList;
      }
      
      // Merge: Supabase is authoritative, but fill in any local-only entries
      const supabaseIds = new Set(data.map((v: any) => v.complaintId));
      const localOnly = localList.filter(v => !supabaseIds.has(v.complaintId));
      return [...data, ...localOnly];
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
      // Don't store full base64 in DB - too large; store only photoUrl reference
      imageUrl: photoUrl.startsWith('data:') ? '[base64-captured]' : photoUrl,
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
  },

  async deleteComplaint(id: string): Promise<Complaint[]> {
    // Remove from Supabase
    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Error deleting complaint from Supabase:', error.message);
      }
    } catch (e) {
      console.error('Failed to delete from Supabase:', e);
    }

    // Remove from localStorage
    const localList = localStorage.getItem('civiclens_complaints');
    if (localList) {
      const parsed = JSON.parse(localList).filter((c: any) => c.id !== id);
      localStorage.setItem('civiclens_complaints', JSON.stringify(parsed));
    }

    // Also remove associated verification
    const localVers = localStorage.getItem('civiclens_verifications');
    if (localVers) {
      const parsed = JSON.parse(localVers).filter((v: any) => v.complaintId !== id);
      localStorage.setItem('civiclens_verifications', JSON.stringify(parsed));
    }

    // Remove from Supabase verifications
    try {
      await supabase.from('complaint_verifications').delete().eq('complaintId', id);
    } catch {}

    return this.getComplaints();
  }
}
