// ── Filter types ──────────────────────────────────────────────────────────────

export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'last_week'
  | 'month'
  | 'last_month'
  | 'quarter'
  | 'year'
  | 'custom'

export type ReportType =
  | 'enquiry'
  | 'staff'
  | 'zone'
  | 'followup'
  | 'conversion'

export interface ReportFilters {
  period:    ReportPeriod
  dateFrom:  string        // YYYY-MM-DD
  dateTo:    string        // YYYY-MM-DD
  zoneId?:   string
  staffId?:  string
  status?:   string
  priority?: string
  source?:   string
  category?: string
}

// ── Enquiry summary report ────────────────────────────────────────────────────

export interface EnquiryCountByKey {
  _id:   string
  count: number
  pct:   number
}

export interface EnquiryTrendPoint {
  date:     string
  created:  number
  resolved: number
  closed:   number
}

export interface EnquiryReportRow {
  _id:       string
  enquiryNo: string
  name:      string
  status:    string
  priority:  string
  source:    string
  category:  string
  assignee?: string
  createdAt: string
  updatedAt: string
  ageHours:  number
}

export interface EnquirySummaryData {
  totals: {
    total:     number
    open:      number
    resolved:  number
    closed:    number
    cancelled: number
    inRange:   number
  }
  avgResolutionHours: number
  byStatus:   EnquiryCountByKey[]
  bySource:   EnquiryCountByKey[]
  byCategory: EnquiryCountByKey[]
  byPriority: EnquiryCountByKey[]
  dailyTrend: EnquiryTrendPoint[]
  recentRows: EnquiryReportRow[]
}

// ── Staff performance report ──────────────────────────────────────────────────

export interface StaffPerfRow {
  staffId:            string
  name:               string
  email:              string
  zoneName:           string
  activeDays:         number
  enquiriesAssigned:  number
  enquiriesResolved:  number
  resolutionRate:     number
  callsMade:          number
  followUpsCompleted: number
  followUpsMissed:    number
  totalOnlineMinutes: number
  avgScore:           number
  totalScore:         number
}

export interface StaffPerfTrendPoint {
  date:  string
  score: number
}

export interface StaffPerformanceData {
  rows:   StaffPerfRow[]
  totals: {
    enquiriesAssigned:  number
    enquiriesResolved:  number
    callsMade:          number
    followUpsCompleted: number
    totalOnlineMinutes: number
    avgTeamScore:       number
  }
}

// ── Zone performance report ───────────────────────────────────────────────────

export interface ZonePerfRow {
  zoneId:         string | null
  zoneName:       string
  total:          number
  open:           number
  resolved:       number
  closed:         number
  cancelled:      number
  urgent:         number
  staffCount:     number
  avgLoad:        number
  conversionRate: number
  avgResolutionHours: number
}

export interface ZonePerformanceData {
  rows:   ZonePerfRow[]
  totals: {
    total:          number
    resolved:       number
    open:           number
    conversionRate: number
  }
}

// ── Follow-up report ──────────────────────────────────────────────────────────

export interface FollowUpTrendPoint {
  date:      string
  scheduled: number
  completed: number
  missed:    number
}

export interface FollowUpByStaffRow {
  staffId:    string
  staffName:  string
  scheduled:  number
  completed:  number
  missed:     number
  completionRate: number
}

export interface FollowUpReportData {
  totals: {
    scheduled:  number
    completed:  number
    missed:     number
    cancelled:  number
    pending:    number
  }
  completionRate:    number
  avgCompletionDays: number
  byType:    { _id: string; count: number }[]
  byOutcome: { _id: string; count: number }[]
  dailyTrend:  FollowUpTrendPoint[]
  byStaff:     FollowUpByStaffRow[]
}

// ── Conversion funnel report ──────────────────────────────────────────────────

export interface FunnelStage {
  status:      string
  label:       string
  count:       number
  pct:         number
  dropOffPct:  number
  color:       string
}

export interface ConversionFunnelData {
  stages:         FunnelStage[]
  conversionRate: number
  totalEnquiries: number
  converted:      number
}
