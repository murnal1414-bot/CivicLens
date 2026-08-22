export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM'
export type ComplaintStatus = 'OPEN' | 'ASSIGNED' | 'RESOLVED'

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
    category: 'Water Supply', 
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
    category: 'Roads & Public Works', 
    categoryIcon: 'add_road', 
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
    category: 'Sanitation & Waste', 
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
  { id: 'DEPT-01', name: 'Water Supply', icon: 'water_drop', activeIssues: 28, workersCount: 42, status: 'Active', avgFixTime: '2.5h', onTimeRate: 98 },
  { id: 'DEPT-02', name: 'Drainage & Sewerage', icon: 'waves', activeIssues: 45, workersCount: 35, status: 'Active', avgFixTime: '4.1h', onTimeRate: 82 },
  { id: 'DEPT-03', name: 'Health & Sanitation', icon: 'delete_forever', activeIssues: 82, workersCount: 120, status: 'Active', avgFixTime: '1.8h', onTimeRate: 96 },
  { id: 'DEPT-04', name: 'Streetlights', icon: 'lightbulb', activeIssues: 19, workersCount: 22, status: 'Active', avgFixTime: '6.2h', onTimeRate: 88 },
  { id: 'DEPT-05', name: 'Roads & Public Works', icon: 'add_road', activeIssues: 64, workersCount: 85, status: 'Active', avgFixTime: '12h', onTimeRate: 75 },
  { id: 'DEPT-06', name: 'Parks & Gardens', icon: 'forest', activeIssues: 12, workersCount: 14, status: 'Active', avgFixTime: '18h', onTimeRate: 90 },
  { id: 'DEPT-07', name: 'Fire Safety', icon: 'local_fire_department', activeIssues: 3, workersCount: 50, status: 'Active', avgFixTime: '0.4h', onTimeRate: 100 },
  { id: 'DEPT-08', name: 'Revenue', icon: 'payments', activeIssues: 7, workersCount: 10, status: 'Active', avgFixTime: '24h', onTimeRate: 95 },
  { id: 'DEPT-09', name: 'IT Services', icon: 'computer', activeIssues: 4, workersCount: 8, status: 'Active', avgFixTime: '1.2h', onTimeRate: 98 },
  { id: 'DEPT-10', name: 'Housing & Environment', icon: 'apartment', activeIssues: 15, workersCount: 18, status: 'Under Review', avgFixTime: '36h', onTimeRate: 70 },
  { id: 'DEPT-11', name: 'Food & Supplies', icon: 'shopping_bag', activeIssues: 2, workersCount: 6, status: 'Active', avgFixTime: '8h', onTimeRate: 92 },
  { id: 'DEPT-12', name: 'Education', icon: 'school', activeIssues: 5, workersCount: 12, status: 'Active', avgFixTime: '15h', onTimeRate: 94 },
  { id: 'DEPT-13', name: 'Law & Administration', icon: 'balance', activeIssues: 8, workersCount: 15, status: 'Active', avgFixTime: '72h', onTimeRate: 85 },
]

export const civiclensApi = {
  getComplaints(): Complaint[] {
    const data = localStorage.getItem('civiclens_complaints')
    if (!data) {
      localStorage.setItem('civiclens_complaints', JSON.stringify(DEFAULT_COMPLAINTS))
      return DEFAULT_COMPLAINTS
    }
    return JSON.parse(data)
  },

  addComplaint(complaint: Omit<Complaint, 'id' | 'date' | 'status' | 'slaRemaining' | 'slaTotal' | 'initials'>): Complaint {
    const list = this.getComplaints()
    const id = `#G-${Math.floor(1000 + Math.random() * 9000)}-${complaint.category.charAt(0).toUpperCase()}`
    
    // Formatting date
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    const dateStr = new Date().toLocaleDateString('en-US', options)

    const newComplaint: Complaint = {
      ...complaint,
      id,
      date: dateStr,
      status: 'OPEN',
      slaRemaining: '23h 59m left',
      slaTotal: 'Limit: 24 hours',
      initials: complaint.assignee ? complaint.assignee.split(' ').map(n => n[0]).join('').toUpperCase() : ''
    }

    list.unshift(newComplaint)
    localStorage.setItem('civiclens_complaints', JSON.stringify(list))

    // Update active department issue count
    const depts = this.getDepartments()
    const targetDept = depts.find(d => d.name.toLowerCase().includes(complaint.category.toLowerCase()) || complaint.category.toLowerCase().includes(d.name.toLowerCase()))
    if (targetDept) {
      targetDept.activeIssues += 1
      localStorage.setItem('civiclens_departments', JSON.stringify(depts))
    }

    return newComplaint
  },

  updateComplaint(id: string, updates: Partial<Complaint>): Complaint[] {
    const list = this.getComplaints()
    const index = list.findIndex(c => c.id === id)
    if (index !== -1) {
      const original = list[index]!
      
      // If status changed to resolved, decrease active issues in department
      if (updates.status === 'RESOLVED' && original.status !== 'RESOLVED') {
        const depts = this.getDepartments()
        const targetDept = depts.find(d => d.name.toLowerCase().includes(original.category.toLowerCase()) || original.category.toLowerCase().includes(d.name.toLowerCase()))
        if (targetDept) {
          targetDept.activeIssues = Math.max(0, targetDept.activeIssues - 1)
          localStorage.setItem('civiclens_departments', JSON.stringify(depts))
        }
      }

      list[index] = { ...original, ...updates }
      localStorage.setItem('civiclens_complaints', JSON.stringify(list))
    }
    return list
  },

  getDepartments(): Department[] {
    const data = localStorage.getItem('civiclens_departments')
    if (!data) {
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

  getKpis() {
    const list = this.getComplaints()
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
  }
}
