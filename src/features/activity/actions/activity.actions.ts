'use server'

import mongoose from 'mongoose'
import dbConnect from '@/lib/db/connection'
import ActivityLog from '@/lib/db/models/ActivityLog'
import UserSession from '@/lib/db/models/UserSession'
import StaffDailyStat, { startOfDay, computeProductivityScore } from '@/lib/db/models/StaffDailyStat'
import User from '@/lib/db/models/User'
import { requireSession, requireRole } from '@/lib/auth/session'
import { authErrorToResult } from '@/lib/auth/session'
import {
  buildDailyStatsPipeline,
  buildProductivityTrendPipeline,
  buildLeaderboardPipeline,
  buildActivityFeedPipeline,
  buildTeamSummaryPipeline,
  buildHourlyHeatmapPipeline,
} from '../aggregations/activity.pipelines'
import { ActivityAction, EntityType, UserRole } from '@/types/enums'
import type { ActionResult } from '@/types/api'
import type { StaffDailyStatDocument } from '@/lib/db/models/StaffDailyStat'
import type { UserSessionDocument } from '@/lib/db/models/UserSession'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

function toOid(id: string) { return new mongoose.Types.ObjectId(id) }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyStatsResult {
  staffId:            string
  date:               string
  loginCount:         number
  totalOnlineMinutes: number
  firstLoginAt:       string | null
  lastLogoutAt:       string | null
  enquiriesAssigned:  number
  enquiriesResolved:  number
  enquiriesCreated:   number
  statusChanges:      number
  callsMade:          number
  callsReceived:      number
  followUpsCreated:   number
  followUpsCompleted: number
  followUpsMissed:    number
  notesAdded:         number
  productivityScore:  number
}

export interface LeaderboardEntry {
  staffId:            string
  name:               string
  email:              string
  rank:               number
  totalScore:         number
  avgDailyScore:      number
  activeDays:         number
  enquiriesResolved:  number
  callsMade:          number
  followUpsCompleted: number
  onlineMinutes:      number
}

export interface ActivityFeedEntry {
  _id:        string
  action:     string
  actorId:    string
  actorName:  string
  actorEmail: string
  entityType: string
  entityId:   string
  metadata:   Record<string, unknown>
  createdAt:  string
}

export interface TrendPoint {
  date:               string
  productivityScore:  number
  enquiriesResolved:  number
  callsMade:          number
  followUpsCompleted: number
  totalOnlineMinutes: number
}

export interface TeamSummary {
  activeStaffCount:   number
  enquiriesResolved:  number
  enquiriesAssigned:  number
  callsMade:          number
  followUpsCompleted: number
  followUpsMissed:    number
  onlineMinutes:      number
  avgScore:           number
}

export interface HeatmapPoint {
  hour:  number
  count: number
}

// ── Session tracking ──────────────────────────────────────────────────────────

/**
 * Called from loginAction after NextAuth sign-in succeeds.
 * Creates a UserSession and increments StaffDailyStat.loginCount.
 */
export async function trackLoginAction(params: {
  userId:    string
  ipAddress?: string
  userAgent?: string
}): Promise<ActionResult<UserSessionDocument>> {
  try {
    await dbConnect()

    const session = await UserSession.create({
      userId:    params.userId,
      loginAt:   new Date(),
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    })

    const today = startOfDay(new Date())

    // Increment daily stat — set firstLoginAt only if this is the first login today
    await StaffDailyStat.findOneAndUpdate(
      { staffId: params.userId, date: today },
      {
        $setOnInsert: { staffId: params.userId, date: today },
        $inc: { loginCount: 1 },
        $min: { firstLoginAt: session.loginAt },
        $set: { lastComputedAt: new Date() },
      },
      { upsert: true, new: true }
    )

    return { ok: true, data: toPlain(session) }
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message }
  }
}

/**
 * Called from logoutAction.
 * Closes the active session and adds online minutes to today's stat.
 */
export async function trackLogoutAction(
  userId: string
): Promise<ActionResult<void>> {
  try {
    await dbConnect()

    const active = await UserSession.findActiveSession(userId)
    if (!active) return { ok: true, data: undefined } // no active session — no-op

    const logoutAt       = new Date()
    const durationMinutes = Math.round(
      (logoutAt.getTime() - active.loginAt.getTime()) / 60_000
    )

    await UserSession.findByIdAndUpdate(active._id, {
      $set: { logoutAt },
    })

    const today = startOfDay(new Date())
    await StaffDailyStat.findOneAndUpdate(
      { staffId: userId, date: today },
      {
        $setOnInsert: { staffId: userId, date: today },
        $inc: { totalOnlineMinutes: durationMinutes },
        $set: { lastLogoutAt: logoutAt, lastComputedAt: new Date() },
      },
      { upsert: true, new: true }
    )

    return { ok: true, data: undefined }
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message }
  }
}

// ── Stat increment (internal — called by other actions) ───────────────────────

/**
 * Increment one or more daily stat counters for a staff member.
 * Fire-and-forget safe: wrap in .catch(() => {}) at call-site.
 */
export async function incrementDailyStat(
  staffId: string,
  inc:     Partial<Record<string, number>>
): Promise<void> {
  await dbConnect()
  const today = startOfDay(new Date())

  const incFields: Record<string, number> = {}
  for (const [k, v] of Object.entries(inc)) {
    if (typeof v === 'number' && v !== 0) incFields[k] = v
  }

  if (Object.keys(incFields).length === 0) return

  const stat = await StaffDailyStat.findOneAndUpdate(
    { staffId, date: today },
    {
      $setOnInsert: { staffId, date: today },
      $inc: incFields,
      $set: { lastComputedAt: new Date() },
    },
    { upsert: true, new: true }
  )

  // Recompute score and persist
  if (stat) {
    const score = computeProductivityScore(stat)
    await StaffDailyStat.findByIdAndUpdate(stat._id, {
      $set: { productivityScore: score },
    })
  }
}

// ── Daily stats ───────────────────────────────────────────────────────────────

export async function getDailyStatsAction(
  staffId?: string,
  date?: Date
): Promise<ActionResult<DailyStatsResult>> {
  try {
    const session = await requireSession()
    await dbConnect()

    // Staff can only see their own stats
    const targetId =
      session.user.role === UserRole.Staff
        ? session.user.id
        : (staffId ?? session.user.id)

    const targetDate = date ?? new Date()
    const oid        = toOid(targetId)
    const today      = startOfDay(targetDate)

    // Try materialised first, fall back to live aggregation
    const materialised = await StaffDailyStat.findOne({
      staffId: oid,
      date:    today,
    }).lean()

    // Always run live aggregation for the current day for freshness
    const isToday = today.toDateString() === startOfDay(new Date()).toDateString()

    let liveEventCounts: Record<string, number> = {}
    if (isToday || !materialised) {
      const [live] = await ActivityLog.aggregate<Record<string, number>>(
        buildDailyStatsPipeline(oid, targetDate)
      )
      liveEventCounts = live ?? {}
    }

    // Get session info
    const sessions = await UserSession.find({
      userId:  oid,
      loginAt: { $gte: today, $lt: new Date(today.getTime() + 86_400_000) },
    })
      .select('loginAt logoutAt')
      .lean()

    const onlineMinutes = sessions.reduce((acc, s) => {
      const end = s.logoutAt ?? new Date()
      return acc + Math.round((end.getTime() - s.loginAt.getTime()) / 60_000)
    }, 0)

    const firstLogin  = sessions[0]?.loginAt ?? null
    const lastLogout  = sessions.at(-1)?.logoutAt ?? null

    const base = materialised ?? {}
    const merged: Record<string, unknown> = { ...base, ...liveEventCounts }

    const result: DailyStatsResult = {
      staffId:            targetId,
      date:               today.toISOString(),
      loginCount:         sessions.length,
      totalOnlineMinutes: onlineMinutes,
      firstLoginAt:       firstLogin ? new Date(firstLogin).toISOString() : null,
      lastLogoutAt:       lastLogout ? new Date(lastLogout).toISOString() : null,
      enquiriesAssigned:  (merged.enquiriesAssigned  as number) ?? 0,
      enquiriesResolved:  (merged.enquiriesResolved  as number) ?? 0,
      enquiriesCreated:   (merged.enquiriesCreated   as number) ?? 0,
      statusChanges:      (merged.statusChanges      as number) ?? 0,
      callsMade:          (merged.callsMade          as number) ?? 0,
      callsReceived:      (merged.callsReceived      as number) ?? 0,
      followUpsCreated:   (merged.followUpsCreated   as number) ?? 0,
      followUpsCompleted: (merged.followUpsCompleted as number) ?? 0,
      followUpsMissed:    (merged.followUpsMissed    as number) ?? 0,
      notesAdded:         (merged.notesAdded         as number) ?? 0,
      productivityScore:  0,
    }

    // Pass only the numeric counters — staffId/date/timestamps are strings here,
    // not the ObjectId/Date types IStaffDailyStat declares.
    const { staffId: _s, date: _d, firstLoginAt: _f, lastLogoutAt: _l, ...counters } = result
    result.productivityScore = computeProductivityScore({
      ...counters,
      totalOnlineMinutes: onlineMinutes,
    })

    return { ok: true, data: result }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Productivity trend ────────────────────────────────────────────────────────

export async function getProductivityTrendAction(
  staffId?: string,
  days = 30
): Promise<ActionResult<TrendPoint[]>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const targetId =
      session.user.role === UserRole.Staff
        ? session.user.id
        : (staffId ?? session.user.id)

    const to   = new Date()
    const from = new Date(to.getTime() - (days - 1) * 86_400_000)

    const docs = await StaffDailyStat.aggregate<TrendPoint>(
      buildProductivityTrendPipeline(toOid(targetId), from, to)
    )

    // Fill gaps so the chart always has N points
    const byDate = new Map(docs.map((d) => [
      new Date(d.date as unknown as string).toISOString().slice(0, 10),
      d,
    ]))

    const points: TrendPoint[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 86_400_000)
      const key = d.toISOString().slice(0, 10)
      points.push(
        byDate.get(key) ?? {
          date:               d.toISOString(),
          productivityScore:  0,
          enquiriesResolved:  0,
          callsMade:          0,
          followUpsCompleted: 0,
          totalOnlineMinutes: 0,
        }
      )
    }

    return { ok: true, data: toPlain(points) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboardAction(
  period: 'today' | 'week' | 'month' = 'week'
): Promise<ActionResult<LeaderboardEntry[]>> {
  try {
    await requireSession()
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const to   = new Date()
    const from = new Date(to)

    if (period === 'today') {
      from.setUTCHours(0, 0, 0, 0)
    } else if (period === 'week') {
      from.setDate(from.getDate() - 7)
    } else {
      from.setDate(from.getDate() - 30)
    }

    const rows = await StaffDailyStat.aggregate<LeaderboardEntry>(
      buildLeaderboardPipeline(from, to, 20)
    )

    return { ok: true, data: toPlain(rows) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Activity feed ─────────────────────────────────────────────────────────────

export async function getActivityFeedAction(
  options: {
    staffId?: string
    limit?:   number
    hours?:   number
  } = {}
): Promise<ActionResult<ActivityFeedEntry[]>> {
  try {
    await requireSession()
    await dbConnect()

    const { staffId, limit = 50, hours = 24 } = options
    const fromDate = new Date(Date.now() - hours * 3_600_000)

    const oid = staffId ? toOid(staffId) : undefined

    const docs = await ActivityLog.aggregate<ActivityFeedEntry>(
      buildActivityFeedPipeline({ staffObjectId: oid, limit, fromDate })
    )

    return { ok: true, data: toPlain(docs) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Team summary ──────────────────────────────────────────────────────────────

export async function getTeamSummaryAction(
  period: 'today' | 'week' | 'month' = 'today'
): Promise<ActionResult<TeamSummary>> {
  try {
    await requireSession()
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const to   = new Date()
    const from = new Date(to)

    if (period === 'today') {
      from.setUTCHours(0, 0, 0, 0)
    } else if (period === 'week') {
      from.setDate(from.getDate() - 7)
    } else {
      from.setDate(from.getDate() - 30)
    }

    const [summary] = await StaffDailyStat.aggregate<TeamSummary>(
      buildTeamSummaryPipeline(from, to)
    )

    return {
      ok: true,
      data: summary ?? {
        activeStaffCount: 0, enquiriesResolved: 0, enquiriesAssigned: 0,
        callsMade: 0, followUpsCompleted: 0, followUpsMissed: 0,
        onlineMinutes: 0, avgScore: 0,
      },
    }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

export async function getHourlyHeatmapAction(
  staffId?: string,
  days = 7
): Promise<ActionResult<HeatmapPoint[]>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const targetId =
      session.user.role === UserRole.Staff
        ? session.user.id
        : (staffId ?? session.user.id)

    const to   = new Date()
    const from = new Date(to.getTime() - days * 86_400_000)

    const docs = await ActivityLog.aggregate<HeatmapPoint>(
      buildHourlyHeatmapPipeline(toOid(targetId), from, to)
    )

    // Fill all 24 hours
    const byHour = new Map(docs.map((d) => [d.hour, d.count]))
    const points: HeatmapPoint[] = Array.from({ length: 24 }, (_, h) => ({
      hour:  h,
      count: byHour.get(h) ?? 0,
    }))

    return { ok: true, data: points }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Recompute (admin utility) ─────────────────────────────────────────────────

/**
 * Recomputes a staff member's daily stat from raw ActivityLog data.
 * Run manually or via a nightly cron.
 */
export async function recomputeDailyStatAction(
  staffId: string,
  date:    Date
): Promise<ActionResult<StaffDailyStatDocument>> {
  try {
    await requireSession()
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const oid = toOid(staffId)

    const [counts] = await ActivityLog.aggregate<Record<string, number>>(
      buildDailyStatsPipeline(oid, date)
    )

    const today = startOfDay(date)

    const sessions = await UserSession.find({
      userId:  oid,
      loginAt: { $gte: today, $lt: new Date(today.getTime() + 86_400_000) },
    }).lean()

    const onlineMinutes = sessions.reduce((acc, s) => {
      const end = s.logoutAt ?? new Date()
      return acc + Math.round((end.getTime() - s.loginAt.getTime()) / 60_000)
    }, 0)

    const data = {
      loginCount:         sessions.length,
      totalOnlineMinutes: onlineMinutes,
      firstLoginAt:       sessions[0]?.loginAt ?? null,
      lastLogoutAt:       sessions.at(-1)?.logoutAt ?? null,
      ...(counts ?? {}),
    }

    const score = computeProductivityScore(data as never)

    const stat = await StaffDailyStat.findOneAndUpdate(
      { staffId: oid, date: today },
      {
        $set: { ...data, productivityScore: score, lastComputedAt: new Date() },
        $setOnInsert: { staffId: oid, date: today },
      },
      { upsert: true, new: true }
    )

    return { ok: true, data: toPlain(stat!) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}
