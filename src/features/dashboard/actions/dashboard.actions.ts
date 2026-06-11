'use server'

import dbConnect from '@/lib/db/connection'
import Enquiry from '@/lib/db/models/Enquiry'
import User from '@/lib/db/models/User'
import FollowUp from '@/lib/db/models/FollowUp'
import Assignment from '@/lib/db/models/Assignment'
import StaffDailyStat from '@/lib/db/models/StaffDailyStat'
import { requireSession, requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { ActionResult } from '@/types/api'
import {
  buildEnquiryOverviewPipeline,
  buildEnquiryTrendPipeline,
  buildStaffOverviewPipeline,
  buildZonePerformancePipeline,
  buildTeamPerformancePipeline,
  buildPendingEnquiriesPipeline,
  buildFollowUpSummaryPipeline,
  buildMyEnquiriesPipeline,
  buildMyFollowUpsPipeline,
  buildMyPendingTasksPipeline,
  startOfToday,
  endOfToday,
} from '../aggregations/dashboard.pipelines'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EnquiryOverview {
  total:     number
  open:      number
  resolved:  number
  closed:    number
  thisMonth: number
  conversionRate: number
  byStatus:   { _id: string; count: number }[]
  bySource:   { _id: string; count: number }[]
  byCategory: { _id: string; count: number }[]
  byPriority: { _id: string; count: number }[]
}

export interface EnquiryTrendPoint {
  date:     string
  created:  number
  resolved: number
  closed:   number
}

export interface StaffOverview {
  total:  number
  active: number
  byZone: {
    zoneId:      string | null
    zoneName:    string
    count:       number
    activeCount: number
    totalLoad:   number
  }[]
}

export interface ZonePerformanceRow {
  zoneId:         string | null
  zoneName:       string
  total:          number
  resolved:       number
  closed:         number
  open:           number
  urgent:         number
  staffCount:     number
  conversionRate: number
}

export interface SuperAdminDashboardData {
  enquiry:         EnquiryOverview
  staff:           StaffOverview
  zonePerformance: ZonePerformanceRow[]
  trend:           EnquiryTrendPoint[]
}

export interface TeamMemberPerf {
  staffId:            string
  name:               string
  email:              string
  avatar?:            string
  enquiriesAssigned:  number
  enquiriesResolved:  number
  callsMade:          number
  followUpsCompleted: number
  totalOnlineMinutes: number
  avgScore:           number
  resolutionRate:     number
}

export interface PendingEnquiriesSummary {
  total:      number
  unassigned: number
  byPriority: { _id: string; count: number }[]
  byStatus:   { _id: string; count: number }[]
  ageBuckets: { _id: string | number; count: number }[]
  oldest:     {
    _id: string; enquiryNo: string; name: string
    status: string; priority: string; createdAt: string; ageHours: number; assignee?: string
  }[]
}

export interface FollowUpItem {
  _id:         string
  type:        string
  scheduledAt: string
  enquiryNo:   string
  enquiryId:   string
  staffName?:  string
  notes?:      string
}

export interface FollowUpSummary {
  todayDue:       number
  overdue:        number
  upcoming:       number
  completedToday: number
  byType:         { _id: string; count: number }[]
  todayList:      FollowUpItem[]
}

export interface ManagerDashboardData {
  teamPerf:    TeamMemberPerf[]
  pending:     PendingEnquiriesSummary
  followUps:   FollowUpSummary
}

export interface MyEnquiriesSummary {
  total:         number
  active:        number
  resolvedToday: number
  byStatus:      { _id: string; count: number }[]
  recentActive:  {
    _id: string; enquiryNo: string; name: string
    status: string; priority: string; updatedAt: string; createdAt: string
  }[]
}

export interface MyFollowUpItem {
  _id:         string
  type:        string
  scheduledAt: string
  notes?:      string
  enquiryId:   string
  enquiryNo:   string
  enquiryName: string
}

export interface MyFollowUpsSummary {
  todayCount:     number
  overdueCount:   number
  completedToday: number
  todayDue:       MyFollowUpItem[]
  overdue:        MyFollowUpItem[]
}

export interface PendingTask {
  _id:       string
  enquiryNo: string
  name:      string
  status:    string
  priority:  string
  createdAt: string
  updatedAt: string
  ageHours:  number
}

export interface StaffDashboardData {
  myEnquiries:  MyEnquiriesSummary
  myFollowUps:  MyFollowUpsSummary
  pendingTasks: PendingTask[]
  todayScore:   number
}

// ── SuperAdmin action ─────────────────────────────────────────────────────────

export async function getSuperAdminDashboardAction(): Promise<ActionResult<SuperAdminDashboardData>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const [enquiryRaw, staffRaw, zoneRaw, trendRaw] = await Promise.all([
      Enquiry.aggregate(buildEnquiryOverviewPipeline()),
      User.aggregate(buildStaffOverviewPipeline()),
      Assignment.aggregate(buildZonePerformancePipeline()),
      Enquiry.aggregate(buildEnquiryTrendPipeline(30)),
    ])

    const eq   = enquiryRaw[0]
    const st   = staffRaw[0]
    const total     = eq.total[0]?.n     ?? 0
    const resolved  = eq.resolved[0]?.n  ?? 0
    const closed    = eq.closed[0]?.n    ?? 0

    const data: SuperAdminDashboardData = {
      enquiry: {
        total,
        open:      eq.open[0]?.n ?? 0,
        resolved,
        closed,
        thisMonth: eq.thisMonth[0]?.n ?? 0,
        conversionRate:
          total > 0 ? Math.round(((resolved + closed) / total) * 1000) / 10 : 0,
        byStatus:   eq.byStatus   ?? [],
        bySource:   eq.bySource   ?? [],
        byCategory: eq.byCategory ?? [],
        byPriority: eq.byPriority ?? [],
      },
      staff: {
        total:  st.total[0]?.n  ?? 0,
        active: st.active[0]?.n ?? 0,
        byZone: st.byZone       ?? [],
      },
      zonePerformance: zoneRaw,
      trend:           trendRaw,
    }

    return { ok: true, data: toPlain(data) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load dashboard'
    return { ok: false, error: msg }
  }
}

// ── Manager action ────────────────────────────────────────────────────────────

export async function getManagerDashboardAction(params?: {
  dateFrom?: string
  dateTo?:   string
}): Promise<ActionResult<ManagerDashboardData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const dateFrom = params?.dateFrom ? new Date(params.dateFrom) : startOfToday()
    const dateTo   = params?.dateTo   ? new Date(params.dateTo)   : endOfToday()

    // For Manager: optionally scope to their zone
    // For SuperAdmin: see all
    const zoneId = session.user.role === UserRole.Manager
      ? session.user.locationZoneId ?? undefined
      : undefined

    // Get zone staff IDs if scoped
    let zoneStaffIds: string[] | undefined
    if (zoneId) {
      const zoneStaff = await User.find(
        { locationZoneId: zoneId, role: UserRole.Staff },
        { _id: 1 }
      ).lean()
      zoneStaffIds = zoneStaff.map((u) => String(u._id))
    }

    const [teamRaw, pendingRaw, followUpRaw] = await Promise.all([
      StaffDailyStat.aggregate(buildTeamPerformancePipeline({ dateFrom, dateTo, zoneId })),
      Enquiry.aggregate(buildPendingEnquiriesPipeline(zoneId)),
      FollowUp.aggregate(buildFollowUpSummaryPipeline(zoneStaffIds)),
    ])

    const pRaw = pendingRaw[0]
    const fRaw = followUpRaw[0]

    const data: ManagerDashboardData = {
      teamPerf: teamRaw,
      pending: {
        total:      pRaw.total[0]?.n      ?? 0,
        unassigned: pRaw.unassigned[0]?.n ?? 0,
        byPriority: pRaw.byPriority ?? [],
        byStatus:   pRaw.byStatus   ?? [],
        ageBuckets: pRaw.ageBuckets ?? [],
        oldest:     pRaw.oldest     ?? [],
      },
      followUps: {
        todayDue:       fRaw.todayDue[0]?.n       ?? 0,
        overdue:        fRaw.overdue[0]?.n         ?? 0,
        upcoming:       fRaw.upcoming[0]?.n        ?? 0,
        completedToday: fRaw.completedToday[0]?.n  ?? 0,
        byType:         fRaw.byType   ?? [],
        todayList:      fRaw.todayList ?? [],
      },
    }

    return { ok: true, data: toPlain(data) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load dashboard'
    return { ok: false, error: msg }
  }
}

// ── Staff action ──────────────────────────────────────────────────────────────

export async function getStaffDashboardAction(staffId?: string): Promise<ActionResult<StaffDashboardData>> {
  try {
    const session = await requireSession()
    await dbConnect()

    // Staff can only see their own data; managers can pass a staffId
    const targetId =
      session.user.role === UserRole.Staff
        ? session.user.id
        : (staffId ?? session.user.id)

    const today = new Date().toISOString().slice(0, 10)

    const [enquiryRaw, followUpRaw, pendingRaw, statRaw] = await Promise.all([
      Enquiry.aggregate(buildMyEnquiriesPipeline(targetId)),
      FollowUp.aggregate(buildMyFollowUpsPipeline(targetId)),
      Enquiry.aggregate(buildMyPendingTasksPipeline(targetId)),
      StaffDailyStat.findOne({ staffId: targetId, date: new Date(today) }).lean(),
    ])

    const eq = enquiryRaw[0]
    const fu = followUpRaw[0]

    const data: StaffDashboardData = {
      myEnquiries: {
        total:         eq.total[0]?.n         ?? 0,
        active:        eq.active[0]?.n        ?? 0,
        resolvedToday: eq.resolvedToday[0]?.n ?? 0,
        byStatus:      eq.byStatus            ?? [],
        recentActive:  eq.recentActive        ?? [],
      },
      myFollowUps: {
        todayCount:     fu.todayCount[0]?.n     ?? 0,
        overdueCount:   fu.overdueCount[0]?.n   ?? 0,
        completedToday: fu.completedToday[0]?.n ?? 0,
        todayDue:       fu.todayDue  ?? [],
        overdue:        fu.overdue   ?? [],
      },
      pendingTasks: pendingRaw,
      todayScore:   (statRaw as { productivityScore?: number } | null)?.productivityScore ?? 0,
    }

    return { ok: true, data: toPlain(data) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load dashboard'
    return { ok: false, error: msg }
  }
}
