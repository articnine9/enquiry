'use server'

import dbConnect from '@/lib/db/connection'
import Enquiry from '@/lib/db/models/Enquiry'
import User from '@/lib/db/models/User'
import FollowUp from '@/lib/db/models/FollowUp'
import StaffDailyStat from '@/lib/db/models/StaffDailyStat'
import { requireRole, requirePermission } from '@/lib/auth/session'
import {
  UserRole,
  LEAD_STAGE_ORDER, LEAD_STAGE_LABELS, LEAD_STAGE_COLORS, LEAD_STAGE_CONVERTED,
} from '@/types/enums'
import type { ActionResult } from '@/types/api'
import type {
  ReportFilters,
  EnquirySummaryData,
  EnquiryCountByKey,
  StaffPerformanceData,
  StaffPerfRow,
  ZonePerformanceData,
  FollowUpReportData,
  ConversionFunnelData,
  FunnelStage,
  MarketingReportData,
  ChannelPerformanceData,
} from '../types/report.types'
import {
  buildEnquiryReportPipeline,
  buildStaffPerformanceReportPipeline,
  buildStaffLeadStatsPipeline,
  buildZonePerformanceReportPipeline,
  buildFollowUpReportPipeline,
  buildConversionFunnelPipeline,
  buildMarketingReportPipeline,
  buildBusinessCategoryReportPipeline,
  buildDealerPerformancePipeline,
  buildDistributorPerformancePipeline,
} from '../aggregations/report.pipelines'
import { resolveDateRange } from '../utils/date-range'
import { getMasterLabelMap } from '@/features/settings/services/masterData.service'

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
    const session = await requirePermission('report:read')
    await dbConnect()

    // Staff can only ever see their own row, regardless of what was requested.
    const filters = {
      ...rawFilters,
      ...resolveDateRange(rawFilters),
      staffId: session.user.role === UserRole.Staff ? session.user.id : rawFilters.staffId,
    }

    const [activityRows, leadStatRows] = await Promise.all([
      StaffDailyStat.aggregate(buildStaffPerformanceReportPipeline(filters)),
      Enquiry.aggregate(buildStaffLeadStatsPipeline(filters)),
    ])

    const leadStatsById = new Map(
      leadStatRows.map((r: { staffId: string }) => [r.staffId, r])
    )

    // Staff activity (StaffDailyStat) is the base row set — a staff member with
    // leads but no logged activity days still deserves a row, so union in any
    // lead-stat staffIds missing from the activity rows with zeroed activity fields.
    const activityIds = new Set(activityRows.map((r: { staffId: string }) => r.staffId))
    const leadOnlyRows = leadStatRows
      .filter((r: { staffId: string }) => !activityIds.has(r.staffId))
      .map((r: { staffId: string }) => ({ staffId: r.staffId }))

    const staffIdsNeedingUser = leadOnlyRows.map((r: { staffId: string }) => r.staffId)
    const extraUsers = staffIdsNeedingUser.length
      ? await User.find({ _id: { $in: staffIdsNeedingUser } }).select('name email').lean()
      : []
    const userById = new Map(extraUsers.map((u) => [String(u._id), u]))

    const emptyLeadStats = { leadsAssigned: 0, leadsConverted: 0, leadConversionRate: 0, revenueGenerated: 0 }

    const rows: StaffPerfRow[] = [
      ...activityRows.map((r) => ({ ...r, ...(leadStatsById.get(r.staffId) ?? emptyLeadStats) })),
      ...leadOnlyRows
        .filter((r: { staffId: string }) => userById.has(r.staffId))
        .map((r: { staffId: string }) => ({
          staffId: r.staffId,
          name:    userById.get(r.staffId)!.name,
          email:   userById.get(r.staffId)!.email,
          zoneName: 'Unassigned',
          activeDays: 0, enquiriesAssigned: 0, enquiriesResolved: 0, resolutionRate: 0,
          callsMade: 0, followUpsCompleted: 0, followUpsMissed: 0, totalOnlineMinutes: 0,
          avgScore: 0, totalScore: 0,
          ...(leadStatsById.get(r.staffId) ?? emptyLeadStats),
        })),
    ]

    const totals = rows.reduce(
      (acc, r) => ({
        enquiriesAssigned:  acc.enquiriesAssigned  + r.enquiriesAssigned,
        enquiriesResolved:  acc.enquiriesResolved  + r.enquiriesResolved,
        callsMade:          acc.callsMade          + r.callsMade,
        followUpsCompleted: acc.followUpsCompleted + r.followUpsCompleted,
        totalOnlineMinutes: acc.totalOnlineMinutes + r.totalOnlineMinutes,
        leadsAssigned:      acc.leadsAssigned      + r.leadsAssigned,
        leadsConverted:     acc.leadsConverted     + r.leadsConverted,
        revenueGenerated:   acc.revenueGenerated   + r.revenueGenerated,
        avgTeamScore:       0,
      }),
      {
        enquiriesAssigned: 0, enquiriesResolved: 0, callsMade: 0, followUpsCompleted: 0,
        totalOnlineMinutes: 0, leadsAssigned: 0, leadsConverted: 0, revenueGenerated: 0, avgTeamScore: 0,
      }
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

// Ordered by LEAD_STAGE_ORDER (Lost excluded — it's an off-ramp, not a funnel step).
const FUNNEL_ORDER = LEAD_STAGE_ORDER.map((stage) => ({
  status: stage,
  label:  LEAD_STAGE_LABELS[stage],
  color:  LEAD_STAGE_COLORS[stage],
}))

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

    const stages: FunnelStage[] = FUNNEL_ORDER.map((s, i) => {
      const count = countMap[s.status] ?? 0
      const pct   = total > 0 ? Math.round((count / total) * 1000) / 10 : 0
      const prev  = i > 0 ? (countMap[FUNNEL_ORDER[i - 1].status] ?? 0) : count
      const dropOffPct = prev > 0 ? Math.round(((prev - count) / prev) * 1000) / 10 : 0
      return { ...s, count, pct, dropOffPct }
    })

    const converted = LEAD_STAGE_CONVERTED.reduce((sum, stage) => sum + (countMap[stage] ?? 0), 0)
    const conversionRate = total > 0 ? Math.round((converted / total) * 1000) / 10 : 0

    return {
      ok:   true,
      data: toPlain({ stages, conversionRate, totalEnquiries: total, converted }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load report' }
  }
}

// ── 6. Marketing Dashboard ─────────────────────────────────────────────────────

export async function getMarketingReportAction(
  rawFilters: ReportFilters
): Promise<ActionResult<MarketingReportData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const filters  = { ...rawFilters, ...resolveDateRange(rawFilters) }
    const [bySource, byCategoryRaw, categoryLabels, subCategoryLabels] = await Promise.all([
      Enquiry.aggregate(buildMarketingReportPipeline(filters)),
      Enquiry.aggregate(buildBusinessCategoryReportPipeline(filters)),
      getMasterLabelMap('business_category'),
      getMasterLabelMap('business_subcategory'),
    ])

    const totalLeads = bySource.reduce((s: number, r: { leads: number }) => s + r.leads, 0)

    const byBusinessCategory = byCategoryRaw.map((r: { category: string; subCategory: string; leads: number; converted: number; conversionRate: number }) => ({
      ...r,
      categoryLabel:    categoryLabels[r.category] ?? r.category,
      subCategoryLabel: subCategoryLabels[r.subCategory] ?? r.subCategory,
    }))

    return { ok: true, data: toPlain({ totalLeads, bySource, byBusinessCategory }) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load report' }
  }
}

// ── 7. Dealer / Distributor Performance ───────────────────────────────────────

export async function getDealerPerformanceReportAction(
  rawFilters: ReportFilters
): Promise<ActionResult<ChannelPerformanceData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const filters = { ...rawFilters, ...resolveDateRange(rawFilters) }
    const rows    = await Enquiry.aggregate(buildDealerPerformancePipeline(filters))

    const totals = rows.reduce(
      (acc: { leadsReceived: number; leadsConverted: number }, r: { leadsReceived: number; leadsConverted: number }) => ({
        leadsReceived:  acc.leadsReceived  + r.leadsReceived,
        leadsConverted: acc.leadsConverted + r.leadsConverted,
      }),
      { leadsReceived: 0, leadsConverted: 0 }
    )
    const conversionRate = totals.leadsReceived > 0
      ? Math.round((totals.leadsConverted / totals.leadsReceived) * 1000) / 10
      : 0

    return { ok: true, data: toPlain({ rows, totals: { ...totals, conversionRate } }) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load report' }
  }
}

export async function getDistributorPerformanceReportAction(
  rawFilters: ReportFilters
): Promise<ActionResult<ChannelPerformanceData>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const filters = { ...rawFilters, ...resolveDateRange(rawFilters) }
    const rows    = await Enquiry.aggregate(buildDistributorPerformancePipeline(filters))

    const totals = rows.reduce(
      (acc: { leadsReceived: number; leadsConverted: number }, r: { leadsReceived: number; leadsConverted: number }) => ({
        leadsReceived:  acc.leadsReceived  + r.leadsReceived,
        leadsConverted: acc.leadsConverted + r.leadsConverted,
      }),
      { leadsReceived: 0, leadsConverted: 0 }
    )
    const conversionRate = totals.leadsReceived > 0
      ? Math.round((totals.leadsConverted / totals.leadsReceived) * 1000) / 10
      : 0

    return { ok: true, data: toPlain({ rows, totals: { ...totals, conversionRate } }) }
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
    await requirePermission('report:read')
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
