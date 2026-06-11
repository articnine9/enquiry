'use server'

import mongoose from 'mongoose'
import dbConnect from '@/lib/db/connection'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { requireRole } from '@/lib/auth/session'
import { UserRole, ActivityAction, EntityType } from '@/types/enums'
import type { ActionResult, PaginatedResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  _id:        string
  action:     string
  actorId:    string
  actorName?: string
  actorRole:  string
  entityType: string
  entityId:   string
  metadata:   Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt:  string
}

export interface AuditFilters {
  actorId?:    string
  entityType?: string
  entityId?:   string
  action?:     string
  dateFrom?:   string
  dateTo?:     string
  search?:     string
  page?:       number
  pageSize?:   number
}

// ── Get audit logs (paginated + filtered) ─────────────────────────────────────

export async function getAuditLogsAction(
  filters: AuditFilters = {}
): Promise<ActionResult<PaginatedResult<AuditLogEntry>>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const page     = Math.max(filters.page     ?? 1,  1)
    const pageSize = Math.min(filters.pageSize ?? 20, 100)
    const skip     = (page - 1) * pageSize

    // Build match stage
    const match: Record<string, unknown> = {}

    if (filters.actorId) {
      match['actorId'] = new mongoose.Types.ObjectId(filters.actorId)
    }
    if (filters.entityType) {
      match['entityType'] = filters.entityType
    }
    if (filters.entityId) {
      match['entityId'] = new mongoose.Types.ObjectId(filters.entityId)
    }
    if (filters.action) {
      match['action'] = filters.action
    }
    if (filters.dateFrom || filters.dateTo) {
      match['createdAt'] = {}
      if (filters.dateFrom) {
        (match['createdAt'] as Record<string, Date>)['$gte'] =
          new Date(`${filters.dateFrom}T00:00:00.000Z`)
      }
      if (filters.dateTo) {
        (match['createdAt'] as Record<string, Date>)['$lte'] =
          new Date(`${filters.dateTo}T23:59:59.999Z`)
      }
    }

    // Aggregation with actor lookup
    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $lookup: {
                from:         'users',
                localField:   'actorId',
                foreignField: '_id',
                as:           'actor',
                pipeline:     [{ $project: { name: 1, email: 1 } }],
              },
            },
            {
              $project: {
                _id:        { $toString: '$_id' },
                action:     1,
                actorId:    { $toString: '$actorId' },
                actorName:  { $arrayElemAt: ['$actor.name', 0] },
                actorRole:  1,
                entityType: 1,
                entityId:   { $toString: '$entityId' },
                metadata:   1,
                ipAddress:  1,
                userAgent:  1,
                createdAt:  1,
              },
            },
          ],
          total: [{ $count: 'n' }],
        },
      },
    ]

    const [result] = await ActivityLog.aggregate(pipeline)
    const total    = result?.total[0]?.n ?? 0
    const data     = result?.data ?? []

    return {
      ok: true,
      data: toPlain({
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext:    page < Math.ceil(total / pageSize),
        hasPrev:    page > 1,
      }),
    }
  } catch (err: unknown) {
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to load audit logs',
    }
  }
}

// ── Get logs for a specific entity ────────────────────────────────────────────

export async function getEntityAuditLogsAction(
  entityId:   string,
  entityType: string
): Promise<ActionResult<AuditLogEntry[]>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const docs = await ActivityLog.aggregate([
      {
        $match: {
          entityId:   new mongoose.Types.ObjectId(entityId),
          entityType,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from:         'users',
          localField:   'actorId',
          foreignField: '_id',
          as:           'actor',
          pipeline:     [{ $project: { name: 1 } }],
        },
      },
      {
        $project: {
          _id:        { $toString: '$_id' },
          action:     1,
          actorId:    { $toString: '$actorId' },
          actorName:  { $arrayElemAt: ['$actor.name', 0] },
          actorRole:  1,
          entityType: 1,
          entityId:   { $toString: '$entityId' },
          metadata:   1,
          createdAt:  1,
        },
      },
    ])

    return { ok: true, data: toPlain(docs) }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Filter option helpers ─────────────────────────────────────────────────────

export async function getAuditFilterOptionsAction(): Promise<ActionResult<{
  actions:     string[]
  entityTypes: string[]
  actors:      { _id: string; name: string }[]
}>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const User = (await import('@/lib/db/models/User')).default

    const [actionsRaw, entityTypesRaw, actors] = await Promise.all([
      ActivityLog.distinct('action'),
      ActivityLog.distinct('entityType'),
      User.find(
        { role: { $in: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] } },
        { name: 1 }
      ).sort({ name: 1 }).lean(),
    ])

    return {
      ok: true,
      data: toPlain({
        actions:     actionsRaw.sort(),
        entityTypes: entityTypesRaw.sort(),
        actors:      actors.map((u) => ({ _id: String(u._id), name: u.name })),
      }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}
