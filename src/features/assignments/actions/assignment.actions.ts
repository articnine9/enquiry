'use server'

import { revalidateTag } from 'next/cache'
import { requireSession, requireRole } from '@/lib/auth/session'
import { authErrorToResult } from '@/lib/auth/session'
import {
  autoAssign,
  manualAssign,
  reassign,
  releaseStaff,
  getActiveAssignment,
  getAssignmentHistory,
  getStaffActiveAssignments,
} from '../services/assignment.service'
import {
  resolveZone,
  getZoneWorkloadSummary,
} from '../services/zone-matcher.service'
import {
  ManualAssignSchema,
  ReassignSchema,
  ReleaseAssignmentSchema,
  AssignmentFilterSchema,
  CreateZoneSchema,
  UpdateZoneSchema,
} from '../validations/assignment.schema'
import dbConnect from '@/lib/db/connection'
import LocationZone from '@/lib/db/models/LocationZone'
import Assignment from '@/lib/db/models/Assignment'
import { CACHE_TAGS } from '@/lib/cache'
import { UserRole } from '@/types/enums'
import type { ActionResult, PaginatedResult } from '@/types/api'
import type { AssignmentDocument } from '@/lib/db/models/Assignment'
import type { AssignmentHistoryItem } from '@/types/assignment.types'
import type { LocationZoneDocument } from '@/lib/db/models/LocationZone'
import { AssignmentStatus } from '@/types/assignment.types'

function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignment actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * manualAssignAction — used by the AssignStaffModal form.
 * Compatible with useActionState: (_prev, FormData) => Promise<ActionResult>
 */
export async function manualAssignAction(
  _prev: ActionResult<AssignmentDocument> | null,
  formData: FormData
): Promise<ActionResult<AssignmentDocument>> {
  try {
    const session = await requireSession()
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)

    const raw = {
      enquiryId: formData.get('enquiryId'),
      staffId:   formData.get('staffId'),
      reason:    formData.get('reason') ?? undefined,
    }

    const parsed = ManualAssignSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const result = await manualAssign({
      ...parsed.data,
      actorId:   session.user.id,
      actorRole: session.user.role,
    })

    if (result.ok) {
      revalidateTag(CACHE_TAGS.assignments)
      revalidateTag(CACHE_TAGS.enquiry(parsed.data.enquiryId))
    }

    return result
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

/**
 * reassignAction — replaces current staff with new staff (requires reason).
 */
export async function reassignAction(
  _prev: ActionResult<AssignmentDocument> | null,
  formData: FormData
): Promise<ActionResult<AssignmentDocument>> {
  try {
    const session = await requireSession()
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)

    const raw = {
      enquiryId: formData.get('enquiryId'),
      staffId:   formData.get('staffId'),
      reason:    formData.get('reason'),
    }

    const parsed = ReassignSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const result = await reassign({
      ...parsed.data,
      actorId:   session.user.id,
      actorRole: session.user.role,
    })

    if (result.ok) {
      revalidateTag(CACHE_TAGS.assignments)
      revalidateTag(CACHE_TAGS.enquiry(parsed.data.enquiryId))
    }

    return result
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

/**
 * releaseStaffAction — unassign current staff without replacement.
 */
export async function releaseStaffAction(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession()
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)

    const raw = {
      enquiryId:      formData.get('enquiryId'),
      releasedReason: formData.get('releasedReason'),
    }

    const parsed = ReleaseAssignmentSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const result = await releaseStaff({
      ...parsed.data,
      actorId:   session.user.id,
      actorRole: session.user.role,
    })

    if (result.ok) {
      revalidateTag(CACHE_TAGS.assignments)
      revalidateTag(CACHE_TAGS.enquiry(parsed.data.enquiryId))
    }

    return result
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read actions
// ─────────────────────────────────────────────────────────────────────────────

export async function getActiveAssignmentAction(
  enquiryId: string
): Promise<ActionResult<AssignmentDocument | null>> {
  try {
    await requireSession()
    return getActiveAssignment(enquiryId)
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

export async function getAssignmentHistoryAction(
  enquiryId: string
): Promise<ActionResult<AssignmentHistoryItem[]>> {
  try {
    await requireSession()
    return getAssignmentHistory(enquiryId)
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

export async function getStaffAssignmentsAction(
  staffId: string
): Promise<ActionResult<AssignmentDocument[]>> {
  try {
    await requireSession()
    return getStaffActiveAssignments(staffId)
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

/**
 * Paginated assignment list — for admin history view.
 */
export async function listAssignmentsAction(
  rawParams: Record<string, unknown>
): Promise<ActionResult<PaginatedResult<AssignmentDocument>>> {
  try {
    await requireSession()
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)

    const parsed = AssignmentFilterSchema.safeParse(rawParams)
    if (!parsed.success) {
      return { ok: false, error: 'Invalid filter parameters' }
    }

    await dbConnect()

    const { enquiryId, staffId, zoneId, status, type, from, to, page, pageSize } = parsed.data

    const filter: Record<string, unknown> = {}
    if (enquiryId) filter.enquiryId = enquiryId
    if (staffId)   filter.staffId   = staffId
    if (zoneId)    filter.zoneId    = zoneId
    if (status)    filter.status    = status
    if (type)      filter.type      = type
    if (from || to) {
      filter.assignedAt = {
        ...(from ? { $gte: from } : {}),
        ...(to   ? { $lte: to   } : {}),
      }
    }

    const skip  = (page - 1) * pageSize
    const total = await Assignment.countDocuments(filter)

    const docs = await Assignment.find(filter)
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('staffId',    'name email')
      .populate('assignedById', 'name')
      .populate('zoneId',     'name code')
      .lean()

    return {
      ok: true,
      data: {
        data:       toPlain(docs) as unknown as AssignmentDocument[],
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

// ─────────────────────────────────────────────────────────────────────────────
// Zone resolution (used by enquiry create flow)
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveZoneAction(params: {
  pincode?: string
  district?: string
  city?: string
}) {
  try {
    await requireSession()
    const result = await resolveZone(params)
    return { ok: true, data: toPlain(result) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

export async function getZoneWorkloadAction() {
  try {
    await requireSession()
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    const data = await getZoneWorkloadSummary()
    return { ok: true as const, data }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false as const, error: (err as Error).message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone CRUD (Super Admin only)
// ─────────────────────────────────────────────────────────────────────────────

export async function createZoneAction(
  _prev: ActionResult<LocationZoneDocument> | null,
  formData: FormData
): Promise<ActionResult<LocationZoneDocument>> {
  try {
    await requireSession()
    await requireRole(UserRole.SuperAdmin)

    const raw = {
      name:        formData.get('name'),
      code:        formData.get('code'),
      description: formData.get('description') || undefined,
      pincodes:    formData
        .get('pincodes')
        ?.toString()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
      districts: formData
        .get('districts')
        ?.toString()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
      cities: formData
        .get('cities')
        ?.toString()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
      maxCapacity: Number(formData.get('maxCapacity') ?? 50),
      isActive:    formData.get('isActive') !== 'false',
      managerId:   formData.get('managerId') || undefined,
    }

    const parsed = CreateZoneSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    await dbConnect()
    const zone = await LocationZone.create(parsed.data)
    revalidateTag(CACHE_TAGS.enquiries)

    return { ok: true, data: toPlain(zone) }
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { ok: false, error: 'A zone with this code already exists' }
    }
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

export async function updateZoneAction(
  id: string,
  _prev: ActionResult<LocationZoneDocument> | null,
  formData: FormData
): Promise<ActionResult<LocationZoneDocument>> {
  try {
    await requireSession()
    await requireRole(UserRole.SuperAdmin)

    const raw = {
      name:        formData.get('name'),
      description: formData.get('description') || undefined,
      pincodes:    formData
        .get('pincodes')
        ?.toString()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
      districts: formData
        .get('districts')
        ?.toString()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
      cities: formData
        .get('cities')
        ?.toString()
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
      maxCapacity: Number(formData.get('maxCapacity') ?? 50),
      isActive:    formData.get('isActive') !== 'false',
      managerId:   formData.get('managerId') || undefined,
    }

    const parsed = UpdateZoneSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    await dbConnect()
    const zone = await LocationZone.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    )
    if (!zone) return { ok: false, error: 'Zone not found' }

    revalidateTag(CACHE_TAGS.enquiries)
    return { ok: true, data: toPlain(zone) }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

export async function listZonesAction(): Promise<ActionResult<LocationZoneDocument[]>> {
  try {
    await requireSession()
    await dbConnect()
    const zones = await LocationZone.find({ isActive: true })
      .sort({ name: 1 })
      .lean()
    return { ok: true, data: toPlain(zones) as unknown as LocationZoneDocument[] }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}

export async function deleteZoneAction(id: string): Promise<ActionResult<void>> {
  try {
    await requireSession()
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    // Soft delete — just deactivate
    const zone = await LocationZone.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    )
    if (!zone) return { ok: false, error: 'Zone not found' }

    revalidateTag(CACHE_TAGS.enquiries)
    return { ok: true, data: undefined }
  } catch (err: unknown) {
    return authErrorToResult(err) ?? { ok: false, error: (err as Error).message }
  }
}
