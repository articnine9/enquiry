/**
 * Assignment service — orchestrates the full lifecycle:
 *   autoAssign → manualAssign → reassign → release
 *
 * All mutations go through _createAssignmentRecord so the history chain
 * is always consistent.  Caller provides actorId (the session user).
 */

import mongoose from 'mongoose'
import dbConnect from '@/lib/db/connection'
import Assignment, { type AssignmentDocument } from '@/lib/db/models/Assignment'
import Enquiry from '@/lib/db/models/Enquiry'
import User from '@/lib/db/models/User'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { resolveZone, resolveStaff } from './zone-matcher.service'
import type { LocationZoneDocument } from '@/lib/db/models/LocationZone'
import {
  AssignmentType,
  AssignmentStatus,
  ZoneMatchTier,
} from '@/types/assignment.types'
import { ActivityAction, EntityType } from '@/types/enums'
import type {
  AutoAssignParams,
  ManualAssignParams,
  ReassignParams,
  ReleaseParams,
  AssignmentHistoryItem,
} from '@/types/assignment.types'
import type { ActionResult } from '@/types/api'
import type { Types } from 'mongoose'

// ── Internal helpers ──────────────────────────────────────────────────────────

function toId(v: unknown): Types.ObjectId {
  return new mongoose.Types.ObjectId(String(v))
}

function toPlain<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc))
}

/**
 * Core write — always called by the public functions.
 * Inside a session for atomicity.
 *
 * Steps:
 *  1. Verify enquiry exists and is not closed/cancelled
 *  2. Verify staff exists and is active
 *  3. Supersede existing active assignment (if any)
 *  4. Write new Assignment record
 *  5. Update Enquiry.assignedTo / assignedAt / status (→ Assigned)
 *  6. Decrement old staff currentLoad / Increment new staff currentLoad
 *  7. Write ActivityLog entry
 */
async function _createAssignmentRecord(params: {
  enquiryId:             Types.ObjectId
  staffId:               Types.ObjectId
  actorId:               Types.ObjectId
  zoneId?:               Types.ObjectId | null
  type:                  AssignmentType
  matchTier?:            ZoneMatchTier
  reason?:               string
  previousAssignmentId?: Types.ObjectId | null
}): Promise<AssignmentDocument> {
  await dbConnect()

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      enquiryId, staffId, actorId, zoneId,
      type, matchTier, reason, previousAssignmentId,
    } = params

    // ── 1. Validate enquiry ────────────────────────────────────────────────
    const enquiry = await Enquiry.findById(enquiryId).session(session)
    if (!enquiry) throw new Error('Enquiry not found')
    if (['closed', 'cancelled'].includes(enquiry.status)) {
      throw new Error(`Cannot assign a ${enquiry.status} enquiry`)
    }

    // ── 2. Validate staff ──────────────────────────────────────────────────
    const staff = await User.findById(staffId).session(session)
    if (!staff) throw new Error('Staff member not found')
    if (staff.status !== 'active') throw new Error('Staff member is not active')

    // ── 3. Supersede existing active assignment ────────────────────────────
    const existing = await Assignment.findOne({
      enquiryId,
      status: AssignmentStatus.Active,
    }).session(session)

    let prevId: Types.ObjectId | null = previousAssignmentId ?? null

    if (existing) {
      prevId = existing._id as Types.ObjectId

      await Assignment.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            status:          AssignmentStatus.Superseded,
            releasedAt:      new Date(),
            releasedReason:  reason ?? 'Superseded by new assignment',
          },
        },
        { session }
      )

      // Decrement old staff's load
      await User.findByIdAndUpdate(
        existing.staffId,
        { $inc: { currentLoad: -1 } },
        { session }
      )
    }

    // ── 4. Create new assignment record ────────────────────────────────────
    const [newAssignment] = await Assignment.create(
      [
        {
          enquiryId,
          staffId,
          zoneId:               zoneId ?? null,
          assignedById:         actorId,
          type,
          status:               AssignmentStatus.Active,
          matchTier:            matchTier ?? ZoneMatchTier.Global,
          reason:               reason ?? null,
          previousAssignmentId: prevId,
          assignedAt:           new Date(),
        },
      ],
      { session }
    )

    // ── 5. Update enquiry ──────────────────────────────────────────────────
    const enquiryUpdate: Record<string, unknown> = {
      assignedTo: staffId,
      assignedBy: actorId,
      assignedAt: new Date(),
    }
    // Only move to Assigned if currently New
    if (enquiry.status === 'new') {
      enquiryUpdate.status = 'assigned'
    }
    await Enquiry.findByIdAndUpdate(enquiryId, { $set: enquiryUpdate }, { session })

    // ── 6. Increment new staff's load ──────────────────────────────────────
    await User.findByIdAndUpdate(staffId, { $inc: { currentLoad: 1 } }, { session })

    // ── 7. Activity log ────────────────────────────────────────────────────
    const action =
      type === AssignmentType.Reassigned
        ? ActivityAction.EnquiryReassigned
        : ActivityAction.EnquiryAssigned

    await ActivityLog.create(
      [
        {
          userId:      actorId,
          action,
          entityType:  EntityType.Enquiry,
          entityId:    enquiryId,
          description: `${type === AssignmentType.Reassigned ? 'Reassigned' : 'Assigned'} to ${staff.name}`,
          metadata: {
            assignmentId:  newAssignment._id,
            staffId,
            staffName:     staff.name,
            zoneId:        zoneId ?? null,
            type,
            matchTier:     matchTier ?? ZoneMatchTier.Global,
            reason:        reason ?? null,
          },
        },
      ],
      { session }
    )

    await session.commitTransaction()
    return newAssignment
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Auto-assign based on pincode / district / city.
 * Called by createEnquiry server action after a form submit.
 */
export async function autoAssign(
  params: AutoAssignParams
): Promise<ActionResult<AssignmentDocument>> {
  try {
    await dbConnect()

    const enquiryId = toId(params.enquiryId)
    const actorId   = toId(params.actorId)

    // Resolve zone
    const zoneResolution = await resolveZone({
      pincode:  params.pincode,
      district: params.district,
      city:     params.city,
    })

    // Resolve staff
    const staffResolution = await resolveStaff({
      zone: zoneResolution.zone as LocationZoneDocument | null,
    })
    if (!staffResolution) {
      return { ok: false, error: 'No available staff found for auto-assignment' }
    }

    const assignment = await _createAssignmentRecord({
      enquiryId,
      staffId:    staffResolution.staffId,
      actorId,
      zoneId:     zoneResolution.zone?._id ?? null,
      type:       AssignmentType.Auto,
      matchTier:  zoneResolution.matchTier,
      reason:     `Auto-assigned via ${zoneResolution.matchTier} match`,
    })

    return { ok: true, data: toPlain(assignment) }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

/**
 * Manual assignment — manager/super-admin picks a specific staff member.
 */
export async function manualAssign(
  params: ManualAssignParams
): Promise<ActionResult<AssignmentDocument>> {
  try {
    await dbConnect()

    const enquiryId = toId(params.enquiryId)
    const staffId   = toId(params.staffId)
    const actorId   = toId(params.actorId)

    // Check if staff is already active on this enquiry
    const existing = await Assignment.findOne({
      enquiryId,
      staffId,
      status: AssignmentStatus.Active,
    })
    if (existing) {
      return { ok: false, error: 'This staff member is already assigned to the enquiry' }
    }

    const assignment = await _createAssignmentRecord({
      enquiryId,
      staffId,
      actorId,
      zoneId:    null,
      type:      AssignmentType.Manual,
      matchTier: ZoneMatchTier.Global,
      reason:    params.reason,
    })

    return { ok: true, data: toPlain(assignment) }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

/**
 * Reassignment — moves an enquiry from one staff to another.
 * Requires an explicit reason (audited).
 * Previous staff's load is decremented; new staff's load incremented.
 */
export async function reassign(
  params: ReassignParams
): Promise<ActionResult<AssignmentDocument>> {
  try {
    await dbConnect()

    const enquiryId = toId(params.enquiryId)
    const staffId   = toId(params.staffId)
    const actorId   = toId(params.actorId)

    // Ensure there IS an active assignment to supersede
    const current = await Assignment.findOne({
      enquiryId,
      status: AssignmentStatus.Active,
    })
    if (!current) {
      return { ok: false, error: 'No active assignment found to reassign from' }
    }

    // Cannot reassign to the same staff
    if (String(current.staffId) === String(staffId)) {
      return { ok: false, error: 'Enquiry is already assigned to this staff member' }
    }

    // Resolve zone for new staff member
    const newStaff = await User.findById(staffId).select('locationZoneId').lean()

    const assignment = await _createAssignmentRecord({
      enquiryId,
      staffId,
      actorId,
      zoneId:              newStaff?.locationZoneId as Types.ObjectId | null ?? null,
      type:                AssignmentType.Reassigned,
      matchTier:           ZoneMatchTier.Global,
      reason:              params.reason,
      previousAssignmentId: current._id as Types.ObjectId,
    })

    return { ok: true, data: toPlain(assignment) }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

/**
 * Release staff from an enquiry without immediately reassigning.
 * Marks the assignment as Released and clears Enquiry.assignedTo.
 */
export async function releaseStaff(
  params: ReleaseParams
): Promise<ActionResult<void>> {
  try {
    await dbConnect()

    const enquiryId = toId(params.enquiryId)
    const actorId   = toId(params.actorId)

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const active = await Assignment.findOne({
        enquiryId,
        status: AssignmentStatus.Active,
      }).session(session)

      if (!active) {
        await session.abortTransaction()
        return { ok: false, error: 'No active assignment found' }
      }

      await Assignment.findByIdAndUpdate(
        active._id,
        {
          $set: {
            status:         AssignmentStatus.Released,
            releasedAt:     new Date(),
            releasedReason: params.releasedReason,
          },
        },
        { session }
      )

      await User.findByIdAndUpdate(
        active.staffId,
        { $inc: { currentLoad: -1 } },
        { session }
      )

      await Enquiry.findByIdAndUpdate(
        enquiryId,
        { $set: { assignedTo: null, assignedAt: null } },
        { session }
      )

      await ActivityLog.create(
        [
          {
            userId:      actorId,
            action:      ActivityAction.EnquiryReassigned,
            entityType:  EntityType.Enquiry,
            entityId:    enquiryId,
            description: 'Staff released from enquiry',
            metadata: {
              assignmentId:   active._id,
              releasedReason: params.releasedReason,
            },
          },
        ],
        { session }
      )

      await session.commitTransaction()
      return { ok: true, data: undefined }
    } catch (err) {
      await session.abortTransaction()
      throw err
    } finally {
      session.endSession()
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ── Read helpers ──────────────────────────────────────────────────────────────

export async function getActiveAssignment(
  enquiryId: string
): Promise<ActionResult<AssignmentDocument | null>> {
  try {
    await dbConnect()
    const doc = await Assignment.findActiveForEnquiry(enquiryId)
    return { ok: true, data: toPlain(doc) }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function getAssignmentHistory(
  enquiryId: string
): Promise<ActionResult<AssignmentHistoryItem[]>> {
  try {
    await dbConnect()
    const docs = await Assignment.findHistoryForEnquiry(enquiryId)
    return { ok: true, data: toPlain(docs) as unknown as AssignmentHistoryItem[] }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function getStaffActiveAssignments(
  staffId: string
): Promise<ActionResult<AssignmentDocument[]>> {
  try {
    await dbConnect()
    const docs = await Assignment.findActiveForStaff(staffId)
    return { ok: true, data: toPlain(docs) }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
