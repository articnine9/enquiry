'use server'

import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import FollowUp, { FollowUpStatus } from '@/lib/db/models/FollowUp'
import Enquiry from '@/lib/db/models/Enquiry'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { requireSession } from '@/lib/auth/session'
import { authErrorToResult } from '@/lib/auth/session'
import { CACHE_TAGS } from '@/lib/cache'
import { ActivityAction, EntityType } from '@/types/enums'
import {
  CreateFollowUpSchema,
  UpdateFollowUpSchema,
  CloseFollowUpSchema,
  DismissReminderSchema,
  FollowUpFilterSchema,
} from '../validations/followup.schema'
import type { ActionResult, PaginatedResult } from '@/types/api'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

function reminderDate(scheduledAt: Date, offsetMinutes?: number | null): Date | null {
  if (!offsetMinutes) return null
  return new Date(scheduledAt.getTime() - offsetMinutes * 60_000)
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createFollowUpAction(
  _prev: ActionResult<FollowUpDocument> | null,
  formData: FormData
): Promise<ActionResult<FollowUpDocument>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const raw = {
      enquiryId:            formData.get('enquiryId'),
      type:                 formData.get('type'),
      notes:                formData.get('notes'),
      internalNotes:        formData.get('internalNotes') || undefined,
      scheduledAt:          formData.get('scheduledAt'),
      durationMinutes:      formData.get('durationMinutes') || undefined,
      nextFollowUpDate:     formData.get('nextFollowUpDate') || undefined,
      nextFollowUpType:     formData.get('nextFollowUpType') || undefined,
      reminderOffsetMinutes: formData.get('reminderOffsetMinutes') || undefined,
      tags:                 formData.get('tags') || undefined,
    }

    const parsed = CreateFollowUpSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const { reminderOffsetMinutes, ...data } = parsed.data

    const followUp = await FollowUp.create({
      ...data,
      createdBy:  session.user.id,
      status:     FollowUpStatus.Scheduled,
      reminderAt: reminderDate(data.scheduledAt, reminderOffsetMinutes),
    })

    await ActivityLog.create({
      userId:      session.user.id,
      action:      ActivityAction.FollowUpCreated,
      entityType:  EntityType.FollowUp,
      entityId:    followUp._id,
      description: `Follow-up scheduled for ${data.scheduledAt.toLocaleDateString()}`,
      metadata:    { enquiryId: data.enquiryId, type: data.type },
    })

    revalidateTag(CACHE_TAGS.followUps)
    revalidateTag(CACHE_TAGS.enquiry(String(data.enquiryId)))

    return { ok: true, data: toPlain(followUp) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateFollowUpAction(
  id: string,
  _prev: ActionResult<FollowUpDocument> | null,
  formData: FormData
): Promise<ActionResult<FollowUpDocument>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const raw = {
      type:                 formData.get('type')          || undefined,
      notes:                formData.get('notes')         || undefined,
      internalNotes:        formData.get('internalNotes') || undefined,
      scheduledAt:          formData.get('scheduledAt')   || undefined,
      durationMinutes:      formData.get('durationMinutes') || undefined,
      nextFollowUpDate:     formData.get('nextFollowUpDate') || undefined,
      nextFollowUpType:     formData.get('nextFollowUpType') || undefined,
      reminderOffsetMinutes: formData.get('reminderOffsetMinutes') || undefined,
      tags:                 formData.get('tags') || undefined,
    }

    const parsed = UpdateFollowUpSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const existing = await FollowUp.findById(id)
    if (!existing) return { ok: false, error: 'Follow-up not found' }
    if (existing.status !== FollowUpStatus.Scheduled) {
      return { ok: false, error: 'Only scheduled follow-ups can be edited' }
    }

    const { reminderOffsetMinutes, ...data } = parsed.data as typeof parsed.data & {
      reminderOffsetMinutes?: number | null
    }

    const update: Record<string, unknown> = { ...data }

    // Recompute reminder if scheduledAt or offset changed
    if (reminderOffsetMinutes !== undefined || data.scheduledAt) {
      const baseDate = data.scheduledAt ?? existing.scheduledAt
      update.reminderAt = reminderDate(baseDate, reminderOffsetMinutes)
      // Reset sentAt so the new reminder fires
      if (update.reminderAt) update.reminderSentAt = null
    }

    const followUp = await FollowUp.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    )
    if (!followUp) return { ok: false, error: 'Follow-up not found' }

    await ActivityLog.create({
      userId:      session.user.id,
      action:      ActivityAction.FollowUpUpdated,
      entityType:  EntityType.FollowUp,
      entityId:    id,
      description: 'Follow-up updated',
      metadata:    { enquiryId: followUp.enquiryId, changes: Object.keys(data) },
    })

    revalidateTag(CACHE_TAGS.followUps)
    revalidateTag(CACHE_TAGS.enquiry(String(followUp.enquiryId)))

    return { ok: true, data: toPlain(followUp) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Close (complete / cancel / mark missed) ───────────────────────────────────

export async function closeFollowUpAction(
  _prev: ActionResult<FollowUpDocument> | null,
  formData: FormData
): Promise<ActionResult<FollowUpDocument>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const raw = {
      id:              formData.get('id'),
      status:          formData.get('status'),
      outcome:         formData.get('outcome')   || undefined,
      completedAt:     formData.get('completedAt') || undefined,
      durationMinutes: formData.get('durationMinutes') || undefined,
      notes:           formData.get('notes')     || undefined,
      nextFollowUpDate: formData.get('nextFollowUpDate') || undefined,
      nextFollowUpType: formData.get('nextFollowUpType') || undefined,
    }

    const parsed = CloseFollowUpSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const { id, ...data } = parsed.data

    const existing = await FollowUp.findById(id)
    if (!existing) return { ok: false, error: 'Follow-up not found' }
    if (existing.status !== FollowUpStatus.Scheduled) {
      return { ok: false, error: `Follow-up is already ${existing.status}` }
    }

    const update: Record<string, unknown> = {
      status:      data.status,
      outcome:     data.outcome      ?? existing.outcome,
      completedAt: data.completedAt  ?? new Date(),
      notes:       data.notes        ?? existing.notes,
    }
    if (data.durationMinutes) update.durationMinutes = data.durationMinutes
    if (data.nextFollowUpDate) {
      update.nextFollowUpDate = data.nextFollowUpDate
      update.nextFollowUpType = data.nextFollowUpType ?? null
    }

    const followUp = await FollowUp.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    )
    if (!followUp) return { ok: false, error: 'Follow-up not found' }

    // Auto-create the next follow-up if a date was provided
    let nextFollowUp: FollowUpDocument | null = null
    if (data.nextFollowUpDate && data.nextFollowUpType) {
      nextFollowUp = await FollowUp.create({
        enquiryId:   followUp.enquiryId,
        createdBy:   session.user.id,
        type:        data.nextFollowUpType,
        status:      FollowUpStatus.Scheduled,
        scheduledAt: data.nextFollowUpDate,
        notes:       `Continuation from follow-up on ${new Date().toLocaleDateString()}`,
      })
    }

    // Update enquiry status → follow_up if currently in_progress
    await Enquiry.updateOne(
      { _id: followUp.enquiryId, status: 'in_progress' },
      { $set: { status: 'follow_up' } }
    )

    const actionName =
      data.status === FollowUpStatus.Completed
        ? ActivityAction.FollowUpCompleted
        : ActivityAction.FollowUpUpdated

    await ActivityLog.create({
      userId:      session.user.id,
      action:      actionName,
      entityType:  EntityType.FollowUp,
      entityId:    id,
      description: `Follow-up ${data.status}${data.outcome ? ` — ${data.outcome}` : ''}`,
      metadata: {
        enquiryId:     followUp.enquiryId,
        outcome:       data.outcome,
        nextFollowUpId: nextFollowUp?._id ?? null,
      },
    })

    revalidateTag(CACHE_TAGS.followUps)
    revalidateTag(CACHE_TAGS.enquiry(String(followUp.enquiryId)))

    return { ok: true, data: toPlain(followUp) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Dismiss reminder ──────────────────────────────────────────────────────────

export async function dismissReminderAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await requireSession()
    await dbConnect()

    const parsed = DismissReminderSchema.safeParse({ id })
    if (!parsed.success) return { ok: false, error: 'Invalid ID' }

    await FollowUp.findByIdAndUpdate(id, {
      $set: { reminderDismissed: true },
    })

    revalidateTag(CACHE_TAGS.followUps)
    return { ok: true, data: undefined }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Read: enquiry history ─────────────────────────────────────────────────────

export async function getFollowUpsForEnquiry(
  enquiryId: string
): Promise<ActionResult<FollowUpDocument[]>> {
  try {
    await requireSession()
    await dbConnect()

    const docs = await FollowUp.findForEnquiry(enquiryId)
    return { ok: true, data: toPlain(docs) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Read: upcoming (for reminder panel / dashboard) ───────────────────────────

export async function getUpcomingFollowUps(
  days = 7
): Promise<ActionResult<FollowUpDocument[]>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const docs = await FollowUp.findUpcoming(session.user.id, days)
    return { ok: true, data: toPlain(docs) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Read: overdue ─────────────────────────────────────────────────────────────

export async function getOverdueFollowUps(): Promise<ActionResult<FollowUpDocument[]>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const docs = await FollowUp.findOverdue(session.user.id)
    return { ok: true, data: toPlain(docs) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Read: paginated list ──────────────────────────────────────────────────────

export async function listFollowUpsAction(
  rawParams: Record<string, unknown>
): Promise<ActionResult<PaginatedResult<FollowUpDocument>>> {
  try {
    await requireSession()
    await dbConnect()

    const parsed = FollowUpFilterSchema.safeParse(rawParams)
    if (!parsed.success) return { ok: false, error: 'Invalid parameters' }

    const { enquiryId, createdBy, status, type, from, to, overdue, page, pageSize } = parsed.data

    const filter: Record<string, unknown> = {}
    if (enquiryId) filter.enquiryId = enquiryId
    if (createdBy) filter.createdBy = createdBy
    if (status)    filter.status    = status
    if (type)      filter.type      = type
    if (from || to) {
      filter.scheduledAt = {
        ...(from ? { $gte: from } : {}),
        ...(to   ? { $lte: to   } : {}),
      }
    }
    if (overdue) {
      filter.status      = FollowUpStatus.Scheduled
      filter.scheduledAt = { $lt: new Date() }
    }

    const skip  = (page - 1) * pageSize
    const total = await FollowUp.countDocuments(filter)

    const docs = await FollowUp.find(filter)
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('createdBy', 'name email')
      .populate('enquiryId', 'enquiryNo customerName')
      .lean()

    return {
      ok: true,
      data: {
        data:       toPlain(docs) as unknown as FollowUpDocument[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext:    page * pageSize < total,
        hasPrev:    page > 1,
      },
    }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ── Stats for enquiry ─────────────────────────────────────────────────────────

export async function getFollowUpStats(enquiryId: string): Promise<
  ActionResult<{
    total:     number
    completed: number
    scheduled: number
    missed:    number
    cancelled: number
    lastAt:    string | null
    nextAt:    string | null
  }>
> {
  try {
    await requireSession()
    await dbConnect()

    const [counts, last, next] = await Promise.all([
      FollowUp.aggregate<{ _id: string; count: number }>([
        { $match: { enquiryId: { $eq: enquiryId } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      FollowUp.findOne({ enquiryId, status: FollowUpStatus.Completed })
        .sort({ completedAt: -1 })
        .select('completedAt')
        .lean(),
      FollowUp.findOne({ enquiryId, status: FollowUpStatus.Scheduled })
        .sort({ scheduledAt: 1 })
        .select('scheduledAt')
        .lean(),
    ])

    const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]))

    return {
      ok: true,
      data: {
        total:     counts.reduce((s, c) => s + c.count, 0),
        completed: byStatus[FollowUpStatus.Completed] ?? 0,
        scheduled: byStatus[FollowUpStatus.Scheduled] ?? 0,
        missed:    byStatus[FollowUpStatus.Missed]    ?? 0,
        cancelled: byStatus[FollowUpStatus.Cancelled] ?? 0,
        lastAt:    last?.completedAt?.toISOString() ?? null,
        nextAt:    next?.scheduledAt?.toISOString() ?? null,
      },
    }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}
