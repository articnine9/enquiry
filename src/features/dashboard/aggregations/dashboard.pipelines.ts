import type { PipelineStage } from 'mongoose'
import { EnquiryStatus, UserRole, UserStatus } from '@/types/enums'

// ── Date helpers ──────────────────────────────────────────────────────────────

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export function startOfMonth(): Date {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  return d
}

export function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN PIPELINES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns counts by status, source, category, priority + totals.
 * Run on the Enquiry collection.
 */
export function buildEnquiryOverviewPipeline(): PipelineStage[] {
  return [
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        bySource: [
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        total:     [{ $count: 'n' }],
        thisMonth: [
          { $match: { createdAt: { $gte: startOfMonth() } } },
          { $count: 'n' },
        ],
        resolved: [
          { $match: { status: EnquiryStatus.Resolved } },
          { $count: 'n' },
        ],
        closed: [
          { $match: { status: EnquiryStatus.Closed } },
          { $count: 'n' },
        ],
        open: [
          {
            $match: {
              status: {
                $in: [
                  EnquiryStatus.New,
                  EnquiryStatus.Assigned,
                  EnquiryStatus.InProgress,
                  EnquiryStatus.FollowUp,
                ],
              },
            },
          },
          { $count: 'n' },
        ],
      },
    },
  ]
}

/**
 * Enquiry creation trend — one data point per day for last N days.
 * Run on the Enquiry collection.
 */
export function buildEnquiryTrendPipeline(days = 30): PipelineStage[] {
  return [
    { $match: { createdAt: { $gte: daysAgo(days) } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        created:  { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$status', EnquiryStatus.Resolved] }, 1, 0],
          },
        },
        closed: {
          $sum: {
            $cond: [{ $eq: ['$status', EnquiryStatus.Closed] }, 1, 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id:      0,
        date:     '$_id',
        created:  1,
        resolved: 1,
        closed:   1,
      },
    },
  ]
}

/**
 * Staff overview — totals + by zone + by status.
 * Run on the User collection.
 */
export function buildStaffOverviewPipeline(): PipelineStage[] {
  return [
    { $match: { role: UserRole.Staff } },
    {
      $facet: {
        total:  [{ $count: 'n' }],
        active: [
          { $match: { status: UserStatus.Active } },
          { $count: 'n' },
        ],
        byZone: [
          {
            $group: {
              _id:         '$locationZoneId',
              count:       { $sum: 1 },
              activeCount: {
                $sum: { $cond: [{ $eq: ['$status', UserStatus.Active] }, 1, 0] },
              },
              totalLoad: { $sum: '$currentLoad' },
            },
          },
          {
            $lookup: {
              from:         'locationzones',
              localField:   '_id',
              foreignField: '_id',
              as:           'zone',
            },
          },
          { $unwind: { path: '$zone', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              zoneId:      '$_id',
              zoneName:    { $ifNull: ['$zone.name', 'Unassigned'] },
              count:       1,
              activeCount: 1,
              totalLoad:   1,
            },
          },
          { $sort: { count: -1 } },
        ],
      },
    },
  ]
}

/**
 * Zone performance — enquiry + resolution metrics per zone.
 * Run on the Assignment collection with lookups.
 */
export function buildZonePerformancePipeline(): PipelineStage[] {
  return [
    { $match: { status: 'active' } },
    // Get the zone for each assignment
    {
      $lookup: {
        from:         'locationzones',
        localField:   'zoneId',
        foreignField: '_id',
        as:           'zone',
      },
    },
    { $unwind: { path: '$zone', preserveNullAndEmptyArrays: true } },
    // Get the enquiry details
    {
      $lookup: {
        from:         'enquiries',
        localField:   'enquiryId',
        foreignField: '_id',
        as:           'enquiry',
      },
    },
    { $unwind: '$enquiry' },
    {
      $group: {
        _id:      { $ifNull: ['$zone._id', null] },
        zoneName: { $first: { $ifNull: ['$zone.name', 'Unassigned'] } },
        total:    { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$enquiry.status', EnquiryStatus.Resolved] }, 1, 0],
          },
        },
        closed: {
          $sum: {
            $cond: [{ $eq: ['$enquiry.status', EnquiryStatus.Closed] }, 1, 0],
          },
        },
        open: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$enquiry.status',
                  [EnquiryStatus.New, EnquiryStatus.Assigned, EnquiryStatus.InProgress, EnquiryStatus.FollowUp],
                ],
              },
              1, 0,
            ],
          },
        },
        urgent: {
          $sum: {
            $cond: [{ $eq: ['$enquiry.priority', 'urgent'] }, 1, 0],
          },
        },
        staffCount: { $addToSet: '$staffId' },
      },
    },
    {
      $project: {
        _id:        0,
        zoneId:     '$_id',
        zoneName:   1,
        total:      1,
        resolved:   1,
        closed:     1,
        open:       1,
        urgent:     1,
        staffCount: { $size: '$staffCount' },
        conversionRate: {
          $cond: [
            { $gt: ['$total', 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: [{ $add: ['$resolved', '$closed'] }, '$total'] },
                    100,
                  ],
                },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { total: -1 } },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER PIPELINES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Team performance — per-staff stats from StaffDailyStat.
 * Pass dateFrom/dateTo for a range (default: today).
 */
export function buildTeamPerformancePipeline(params: {
  dateFrom?: Date
  dateTo?:   Date
  zoneId?:   string
}): PipelineStage[] {
  const from = params.dateFrom ?? startOfToday()
  const to   = params.dateTo   ?? endOfToday()

  const pipeline: PipelineStage[] = [
    { $match: { date: { $gte: from, $lte: to } } },
    {
      $group: {
        _id:                '_id',
        staffId:            { $first: '$staffId' },
        enquiriesAssigned:  { $sum: '$enquiriesAssigned' },
        enquiriesResolved:  { $sum: '$enquiriesResolved' },
        callsMade:          { $sum: '$callsMade' },
        followUpsCompleted: { $sum: '$followUpsCompleted' },
        totalOnlineMinutes: { $sum: '$totalOnlineMinutes' },
        avgScore: {
          $avg: '$productivityScore',
        },
      },
    },
    {
      $lookup: {
        from:         'users',
        localField:   'staffId',
        foreignField: '_id',
        as:           'user',
      },
    },
    { $unwind: '$user' },
  ]

  if (params.zoneId) {
    pipeline.push({
      $match: { 'user.locationZoneId': params.zoneId },
    } as PipelineStage)
  }

  pipeline.push(
    {
      $project: {
        _id:                0,
        staffId:            { $toString: '$staffId' },
        name:               '$user.name',
        email:              '$user.email',
        avatar:             '$user.avatar',
        enquiriesAssigned:  1,
        enquiriesResolved:  1,
        callsMade:          1,
        followUpsCompleted: 1,
        totalOnlineMinutes: 1,
        avgScore:           { $round: ['$avgScore', 0] },
        resolutionRate: {
          $cond: [
            { $gt: ['$enquiriesAssigned', 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$enquiriesResolved', '$enquiriesAssigned'] },
                    100,
                  ],
                },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { avgScore: -1 } }
  )

  return pipeline
}

/**
 * Pending enquiries summary — grouped by priority and age bucket.
 * Run on Enquiry collection.
 */
export function buildPendingEnquiriesPipeline(zoneId?: string): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        status: {
          $in: [
            EnquiryStatus.New,
            EnquiryStatus.Assigned,
            EnquiryStatus.InProgress,
            EnquiryStatus.FollowUp,
          ],
        },
      },
    },
  ]

  if (zoneId) {
    pipeline.push({ $match: { zoneId } } as PipelineStage)
  }

  pipeline.push(
    // Age in hours
    {
      $addFields: {
        ageHours: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            3_600_000,
          ],
        },
      },
    } as PipelineStage,
    {
      $facet: {
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        ageBuckets: [
          {
            $bucket: {
              groupBy: '$ageHours',
              boundaries: [0, 24, 48, 72, 168],
              default: '168+',
              output: { count: { $sum: 1 } },
            },
          },
        ],
        oldest: [
          { $sort: { createdAt: 1 } },
          { $limit: 5 },
          {
            $lookup: {
              from:         'users',
              localField:   'assignedTo',
              foreignField: '_id',
              as:           'assignee',
            },
          },
          {
            $project: {
              _id:        { $toString: '$_id' },
              enquiryNo:  1,
              name:       1,
              status:     1,
              priority:   1,
              createdAt:  1,
              ageHours:   { $round: ['$ageHours', 0] },
              assignee:   { $arrayElemAt: ['$assignee.name', 0] },
            },
          },
        ],
        unassigned: [
          { $match: { assignedTo: null } },
          { $count: 'n' },
        ],
        total: [{ $count: 'n' }],
      },
    } as PipelineStage
  )

  return pipeline
}

/**
 * Follow-up summary for a manager — today due, overdue, upcoming, completion rate.
 * Run on FollowUp collection.
 */
export function buildFollowUpSummaryPipeline(zoneStaffIds?: string[]): PipelineStage[] {
  const now   = new Date()
  const today = startOfToday()
  const eod   = endOfToday()

  const baseMatch: Record<string, unknown> = { status: { $in: ['scheduled', 'missed'] } }
  if (zoneStaffIds?.length) {
    baseMatch['createdBy'] = { $in: zoneStaffIds }
  }

  return [
    { $match: baseMatch },
    {
      $facet: {
        todayDue: [
          { $match: { scheduledAt: { $gte: today, $lte: eod }, status: 'scheduled' } },
          { $count: 'n' },
        ],
        overdue: [
          { $match: { scheduledAt: { $lt: now }, status: { $in: ['scheduled', 'missed'] } } },
          { $count: 'n' },
        ],
        upcoming: [
          {
            $match: {
              scheduledAt: { $gt: eod, $lte: new Date(now.getTime() + 7 * 86_400_000) },
              status: 'scheduled',
            },
          },
          { $count: 'n' },
        ],
        completedToday: [
          {
            $match: {
              completedAt: { $gte: today, $lte: eod },
              status: 'completed',
            },
          },
          { $count: 'n' },
        ],
        byType: [
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        todayList: [
          {
            $match: {
              scheduledAt: { $gte: today, $lte: eod },
              status: 'scheduled',
            },
          },
          { $sort: { scheduledAt: 1 } },
          { $limit: 10 },
          {
            $lookup: {
              from:         'enquiries',
              localField:   'enquiryId',
              foreignField: '_id',
              as:           'enquiry',
            },
          },
          {
            $lookup: {
              from:         'users',
              localField:   'createdBy',
              foreignField: '_id',
              as:           'staff',
            },
          },
          {
            $project: {
              _id:         { $toString: '$_id' },
              type:        1,
              scheduledAt: 1,
              enquiryNo:   { $arrayElemAt: ['$enquiry.enquiryNo', 0] },
              enquiryId:   { $toString: '$enquiryId' },
              staffName:   { $arrayElemAt: ['$staff.name', 0] },
              notes:       1,
            },
          },
        ],
      },
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF PIPELINES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Staff's own enquiry summary — counts by status + recent list.
 * Run on Enquiry collection.
 */
export function buildMyEnquiriesPipeline(staffId: string): PipelineStage[] {
  const { Types } = require('mongoose') as typeof import('mongoose')
  const oid = new Types.ObjectId(staffId)

  return [
    { $match: { assignedTo: oid } },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        total:   [{ $count: 'n' }],
        active:  [
          {
            $match: {
              status: {
                $in: [EnquiryStatus.Assigned, EnquiryStatus.InProgress, EnquiryStatus.FollowUp],
              },
            },
          },
          { $count: 'n' },
        ],
        resolvedToday: [
          {
            $match: {
              status:     EnquiryStatus.Resolved,
              updatedAt:  { $gte: startOfToday() },
            },
          },
          { $count: 'n' },
        ],
        recentActive: [
          {
            $match: {
              status: {
                $in: [EnquiryStatus.Assigned, EnquiryStatus.InProgress, EnquiryStatus.FollowUp],
              },
            },
          },
          { $sort: { updatedAt: -1 } },
          { $limit: 8 },
          {
            $project: {
              _id:        { $toString: '$_id' },
              enquiryNo:  1,
              name:       1,
              status:     1,
              priority:   1,
              updatedAt:  1,
              createdAt:  1,
            },
          },
        ],
      },
    },
  ]
}

/**
 * Staff's today follow-ups + overdue.
 * Run on FollowUp collection.
 */
export function buildMyFollowUpsPipeline(staffId: string): PipelineStage[] {
  const { Types } = require('mongoose') as typeof import('mongoose')
  const oid   = new Types.ObjectId(staffId)
  const today = startOfToday()
  const eod   = endOfToday()
  const now   = new Date()

  return [
    { $match: { createdBy: oid } },
    {
      $facet: {
        todayDue: [
          {
            $match: {
              scheduledAt: { $gte: today, $lte: eod },
              status: 'scheduled',
            },
          },
          { $sort: { scheduledAt: 1 } },
          { $limit: 10 },
          {
            $lookup: {
              from:         'enquiries',
              localField:   'enquiryId',
              foreignField: '_id',
              as:           'enquiry',
            },
          },
          {
            $project: {
              _id:         { $toString: '$_id' },
              type:        1,
              scheduledAt: 1,
              notes:       1,
              enquiryId:   { $toString: '$enquiryId' },
              enquiryNo:   { $arrayElemAt: ['$enquiry.enquiryNo', 0] },
              enquiryName: { $arrayElemAt: ['$enquiry.name', 0] },
            },
          },
        ],
        overdue: [
          {
            $match: {
              scheduledAt: { $lt: now },
              status: { $in: ['scheduled', 'missed'] },
            },
          },
          { $sort: { scheduledAt: 1 } },
          { $limit: 5 },
          {
            $lookup: {
              from:         'enquiries',
              localField:   'enquiryId',
              foreignField: '_id',
              as:           'enquiry',
            },
          },
          {
            $project: {
              _id:         { $toString: '$_id' },
              type:        1,
              scheduledAt: 1,
              notes:       1,
              enquiryId:   { $toString: '$enquiryId' },
              enquiryNo:   { $arrayElemAt: ['$enquiry.enquiryNo', 0] },
              enquiryName: { $arrayElemAt: ['$enquiry.name', 0] },
            },
          },
        ],
        todayCount:  [
          { $match: { scheduledAt: { $gte: today, $lte: eod }, status: 'scheduled' } },
          { $count: 'n' },
        ],
        overdueCount: [
          { $match: { scheduledAt: { $lt: now }, status: { $in: ['scheduled', 'missed'] } } },
          { $count: 'n' },
        ],
        completedToday: [
          { $match: { completedAt: { $gte: today }, status: 'completed' } },
          { $count: 'n' },
        ],
      },
    },
  ]
}

/**
 * Staff pending tasks — enquiries needing action + overdue follow-ups.
 * Run on Enquiry collection.
 */
export function buildMyPendingTasksPipeline(staffId: string): PipelineStage[] {
  const { Types } = require('mongoose') as typeof import('mongoose')
  const oid = new Types.ObjectId(staffId)

  return [
    {
      $match: {
        assignedTo: oid,
        status: {
          $in: [EnquiryStatus.Assigned, EnquiryStatus.InProgress, EnquiryStatus.FollowUp],
        },
      },
    },
    {
      $addFields: {
        ageHours: {
          $divide: [{ $subtract: [new Date(), '$createdAt'] }, 3_600_000],
        },
      },
    },
    { $sort: { priority: 1, createdAt: 1 } },
    { $limit: 10 },
    {
      $project: {
        _id:       { $toString: '$_id' },
        enquiryNo: 1,
        name:      1,
        status:    1,
        priority:  1,
        createdAt: 1,
        updatedAt: 1,
        ageHours:  { $round: ['$ageHours', 0] },
      },
    },
  ]
}
