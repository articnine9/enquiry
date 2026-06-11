'use server'

import dbConnect from '@/lib/db/connection'
import Enquiry from '@/lib/db/models/Enquiry'
import User from '@/lib/db/models/User'
import FollowUp from '@/lib/db/models/FollowUp'
import StaffDailyStat from '@/lib/db/models/StaffDailyStat'
import { requireRole } from '@/lib/auth/session'
import { UserRole, EnquiryStatus } from '@/types/enums'
import type { ActionResult } from '@/types/api'
import type {
  ReportFilters,
  EnquirySummaryData,
  EnquiryCountByKey,
  StaffPerformanceData,
  ZonePerformanceData,
  FollowUpReportData,
  ConversionFunnelData,
  FunnelStage,
} from '../types/report.types'
import {
  buildEnquiryReportPipeline,
  buildStaffPerformanceReportPipeline,
  buildZonePerformanceReportPipeline,
  buildFollowUpReportPipeline,
  buildConversionFunnelPipeline,
} from '../aggregations/report.pipelines'
import { resolveDateRange } from '../utils/date-range'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── 1. Enquiry Summary ────────────────────────────────────────────────────────

export async function getEnquiryReportAction(
  rawFilters: ReportFilters
): Promise<ActionResult<EnquirySummaryData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const filters = { ...rawFilters, ...resolveDateRange(rawFilters) }
    const [result] = await Enquiry.aggregate(buildEnquiryReportPipeline(filters))

    const allTotals  = result.allTotals[0]  ?? {}
    const inRangeN   = result.inRange[0]?.n ?? 0
    const byStatusRaw: { _id: string; count: number }[] = result.byStatus ?? []
    const totalInRange = byStatusRaw.reduce((s: number, r: { count: number }) => s + r.count, 0)

    // Add percentage to each distribution bucket
    function withPct(arr: { _id: string; count: number }[]): EnquiryCountByKey[] {
      return arr.map((r) => ({
        ...r,
        pct: totalInRange > 0 ? Math.round((r.count / totalInRange) * 1000) / 10 : 0,
      }))
    }

    const data: EnquirySummaryData = {
      totals: {
        total:     allTotals.total     ?? 0,
        open:      allTotals.open      ?? 0,
        resolved:  allTotals.resolved  ?? 0,
        closed:    allTotals.closed    ?? 0,
        cancelled: allTotals.cancelled ?? 0,
        inRange:   inRangeN,
      },
      avgResolutionHours: Math.round((result.avgResolution[0]?.avg ?? 0) * 10) / 10,
      byStatus:   withPct(result.byStatus   ?? []),
      bySource:   withPct(result.bySource   ?? []),
      byCategory: withPct(result.byCategory ?? []),
      byPriority: withPct(result.byPriority ?? []),
      dailyTrend: result.dailyTrend ?? [],
      recentRows: result.recentRows ?? [],
    }

    return { ok: true, data: toPlain(data) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load report' }
  }
}

// ── 2. Staff Performance ──────────────────────────────────────────────────────

export async function getStaffPerformanceReportAction(
  rawFilters: ReportFilters
): Promise<ActionResult<StaffPerformanceData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const filters = { ...rawFilters, ...resolveDateRange(rawFilters) }
    const rows    = await StaffDailyStat.aggregate(buildStaffPerformanceReportPipeline(filters))

    const totals = rows.reduce(
      (acc, r) => ({
        enquiriesAssigned:  acc.enquiriesAssigned  + r.enquiriesAssigned,
        enquiriesResolved:  acc.enquiriesResolved  + r.enquiriesResolved,
        callsMade:          acc.callsMade          + r.callsMade,
        followUpsCompleted: acc.followUpsCompleted + r.followUpsCompleted,
        totalOnlineMinutes: acc.totalOnlineMinutes + r.totalOnlineMinutes,
        avgTeamScore:       0,
      }),
      { enquiriesAssigned: 0, enquiriesResolved: 0, callsMade: 0, followUpsCompleted: 0, totalOnlineMinutes: 0, avgTeamScore: 0 }
    )

    totals.avgTeamScore = rows.length
      ? Math.round(rows.reduce((s: number, r: { avgScore: number }) => s + r.avgScore, 0) / rows.length)
      : 0

    return { ok: true, data: toPlain({ rows, totals }) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load report' }
  }
}

// ── 3. Zone Performance ───────────────────────────────────────────────────────

export async function getZonePerformanceReportAction(
  rawFilters: ReportFilters
): Promise<ActionResult<ZonePerformanceData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const filters = { ...rawFilters, ...resolveDateRange(rawFilters) }
    const rows    = await Enquiry.aggregate(buildZonePerformanceReportPipeline(filters))

    const totals = rows.reduce(
      (acc, r) => ({
        total:    acc.total    + r.total,
        resolved: acc.resolved + r.resolved,
        open:     acc.open     + r.open,
        conversionRate: 0,
      }),
      { total: 0, resolved: 0, open: 0, conversionRate: 0 }
    )

    totals.conversionRate = totals.total > 0
      ? Math.round((totals.resolved / totals.total) * 1000) / 10
      : 0

    return { ok: true, data: toPlain({ rows, totals }) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load report' }
  }
}

// ── 4. Follow-up Report ───────────────────────────────────────────────────────

export async function getFollowUpReportAction(
  rawFilters: ReportFilters
): Promise<ActionResult<FollowUpReportData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const filters     = { ...rawFilters, ...resolveDateRange(rawFilters) }
    const [result]    = await FollowUp.aggregate(buildFollowUpReportPipeline(filters))

    const t = result.totals[0] ?? {}
    const completionRate = t.scheduled > 0
      ? Math.round((t.completed / t.scheduled) * 1000) / 10
      : 0

    const data: FollowUpReportData = {
      totals: {
        scheduled:  t.scheduled  ?? 0,
        completed:  t.completed  ?? 0,
        missed:     t.missed     ?? 0,
        cancelled:  t.cancelled  ?? 0,
        pending:    t.pending    ?? 0,
      },
      completionRate,
      avgCompletionDays: Math.round((result.avgCompletion[0]?.avg ?? 0) * 10) / 10,
      byType:    result.byType    ?? [],
      byOutcome: result.byOutcome ?? [],
      dailyTrend: result.dailyTrend ?? [],
      byStaff:    result.byStaff    ?? [],
    }

    return { ok: true, data: toPlain(data) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load report' }
  }
}

// ── 5. Conversion Funnel ──────────────────────────────────────────────────────

const FUNNEL_ORDER = [
  { status: EnquiryStatus.New,        label: 'New',         color: '#6366f1' },
  { status: EnquiryStatus.Assigned,   label: 'Assigned',    color: '#3b82f6' },
  { status: EnquiryStatus.InProgress, label: 'In Progress', color: '#f59e0b' },
  { status: EnquiryStatus.FollowUp,   label: 'Follow-up',   color: '#8b5cf6' },
  { status: EnquiryStatus.Resolved,   label: 'Resolved',    color: '#10b981' },
  { status: EnquiryStatus.Closed,     label: 'Closed',      color: '#14b8a6' },
]

export async function getConversionFunnelAction(
  rawFilters: ReportFilters
): Promise<ActionResult<ConversionFunnelData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const filters  = { ...rawFilters, ...resolveDateRange(rawFilters) }
    const [result] = await Enquiry.aggregate(buildConversionFunnelPipeline(filters))

    if (!result) {
      return {
        ok: true,
        data: { stages: [], conversionRate: 0, totalEnquiries: 0, converted: 0 },
      }
    }

    const total     = result.total ?? 0
    const countMap  = Object.fromEntries(
      (result.stages as { status: string; count: number }[])
        .map((s) => [s.status, s.count])
    )

    const topCount  = countMap[EnquiryStatus.New] ?? total
    const stages: FunnelStage[] = FUNNEL_ORDER.map((s, i) => {
      const count = countMap[s.status] ?? 0
      const pct   = total > 0 ? Math.round((count / total) * 1000) / 10 : 0
      const prev  = i > 0 ? (countMap[FUNNEL_ORDER[i - 1].status] ?? 0) : count
      const dropOffPct = prev > 0 ? Math.round(((prev - count) / prev) * 1000) / 10 : 0
      return { ...s, count, pct, dropOffPct }
    })

    const converted = (countMap[EnquiryStatus.Resolved] ?? 0) + (countMap[EnquiryStatus.Closed] ?? 0)
    const conversionRate = total > 0 ? Math.round((converted / total) * 1000) / 10 : 0

    return {
      ok:   true,
      data: toPlain({ stages, conversionRate, totalEnquiries: total, converted }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load report' }
  }
}

// ── Metadata helpers (for filter dropdowns) ───────────────────────────────────

export async function getReportFilterOptionsAction(): Promise<ActionResult<{
  zones:  { _id: string; name: string }[]
  staff:  { _id: string; name: string }[]
}>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const LocationZone = (await import('@/lib/db/models/LocationZone')).default

    const [zones, staff] = await Promise.all([
      LocationZone.find({ isActive: true }, { name: 1 }).sort({ name: 1 }).lean(),
      User.find({ role: UserRole.Staff, status: 'active' }, { name: 1 }).sort({ name: 1 }).lean(),
    ])

    return {
      ok: true,
      data: toPlain({
        zones: zones.map((z) => ({ _id: String(z._id), name: z.name })),
        staff: staff.map((u) => ({ _id: String(u._id), name: u.name })),
      }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load options' }
  }
}
