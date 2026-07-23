import type { PipelineStage } from 'mongoose'
import { EnquiryStatus, UserRole, LEAD_STAGE_CONVERTED } from '@/types/enums'
import type { ReportFilters } from '../types/report.types'

// ── Shared helpers ────────────────────────────────────────────────────────────

function dateRange(filters: ReportFilters) {
  return {
    $gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
    $lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
  }
}

function addPctField(total: number): PipelineStage {
  return {
    $addFields: {
      pct: {
        $cond: [
          { $gt: [total, 0] },
          { $round: [{ $multiply: [{ $divide: ['$count', total] }, 100] }, 1] },
          0,
        ],
      },
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENQUIRY SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export function buildEnquiryReportPipeline(filters: ReportFilters): PipelineStage[] {
  const match: Record<string, unknown> = {}

  if (filters.status)   match['status']        = filters.status
  if (filters.priority) match['priority']      = filters.priority
  if (filters.source)   match['enquirySource'] = filters.source
  if (filters.category) match['category']      = filters.category

  const rangeMatch: Record<string, unknown> = {
    ...match,
    createdAt: dateRange(filters),
  }

  return [
    {
      $facet: {
        // All-time totals (not range-filtered) for comparison context
        allTotals: [
          { $match: match },
          {
            $group: {
              _id:       null,
              total:     { $sum: 1 },
              open:      { $sum: { $cond: [{ $in: ['$status', [EnquiryStatus.New, EnquiryStatus.Assigned, EnquiryStatus.InProgress, EnquiryStatus.FollowUp]] }, 1, 0] } },
              resolved:  { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Resolved] }, 1, 0] } },
              closed:    { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Closed] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Cancelled] }, 1, 0] } },
            },
          },
        ],
        // Range-specific count
        inRange: [
          { $match: rangeMatch },
          { $count: 'n' },
        ],
        // Distribution facets — scoped to range
        byStatus: [
          { $match: rangeMatch },
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        bySource: [
          { $match: rangeMatch },
          { $group: { _id: '$enquirySource', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byCategory: [
          { $match: rangeMatch },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byPriority: [
          { $match: rangeMatch },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        // Daily creation trend
        dailyTrend: [
          { $match: rangeMatch },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              created:  { $sum: 1 },
              resolved: { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Resolved] }, 1, 0] } },
              closed:   { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Closed] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', created: 1, resolved: 1, closed: 1 } },
        ],
        // Avg resolution time (in hours) for resolved enquiries in range
        avgResolution: [
          {
            $match: {
              ...rangeMatch,
              status: { $in: [EnquiryStatus.Resolved, EnquiryStatus.Closed] },
              updatedAt: { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              avg: {
                $avg: {
                  $divide: [
                    { $subtract: ['$updatedAt', '$createdAt'] },
                    3_600_000,
                  ],
                },
              },
            },
          },
        ],
        // Recent rows for the table
        recentRows: [
          { $match: rangeMatch },
          { $sort: { createdAt: -1 } },
          { $limit: 50 },
          {
            $lookup: {
              from:         'users',
              localField:   'assignedTo',
              foreignField: '_id',
              as:           'assigneeDoc',
            },
          },
          {
            $addFields: {
              ageHours: {
                $round: [
                  { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 3_600_000] },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              _id:       { $toString: '$_id' },
              enquiryNo: 1,
              name:      '$customerName',
              status:    1,
              priority:  1,
              source:    '$enquirySource',
              category:  1,
              createdAt: 1,
              updatedAt: 1,
              ageHours:  1,
              assignee:  { $arrayElemAt: ['$assigneeDoc.name', 0] },
            },
          },
        ],
      },
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. STAFF PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

export function buildStaffPerformanceReportPipeline(filters: ReportFilters): PipelineStage[] {
  const dateMatch: Record<string, unknown> = {
    date: {
      $gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
      $lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
    },
  }

  if (filters.staffId) {
    const { Types } = require('mongoose') as typeof import('mongoose')
    dateMatch['staffId'] = new Types.ObjectId(filters.staffId)
  }

  return [
    { $match: dateMatch },
    // Aggregate per-staff over the date range
    {
      $group: {
        _id:                '$staffId',
        activeDays:         { $sum: 1 },
        enquiriesAssigned:  { $sum: '$enquiriesAssigned' },
        enquiriesResolved:  { $sum: '$enquiriesResolved' },
        callsMade:          { $sum: '$callsMade' },
        callsReceived:      { $sum: '$callsReceived' },
        followUpsCompleted: { $sum: '$followUpsCompleted' },
        followUpsMissed:    { $sum: '$followUpsMissed' },
        notesAdded:         { $sum: '$notesAdded' },
        statusChanges:      { $sum: '$statusChanges' },
        totalOnlineMinutes: { $sum: '$totalOnlineMinutes' },
        avgScore:           { $avg: '$productivityScore' },
        totalScore:         { $sum: '$productivityScore' },
      },
    },
    // Join user details + zone
    {
      $lookup: {
        from:         'users',
        localField:   '_id',
        foreignField: '_id',
        as:           'user',
      },
    },
    { $unwind: '$user' },
    // Optional zone filter
    ...(filters.zoneId
      ? [{ $match: { 'user.locationZoneId': filters.zoneId } } as PipelineStage]
      : []
    ),
    // Join zone name
    {
      $lookup: {
        from:         'locationzones',
        localField:   'user.locationZoneId',
        foreignField: '_id',
        as:           'zone',
      },
    },
    {
      $addFields: {
        resolutionRate: {
          $cond: [
            { $gt: ['$enquiriesAssigned', 0] },
            { $round: [{ $multiply: [{ $divide: ['$enquiriesResolved', '$enquiriesAssigned'] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    {
      $project: {
        _id:                0,
        staffId:            { $toString: '$_id' },
        name:               '$user.name',
        email:              '$user.email',
        zoneName:           { $ifNull: [{ $arrayElemAt: ['$zone.name', 0] }, 'Unassigned'] },
        activeDays:         1,
        enquiriesAssigned:  1,
        enquiriesResolved:  1,
        resolutionRate:     1,
        callsMade:          1,
        callsReceived:      1,
        followUpsCompleted: 1,
        followUpsMissed:    1,
        notesAdded:         1,
        statusChanges:      1,
        totalOnlineMinutes: 1,
        avgScore:           { $round: ['$avgScore', 0] },
        totalScore:         1,
      },
    },
    { $sort: { avgScore: -1 } },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ZONE PERFORMANCE
// ─────────────────────────────────────────────────────────────────────────────

export function buildZonePerformanceReportPipeline(filters: ReportFilters): PipelineStage[] {
  const createdAtRange = dateRange(filters)

  const pipeline: PipelineStage[] = [
    { $match: { createdAt: createdAtRange } },
    // Join active assignment to get zone
    {
      $lookup: {
        from:     'assignments',
        let:      { eId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$enquiryId', '$$eId'] } } },
          { $sort: { assignedAt: -1 } },
          { $limit: 1 },
        ],
        as: 'latestAssignment',
      },
    },
    {
      $addFields: {
        zoneId: { $arrayElemAt: ['$latestAssignment.zoneId', 0] },
        ageHours: {
          $divide: [{ $subtract: [new Date(), '$createdAt'] }, 3_600_000],
        },
      },
    },
    // Group by zone
    {
      $group: {
        _id:       '$zoneId',
        total:     { $sum: 1 },
        open:      { $sum: { $cond: [{ $in: ['$status', [EnquiryStatus.New, EnquiryStatus.Assigned, EnquiryStatus.InProgress, EnquiryStatus.FollowUp]] }, 1, 0] } },
        resolved:  { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Resolved] }, 1, 0] } },
        closed:    { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Closed] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Cancelled] }, 1, 0] } },
        urgent:    { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        avgResHrs: { $avg: { $cond: [{ $in: ['$status', [EnquiryStatus.Resolved, EnquiryStatus.Closed]] }, '$ageHours', null] } },
      },
    },
    // Lookup zone details
    {
      $lookup: {
        from:         'locationzones',
        localField:   '_id',
        foreignField: '_id',
        as:           'zone',
      },
    },
    // Lookup staff count in zone
    {
      $lookup: {
        from:     'users',
        let:      { zId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$locationZoneId', '$$zId'] }, role: UserRole.Staff } },
          { $count: 'n' },
        ],
        as: 'staffCountDocs',
      },
    },
    // Lookup total staff load in zone
    {
      $lookup: {
        from:     'users',
        let:      { zId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$locationZoneId', '$$zId'] }, role: UserRole.Staff } },
          { $group: { _id: null, totalLoad: { $sum: '$currentLoad' }, count: { $sum: 1 } } },
        ],
        as: 'staffLoadDocs',
      },
    },
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $round: [{ $multiply: [{ $divide: [{ $add: ['$resolved', '$closed'] }, '$total'] }, 100] }, 1] },
            0,
          ],
        },
        staffCount: { $ifNull: [{ $arrayElemAt: ['$staffCountDocs.n', 0] }, 0] },
        avgLoad: {
          $cond: [
            { $gt: [{ $arrayElemAt: ['$staffLoadDocs.count', 0] }, 0] },
            { $round: [{ $divide: [{ $arrayElemAt: ['$staffLoadDocs.totalLoad', 0] }, { $arrayElemAt: ['$staffLoadDocs.count', 0] }] }, 1] },
            0,
          ],
        },
      },
    },
    ...(filters.zoneId
      ? [{ $match: { _id: filters.zoneId } } as PipelineStage]
      : []
    ),
    {
      $project: {
        _id:                0,
        zoneId:             { $toString: { $ifNull: ['$_id', 'null'] } },
        zoneName:           { $ifNull: [{ $arrayElemAt: ['$zone.name', 0] }, 'Unassigned'] },
        total:              1,
        open:               1,
        resolved:           1,
        closed:             1,
        cancelled:          1,
        urgent:             1,
        staffCount:         1,
        avgLoad:            1,
        conversionRate:     1,
        avgResolutionHours: { $round: ['$avgResHrs', 1] },
      },
    },
    { $sort: { total: -1 } },
  ]

  return pipeline
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FOLLOW-UP REPORT
// ─────────────────────────────────────────────────────────────────────────────

export function buildFollowUpReportPipeline(filters: ReportFilters): PipelineStage[] {
  const scheduledRange = {
    $gte: new Date(`${filters.dateFrom}T00:00:00.000Z`),
    $lte: new Date(`${filters.dateTo}T23:59:59.999Z`),
  }

  const baseMatch: Record<string, unknown> = {
    scheduledAt: scheduledRange,
  }

  if (filters.staffId) {
    const { Types } = require('mongoose') as typeof import('mongoose')
    baseMatch['createdBy'] = new Types.ObjectId(filters.staffId)
  }

  return [
    { $match: baseMatch },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id:       null,
              scheduled:  { $sum: 1 },
              completed:  { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              missed:     { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
              cancelled:  { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
              pending:    { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
            },
          },
        ],
        byType: [
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byOutcome: [
          {
            $match: { status: 'completed', outcome: { $exists: true } },
          },
          { $group: { _id: '$outcome', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        avgCompletion: [
          {
            $match: {
              status: 'completed',
              completedAt: { $exists: true },
            },
          },
          {
            $group: {
              _id: null,
              avg: {
                $avg: {
                  $divide: [
                    { $subtract: ['$completedAt', '$createdAt'] },
                    86_400_000, // ms → days
                  ],
                },
              },
            },
          },
        ],
        dailyTrend: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledAt' } },
              scheduled:  { $sum: 1 },
              completed:  { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              missed:     { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', scheduled: 1, completed: 1, missed: 1 } },
        ],
        byStaff: [
          {
            $group: {
              _id:       '$createdBy',
              scheduled:  { $sum: 1 },
              completed:  { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              missed:     { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
            },
          },
          {
            $lookup: {
              from:         'users',
              localField:   '_id',
              foreignField: '_id',
              as:           'staff',
            },
          },
          { $unwind: '$staff' },
          {
            $addFields: {
              completionRate: {
                $cond: [
                  { $gt: ['$scheduled', 0] },
                  { $round: [{ $multiply: [{ $divide: ['$completed', '$scheduled'] }, 100] }, 1] },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              _id:            0,
              staffId:        { $toString: '$_id' },
              staffName:      '$staff.name',
              scheduled:      1,
              completed:      1,
              missed:         1,
              completionRate: 1,
            },
          },
          { $sort: { completionRate: -1 } },
        ],
      },
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONVERSION FUNNEL
// ─────────────────────────────────────────────────────────────────────────────

export function buildConversionFunnelPipeline(filters: ReportFilters): PipelineStage[] {
  const createdAtRange = dateRange(filters)

  const match: Record<string, unknown> = { createdAt: createdAtRange }
  if (filters.zoneId) {
    // filter handled post-lookup
  }

  return [
    { $match: match },
    {
      $group: {
        _id:       '$leadStage',
        count:     { $sum: 1 },
      },
    },
    {
      $group: {
        _id:    null,
        stages: { $push: { status: '$_id', count: '$count' } },
        total:  { $sum: '$count' },
      },
    },
    {
      $project: {
        _id:    0,
        stages: 1,
        total:  1,
      },
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MARKETING DASHBOARD — leads generated, by source, conversion by source
// ─────────────────────────────────────────────────────────────────────────────

export function buildMarketingReportPipeline(filters: ReportFilters): PipelineStage[] {
  const match: Record<string, unknown> = { createdAt: dateRange(filters) }

  return [
    { $match: match },
    {
      $group: {
        _id:       '$enquirySource',
        leads:     { $sum: 1 },
        converted: { $sum: { $cond: [{ $in: ['$leadStage', LEAD_STAGE_CONVERTED] }, 1, 0] } },
      },
    },
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $gt: ['$leads', 0] },
            { $round: [{ $multiply: [{ $divide: ['$converted', '$leads'] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    {
      $project: {
        _id:    0,
        source: '$_id',
        leads: 1,
        converted: 1,
        conversionRate: 1,
      },
    },
    { $sort: { leads: -1 } },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. STAFF LEAD STATS — leads assigned/converted/revenue, by staff (Enquiry-based,
//    distinct from buildStaffPerformanceReportPipeline which reads StaffDailyStat
//    activity counters — this reads leadStage/dealValue directly off Enquiry)
// ─────────────────────────────────────────────────────────────────────────────

export function buildStaffLeadStatsPipeline(filters: ReportFilters): PipelineStage[] {
  const match: Record<string, unknown> = {
    createdAt:  dateRange(filters),
    assignedTo: { $exists: true, $ne: null },
  }

  if (filters.staffId) {
    const { Types } = require('mongoose') as typeof import('mongoose')
    match['assignedTo'] = new Types.ObjectId(filters.staffId)
  }

  return [
    { $match: match },
    {
      $group: {
        _id:              '$assignedTo',
        leadsAssigned:    { $sum: 1 },
        leadsConverted:   { $sum: { $cond: [{ $in: ['$leadStage', LEAD_STAGE_CONVERTED] }, 1, 0] } },
        revenueGenerated: { $sum: { $ifNull: ['$dealValue', 0] } },
      },
    },
    {
      $addFields: {
        leadConversionRate: {
          $cond: [
            { $gt: ['$leadsAssigned', 0] },
            { $round: [{ $multiply: [{ $divide: ['$leadsConverted', '$leadsAssigned'] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    {
      $project: {
        _id:                0,
        staffId:            { $toString: '$_id' },
        leadsAssigned:      1,
        leadsConverted:     1,
        leadConversionRate: 1,
        revenueGenerated:   1,
      },
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DEALER / DISTRIBUTOR PERFORMANCE — leads received/converted, conversion %
// ─────────────────────────────────────────────────────────────────────────────

function buildChannelPerformancePipeline(
  filters: ReportFilters,
  channelField: 'dealerId' | 'distributorId',
  lookupCollection: string
): PipelineStage[] {
  const match: Record<string, unknown> = {
    createdAt: dateRange(filters),
    [channelField]: { $exists: true, $ne: null },
  }

  const filterId = channelField === 'dealerId' ? filters.dealerId : filters.distributorId
  if (filterId) {
    const { Types } = require('mongoose') as typeof import('mongoose')
    match[channelField] = new Types.ObjectId(filterId)
  }

  return [
    { $match: match },
    {
      $group: {
        _id:            `$${channelField}`,
        leadsReceived:  { $sum: 1 },
        leadsConverted: { $sum: { $cond: [{ $in: ['$leadStage', LEAD_STAGE_CONVERTED] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from:         lookupCollection,
        localField:   '_id',
        foreignField: '_id',
        as:           'entity',
      },
    },
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $gt: ['$leadsReceived', 0] },
            { $round: [{ $multiply: [{ $divide: ['$leadsConverted', '$leadsReceived'] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    {
      $project: {
        _id:            0,
        id:             { $toString: '$_id' },
        name:           { $ifNull: [{ $arrayElemAt: ['$entity.name', 0] }, 'Unknown'] },
        leadsReceived:  1,
        leadsConverted: 1,
        conversionRate: 1,
      },
    },
    { $sort: { leadsReceived: -1 } },
  ]
}

export function buildDealerPerformancePipeline(filters: ReportFilters): PipelineStage[] {
  return buildChannelPerformancePipeline(filters, 'dealerId', 'dealers')
}

export function buildDistributorPerformancePipeline(filters: ReportFilters): PipelineStage[] {
  return buildChannelPerformancePipeline(filters, 'distributorId', 'distributors')
}
