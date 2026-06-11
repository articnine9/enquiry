'use server'

import mongoose from 'mongoose'
import dbConnect from '@/lib/db/connection'
import Notification from '@/lib/db/models/Notification'
import { requireSession } from '@/lib/auth/session'
import { revalidateTag } from 'next/cache'
import { NotificationType, NotificationChannel, EntityType } from '@/types/enums'
import type { ActionResult, PaginatedResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Public types ──────────────────────────────────────────────────────────────

export interface NotificationItem {
  _id:        string
  type:       string
  channel:    string
  title:      string
  body:       string
  entityType?: string
  entityId?:  string
  isRead:     boolean
  readAt?:    string
  createdAt:  string
}

export interface CreateNotificationInput {
  recipientId:  string
  type:         NotificationType
  title:        string
  body:         string
  entityType?:  EntityType
  entityId?:    string
  channel?:     NotificationChannel
}

// ── Internal creator (used by other server actions) ───────────────────────────

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await dbConnect()
    await Notification.create({
      recipientId: new mongoose.Types.ObjectId(input.recipientId),
      type:        input.type,
      title:       input.title,
      body:        input.body,
      entityType:  input.entityType,
      entityId:    input.entityId ? new mongoose.Types.ObjectId(input.entityId) : undefined,
      channel:     input.channel ?? NotificationChannel.InApp,
    })
  } catch {
    // best-effort — don't throw so callers aren't blocked
  }
}

// ── Bulk create (for broadcasting to multiple recipients) ─────────────────────

export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<void> {
  try {
    await dbConnect()
    await Notification.insertMany(
      inputs.map((i) => ({
        recipientId: new mongoose.Types.ObjectId(i.recipientId),
        type:        i.type,
        title:       i.title,
        body:        i.body,
        entityType:  i.entityType,
        entityId:    i.entityId ? new mongoose.Types.ObjectId(i.entityId) : undefined,
        channel:     i.channel ?? NotificationChannel.InApp,
      })),
      { ordered: false } // continue on partial failure
    )
  } catch {
    // best-effort
  }
}

// ── Get notifications (paginated) ─────────────────────────────────────────────

export async function getNotificationsAction(params?: {
  page?:     number
  pageSize?: number
  unread?:   boolean
}): Promise<ActionResult<PaginatedResult<NotificationItem>>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const page     = Math.max(params?.page ?? 1, 1)
    const pageSize = Math.min(params?.pageSize ?? 20, 100)
    const skip     = (page - 1) * pageSize

    const filter: Record<string, unknown> = {
      recipientId: new mongoose.Types.ObjectId(session.user.id),
    }
    if (params?.unread) filter['isRead'] = false

    const [docs, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Notification.countDocuments(filter),
    ])

    const data: PaginatedResult<NotificationItem> = {
      data:       toPlain(docs.map((d) => ({
        _id:        String(d._id),
        type:       d.type,
        channel:    d.channel,
        title:      d.title,
        body:       d.body,
        entityType: d.entityType,
        entityId:   d.entityId ? String(d.entityId) : undefined,
        isRead:     d.isRead,
        readAt:     d.readAt?.toISOString(),
        createdAt:  (d as { createdAt?: Date }).createdAt?.toISOString() ?? '',
      }))),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext:    page < Math.ceil(total / pageSize),
      hasPrev:    page > 1,
    }

    return { ok: true, data }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load notifications' }
  }
}

// ── Get unread count ──────────────────────────────────────────────────────────

export async function getUnreadCountAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const count = await (Notification as unknown as { unreadCount(id: string): Promise<number> })
      .unreadCount(session.user.id)

    return { ok: true, data: { count } }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Mark one as read ──────────────────────────────────────────────────────────

export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult<null>> {
  try {
    const session = await requireSession()
    await dbConnect()

    await Notification.findOneAndUpdate(
      {
        _id:         new mongoose.Types.ObjectId(notificationId),
        recipientId: new mongoose.Types.ObjectId(session.user.id),
      },
      { $set: { isRead: true, readAt: new Date() } }
    )

    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Mark all as read ──────────────────────────────────────────────────────────

export async function markAllNotificationsReadAction(): Promise<ActionResult<null>> {
  try {
    const session = await requireSession()
    await dbConnect()

    await (Notification as unknown as { markAllRead(id: string): Promise<void> })
      .markAllRead(session.user.id)

    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Delete a notification ─────────────────────────────────────────────────────

export async function deleteNotificationAction(
  notificationId: string
): Promise<ActionResult<null>> {
  try {
    const session = await requireSession()
    await dbConnect()

    await Notification.deleteOne({
      _id:         new mongoose.Types.ObjectId(notificationId),
      recipientId: new mongoose.Types.ObjectId(session.user.id),
    })

    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Delete all read notifications ─────────────────────────────────────────────

export async function clearReadNotificationsAction(): Promise<ActionResult<null>> {
  try {
    const session = await requireSession()
    await dbConnect()

    await Notification.deleteMany({
      recipientId: new mongoose.Types.ObjectId(session.user.id),
      isRead:      true,
    })

    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}
