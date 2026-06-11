/**
 * All MongoDB aggregation pipelines for the Staff Activity module.
 *
 * Each function returns a typed PipelineStage[] array that can be passed
 * directly to Model.aggregate().  No pipeline runs inside this file —
 * that is the server-action layer's job.
 */

import type { PipelineStage } from 'mongoose'
import { ActivityAction } from '@/types/enums'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toObjectId(id: string) {
  // Dynamic import kept out of here; caller converts before passing
  return id
}

function dayBounds(date: Date) {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

// ── 1. Daily stats pipeline ───────────────────────────────────────────────────
/**
 * Reads ActivityLog for one staff member on one day.
 * Returns a single aggregated document.
 */
export function buildDailyStatsPipeline(
  staffObjectId: unknown,
  date: Date
): PipelineStage[] {
  const { start, end } = dayBounds(date)

  return [
    {
      $match: {
        actorId:   staffObjectId,
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        enquiriesAssigned:  { $sum: { $cond: [{ $eq: ['$action', ActivityAction.EnquiryAssigned]   }, 1, 0] } },
        enquiriesResolved:  { $sum: { $cond: [{ $eq: ['$action', ActivityAction.EnquiryResolved]   }, 1, 0] } },
        enquiriesCreated:   { $sum: { $cond: [{ $eq: ['$action', ActivityAction.EnquiryCreated]    }, 1, 0] } },
        statusChanges:      { $sum: { $cond: [{ $eq: ['$action', ActivityAction.StatusChanged]     }, 1, 0] } },
        priorityChanges:    { $sum: { $cond: [{ $eq: ['$action', ActivityAction.PriorityChanged]   }, 1, 0] } },
        callsMade:          { $sum: { $cond: [{ $eq: ['$action', ActivityAction.CallMade]          }, 1, 0] } },
        callsReceived:      { $sum: { $cond: [{ $eq: ['$action', ActivityAction.CallReceived]      }, 1, 0] } },
        followUpsCreated:   { $sum: { $cond: [{ $eq: ['$action', ActivityAction.FollowUpCreated]   }, 1, 0] } },
        followUpsCompleted: { $sum: { $cond: [{ $eq: ['$action', ActivityAction.FollowUpCompleted] }, 1, 0] } },
        followUpsMissed:    { $sum: { $cond: [{ $eq: ['$action', ActivityAction.FollowUpMissed]    }, 1, 0] } },
        notesAdded:         { $sum: { $cond: [{ $eq: ['$action', ActivityAction.NoteAdded]         }, 1, 0] } },
        loginCount:         { $sum: { $cond: [{ $eq: ['$action', ActivityAction.LoginSuccess]      }, 1, 0] } },
        totalEvents:        { $sum: 1 },
      },
    },
    {
      $project: {
        _id:               0,
        enquiriesAssigned:  1,
        enquiriesResolved:  1,
        enquiriesCreated:   1,
        statusChanges:      1,
        priorityChanges:    1,
        callsMade:          1,
        callsReceived:      1,
        followUpsCreated:   1,
        followUpsCompleted: 1,
        followUpsMissed:    1,
        notesAdded:         1,
        loginCount:         1,
        totalEvents:        1,
      },
    },
  ]
}

// ── 2. Productivity trend pipeline ────────────────────────────────────────────
/**
 * Reads StaffDailyStat for N days and returns one row per day.
 * Used by the sparkline / bar chart.
 */
export function buildProductivityTrendPipeline(
  staffObjectId: unknown,
  fromDate: Date,
  toDate:   Date
): PipelineStage[] {
  const start = new Date(fromDate); start.setUTCHours(0, 0, 0, 0)
  const end   = new Date(toDate);   end.setUTCHours(23, 59, 59, 999)

  return [
    {
      $match: {
        staffId: staffObjectId,
        date:    { $gte: start, $lte: end },
      },
    },
    {
      $project: {
        _id:                0,
        date:               1,
        productivityScore:  1,
        enquiriesResolved:  1,
        callsMade:          1,
        followUpsCompleted: 1,
        totalOnlineMinutes: 1,
        loginCount:         1,
      },
    },
    { $sort: { date: 1 } },
  ]
}

// ── 3. Leaderboard pipeline ───────────────────────────────────────────────────
/**
 * Aggregates StaffDailyStat over a date range, groups by staffId,
 * joins User for name/email, sorts by total score DESC.
 */
export function buildLeaderboardPipeline(
  fromDate: Date,
  toDate:   Date,
  limit = 10
): PipelineStage[] {
  const start = new Date(fromDate); start.setUTCHours(0, 0, 0, 0)
  const end   = new Date(toDate);   end.setUTCHours(23, 59, 59, 999)

  return [
    {
      $match: { date: { $gte: start, $lte: end } },
    },
    {
      $group: {
        _id:                '$staffId',
        totalScore:         { $sum: '$productivityScore' },
        enquiriesResolved:  { $sum: '$enquiriesResolved'  },
        callsMade:          { $sum: '$callsMade'          },
        followUpsCompleted: { $sum: '$followUpsCompleted' },
        onlineMinutes:      { $sum: '$totalOnlineMinutes' },
        activeDays:         { $sum: 1 },
      },
    },
    {
      $lookup: {
        from:         'users',
        localField:   '_id',
        foreignField: '_id',
        as:           'staff',
        pipeline: [
          { $project: { name: 1, email: 1, locationZoneId: 1 } },
        ],
      },
    },
    { $unwind: { path: '$staff', preserveNullAndEmptyArrays: false } },
    {
      $project: {
        _id:                0,
        staffId:            '$_id',
        name:               '$staff.name',
        email:              '$staff.email',
        totalScore:         1,
        enquiriesResolved:  1,
        callsMade:          1,
        followUpsCompleted: 1,
        onlineMinutes:      1,
        activeDays:         1,
        avgDailyScore: {
          $cond: [
            { $gt: ['$activeDays', 0] },
            { $round: [{ $divide: ['$totalScore', '$activeDays'] }, 1] },
            0,
          ],
        },
      },
    },
    { $sort:  { totalScore: -1 } },
    { $limit: limit },
    {
      $setWindowFields: {
        sortBy: { totalScore: -1 },
        output: {
          rank: {
            $rank: {},
          },
        },
      },
    },
  ]
}

// ── 4. Activity feed pipeline ─────────────────────────────────────────────────
/**
 * Recent ActivityLog entries with actor name populated.
 * Optionally filtered to a single staff member.
 */
export function buildActivityFeedPipeline(
  options: {
    staffObjectId?: unknown
    limit?:         number
    actions?:       ActivityAction[]
    fromDate?:      Date
  } = {}
): PipelineStage[] {
  const { staffObjectId, limit = 50, actions, fromDate } = options

  const match: Record<string, unknown> = {}
  if (staffObjectId) match.actorId = staffObjectId
  if (actions?.length) match.action = { $in: actions }
  if (fromDate) match.createdAt = { $gte: fromDate }

  return [
    { $match: match },
    { $sort:  { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from:         'users',
        localField:   'actorId',
        foreignField: '_id',
        as:           'actor',
        pipeline: [
          { $project: { name: 1, email: 1 } },
        ],
      },
    },
    {
      $unwind: { path: '$actor', preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        action:      1,
        entityType:  1,
        entityId:    1,
        metadata:    1,
        createdAt:   1,
        actorId:     1,
        actorName:   '$actor.name',
        actorEmail:  '$actor.email',
      },
    },
  ]
}

// ── 5. Team summary pipeline ──────────────────────────────────────────────────
/**
 * Totals across ALL staff for a date range.
 * Used by the admin overview panel.
 */
export function buildTeamSummaryPipeline(
  fromDate: Date,
  toDate:   Date
): PipelineStage[] {
  const start = new Date(fromDate); start.setUTCHours(0, 0, 0, 0)
  const end   = new Date(toDate);   end.setUTCHours(23, 59, 59, 999)

  return [
    { $match: { date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id:                null,
        totalStaff:         { $addToSet: '$staffId' },
        enquiriesResolved:  { $sum: '$enquiriesResolved'  },
        enquiriesAssigned:  { $sum: '$enquiriesAssigned'  },
        callsMade:          { $sum: '$callsMade'          },
        followUpsCompleted: { $sum: '$followUpsCompleted' },
        followUpsMissed:    { $sum: '$followUpsMissed'    },
        onlineMinutes:      { $sum: '$totalOnlineMinutes' },
        avgScore:           { $avg: '$productivityScore'  },
      },
    },
    {
      $project: {
        _id:                0,
        activeStaffCount:   { $size: '$totalStaff' },
        enquiriesResolved:  1,
        enquiriesAssigned:  1,
        callsMade:          1,
        followUpsCompleted: 1,
        followUpsMissed:    1,
        onlineMinutes:      1,
        avgScore:           { $round: ['$avgScore', 1] },
      },
    },
  ]
}

// ── 6. Per-hour activity heatmap pipeline ─────────────────────────────────────
/**
 * Breaks down ActivityLog events by hour of day for a staff member.
 * Used by the heatmap widget to show when staff are most active.
 */
export function buildHourlyHeatmapPipeline(
  staffObjectId: unknown,
  fromDate: Date,
  toDate:   Date
): PipelineStage[] {
  const start = new Date(fromDate); start.setUTCHours(0, 0, 0, 0)
  const end   = new Date(toDate);   end.setUTCHours(23, 59, 59, 999)

  return [
    {
      $match: {
        actorId:   staffObjectId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id:   { $hour: '$createdAt' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id:   0,
        hour:  '$_id',
        count: 1,
      },
    },
    { $sort: { hour: 1 } },
  ]
}
