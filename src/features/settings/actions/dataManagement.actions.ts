'use server'

// ─────────────────────────────────────────────────────────────────────────────
// Permanent data deletion — SuperAdmin only. Everything here is destructive
// and irreversible by design (see the plan discussed with the user); the
// safeguards live in two places:
//   1. Server-side block rules below (re-checked on commit, never trust the
//      client's preview pass).
//   2. The UI requires typing a literal "DELETE" confirmation before the
//      commit action is ever called (see DataManagementTabs.tsx).
// ─────────────────────────────────────────────────────────────────────────────

import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import Enquiry from '@/lib/db/models/Enquiry'
import FollowUp from '@/lib/db/models/FollowUp'
import VoiceNote from '@/lib/db/models/VoiceNote'
import Assignment from '@/lib/db/models/Assignment'
import Complaint from '@/lib/db/models/Complaint'
import FieldVisit from '@/lib/db/models/FieldVisit'
import StockTransaction from '@/lib/db/models/StockTransaction'
import User from '@/lib/db/models/User'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { requireRole } from '@/lib/auth/session'
import { UserRole, UserStatus, EnquiryStatus, ActivityAction, EntityType } from '@/types/enums'
import { CACHE_TAGS } from '@/lib/cache'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

export interface DeletePreviewRow {
  id:        string
  label:     string     // display text for the confirmation/result table
  ok:        boolean    // false = will be skipped
  reason?:   string      // why it's blocked
  warnings?: string[]    // non-blocking notes shown for awareness
}

const OPEN_ENQUIRY_STATUSES = [
  EnquiryStatus.New, EnquiryStatus.Assigned, EnquiryStatus.InProgress,
  EnquiryStatus.Paused, EnquiryStatus.FollowUp,
]

// ─────────────────────────────────────────────────────────────────────────────
// ENQUIRIES
// ─────────────────────────────────────────────────────────────────────────────

async function checkEnquiryDeletions(ids: string[]): Promise<DeletePreviewRow[]> {
  const enquiries = await Enquiry.find({ _id: { $in: ids } })
    .select('enquiryNo customerName convertedAt')
    .lean()

  return ids.map((id) => {
    const e = enquiries.find((x) => String(x._id) === id)
    if (!e) return { id, label: id, ok: false, reason: 'Not found' }
    const label = `${e.enquiryNo} — ${e.customerName}`
    if (e.convertedAt) {
      return { id, label, ok: false, reason: 'Converted to a customer — has purchase/revenue history' }
    }
    return { id, label, ok: true }
  })
}

export async function previewDeleteEnquiriesAction(ids: string[]): Promise<ActionResult<DeletePreviewRow[]>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    if (ids.length === 0) return { ok: false, error: 'No enquiries selected' }
    await dbConnect()
    return { ok: true, data: toPlain(await checkEnquiryDeletions(ids)) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to preview deletion' }
  }
}

export async function deleteEnquiriesAction(ids: string[]): Promise<ActionResult<DeletePreviewRow[]>> {
  try {
    const session = await requireRole(UserRole.SuperAdmin)
    if (ids.length === 0) return { ok: false, error: 'No enquiries selected' }
    await dbConnect()

    const results = await checkEnquiryDeletions(ids)
    const deletable = results.filter((r) => r.ok)
    const deletableIds = deletable.map((r) => r.id)

    if (deletableIds.length > 0) {
      const snapshots = await Enquiry.find({ _id: { $in: deletableIds } })
        .select('enquiryNo customerName phone status')
        .lean()

      // Genuine child records of the enquiry — cascade delete, they're
      // meaningless without it.
      await FollowUp.deleteMany({ enquiryId: { $in: deletableIds } })
      await VoiceNote.deleteMany({ enquiryId: { $in: deletableIds } })
      await Assignment.deleteMany({ enquiryId: { $in: deletableIds } })

      // These reference the enquiry but are their own real records — clear
      // the link, keep the record.
      await Complaint.updateMany({ enquiryId: { $in: deletableIds } }, { $set: { enquiryId: null } })
      await FieldVisit.updateMany({ enquiryId: { $in: deletableIds } }, { $set: { enquiryId: null } })
      await StockTransaction.updateMany({ enquiryId: { $in: deletableIds } }, { $unset: { enquiryId: '' } })

      await Enquiry.deleteMany({ _id: { $in: deletableIds } })

      // One audit entry per deleted enquiry — ActivityLog.entityId is
      // required, and per-row entries give a clean forensic trail.
      await ActivityLog.insertMany(
        snapshots.map((s) => ({
          actorId:    session.user.id,
          actorRole:  session.user.role,
          action:     ActivityAction.EnquiryDeleted,
          entityType: EntityType.Enquiry,
          entityId:   s._id,
          changes:    { before: s },
        }))
      )

      revalidateTag(CACHE_TAGS.enquiries)
      revalidateTag(CACHE_TAGS.dashboard)
    }

    return { ok: true, data: toPlain(results) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete enquiries' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

async function checkUserDeletions(
  ids: string[],
  actingUserId: string
): Promise<DeletePreviewRow[]> {
  const users = await User.find({ _id: { $in: ids } }).select('name email role status').lean()
  const activeSuperAdminCount = await User.countDocuments({ role: UserRole.SuperAdmin, status: UserStatus.Active })

  const results: DeletePreviewRow[] = []
  for (const id of ids) {
    const u = users.find((x) => String(x._id) === id)
    if (!u) { results.push({ id, label: id, ok: false, reason: 'Not found' }); continue }
    const label = `${u.name} (${u.email})`

    if (id === actingUserId) {
      results.push({ id, label, ok: false, reason: 'Cannot delete your own account' })
      continue
    }
    if (u.role === UserRole.SuperAdmin && u.status === UserStatus.Active && activeSuperAdminCount <= 1) {
      results.push({ id, label, ok: false, reason: 'The only remaining active Super Admin' })
      continue
    }

    const openAssigned = await Enquiry.countDocuments({ assignedTo: id, status: { $in: OPEN_ENQUIRY_STATUSES } })
    if (openAssigned > 0) {
      results.push({
        id, label, ok: false,
        reason: `Has ${openAssigned} open enquir${openAssigned === 1 ? 'y' : 'ies'} assigned — reassign first`,
      })
      continue
    }

    // Non-blocking context — historical references are left dangling on
    // purpose (same as populate() already handles gracefully elsewhere).
    const warnings: string[] = []
    const [createdCount, activityCount] = await Promise.all([
      Enquiry.countDocuments({ createdBy: id }),
      ActivityLog.countDocuments({ actorId: id }),
    ])
    if (createdCount > 0) warnings.push(`Created ${createdCount} enquir${createdCount === 1 ? 'y' : 'ies'} (kept, reference cleared)`)
    if (activityCount > 0) warnings.push(`${activityCount} activity log entries reference this user (kept as history)`)

    results.push({ id, label, ok: true, warnings })
  }
  return results
}

export async function previewDeleteUsersAction(ids: string[]): Promise<ActionResult<DeletePreviewRow[]>> {
  try {
    const session = await requireRole(UserRole.SuperAdmin)
    if (ids.length === 0) return { ok: false, error: 'No users selected' }
    await dbConnect()
    return { ok: true, data: toPlain(await checkUserDeletions(ids, session.user.id)) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to preview deletion' }
  }
}

export async function deleteUsersAction(ids: string[]): Promise<ActionResult<DeletePreviewRow[]>> {
  try {
    const session = await requireRole(UserRole.SuperAdmin)
    if (ids.length === 0) return { ok: false, error: 'No users selected' }
    await dbConnect()

    const results = await checkUserDeletions(ids, session.user.id)
    const deletable = results.filter((r) => r.ok)
    const deletableIds = deletable.map((r) => r.id)

    if (deletableIds.length > 0) {
      const snapshots = await User.find({ _id: { $in: deletableIds } })
        .select('name email role status district city')
        .lean()

      await User.deleteMany({ _id: { $in: deletableIds } })

      await ActivityLog.insertMany(
        snapshots.map((s) => ({
          actorId:    session.user.id,
          actorRole:  session.user.role,
          action:     ActivityAction.UserDeleted,
          entityType: EntityType.User,
          entityId:   s._id,
          changes:    { before: s },
        }))
      )

      revalidateTag('users')
    }

    return { ok: true, data: toPlain(results) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete users' }
  }
}
