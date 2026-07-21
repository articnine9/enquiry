'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import type { FilterQuery } from 'mongoose'
import dbConnect from '@/lib/db/connection'
import Enquiry, { type EnquiryDocument } from '@/lib/db/models/Enquiry'
import { ActivityLog, Assignment, User } from '@/lib/db/models'
import { requireSession, requirePermission, authErrorToResult } from '@/lib/auth/session'
import { autoAssign } from '@/features/assignments/services/assignment.service'
import { resolveMasterValue } from '@/features/settings/services/masterData.service'
import { resolveSlaPolicy } from '@/features/settings/services/slaPolicy.service'
import { computeSlaDueAt, SLA_AT_RISK_RATIO } from '@/lib/sla'
import type { MasterDataType } from '@/lib/db/models/MasterData'
import { CACHE_TAGS } from '@/lib/cache'
import {
  CreateEnquirySchema,
  UpdateEnquirySchema,
  UpdateStatusSchema,
  EnquiryFilterSchema,
  AssignEnquirySchema,
} from '../validations/enquiry.schema'
import {
  ActivityAction,
  EntityType,
  AssignmentType,
  UserRole,
  UserStatus,
  EnquiryStatus,
} from '@/types/enums'
import type { ActionResult, PaginatedResult } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPlain<T>(doc: T): T {
  // Convert Mongoose doc → plain JS object safe for RSC serialisation
  return JSON.parse(JSON.stringify(doc))
}

// Verify each supplied dropdown value exists & is active in MasterData, and
// derive the priority sort weight. Only fields present in `data` are checked
// (so partial updates skip untouched fields).
const MASTER_FIELDS: { key: 'enquirySource' | 'category' | 'product' | 'priority'; type: MasterDataType; label: string }[] = [
  { key: 'enquirySource', type: 'enquiry_source',   label: 'enquiry source' },
  { key: 'category',      type: 'enquiry_category', label: 'category' },
  { key: 'product',       type: 'enquiry_product',  label: 'product' },
  { key: 'priority',      type: 'enquiry_priority', label: 'priority' },
]

async function validateMasterFields(
  data: Partial<Record<'enquirySource' | 'category' | 'product' | 'priority', string>>
): Promise<
  | { ok: true; priorityWeight?: number }
  | { ok: false; fieldErrors: Record<string, string[]> }
> {
  const fieldErrors: Record<string, string[]> = {}
  let priorityWeight: number | undefined

  for (const f of MASTER_FIELDS) {
    const code = data[f.key]
    if (code == null) continue
    const row = await resolveMasterValue(f.type, code)
    if (!row || !row.isActive) {
      fieldErrors[f.key] = [`Select a valid ${f.label}`]
      continue
    }
    if (f.key === 'priority') priorityWeight = row.weight ?? 2
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  return { ok: true, priorityWeight }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

export async function createEnquiry(
  _prev: ActionResult<EnquiryDocument> | null,
  formData: FormData
): Promise<ActionResult<EnquiryDocument>> {
  try {
    const session = await requirePermission('enquiry:create')

    const raw = Object.fromEntries(formData.entries())
    // Tags arrive as comma-separated string from the form
    if (typeof raw.tags === 'string') {
      raw.tags = (raw.tags
        ? raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : []) as unknown as string
    }

    const parsed = CreateEnquirySchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Please fix the errors below',
        fieldErrors: parsed.error.flatten().fieldErrors,
        values:      raw,
      }
    }

    await dbConnect()

    const master = await validateMasterFields(parsed.data)
    if (!master.ok) {
      return { ok: false, error: 'Please fix the errors below', fieldErrors: master.fieldErrors, values: raw }
    }

    const now    = new Date()
    const policy = await resolveSlaPolicy(parsed.data.priority, parsed.data.category)

    const enquiry = await Enquiry.create({
      ...parsed.data,
      priorityWeight: master.priorityWeight ?? 2,
      slaPolicyId:    policy.policyId,
      slaDueAt:       computeSlaDueAt(now, policy.resolutionMinutes),
      createdBy:      session.user.id,
    })

    // Attempt auto-assignment — non-blocking
    autoAssign({
      enquiryId: String(enquiry._id),
      pincode:   parsed.data.pincode ?? '',
      city:      parsed.data.city,
      district:  parsed.data.district,
      actorId:   session.user.id,
      actorRole: session.user.role,
    })
      .then((r) => { if (!r.ok) console.error(`Auto-assign failed for ${enquiry._id}:`, r.error) })
      .catch((err) => console.error(`Auto-assign threw for ${enquiry._id}:`, err))

    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.EnquiryCreated,
      entityType: EntityType.Enquiry,
      entityId:   enquiry._id,
    })

    revalidateTag(CACHE_TAGS.enquiries)
    revalidateTag(CACHE_TAGS.dashboard)

    return { ok: true, data: toPlain(enquiry) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export async function updateEnquiry(
  id: string,
  _prev: ActionResult<EnquiryDocument> | null,
  formData: FormData
): Promise<ActionResult<EnquiryDocument>> {
  try {
    const session = await requirePermission('enquiry:update')

    const raw = Object.fromEntries(formData.entries())
    if (typeof raw.tags === 'string') {
      raw.tags = (raw.tags
        ? raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : []) as unknown as string
    }

    const parsed = UpdateEnquirySchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Please fix the errors below',
        fieldErrors: parsed.error.flatten().fieldErrors,
        values:      raw,
      }
    }

    await dbConnect()

    const before = await Enquiry.findById(id).lean()
    if (!before) return { ok: false, error: 'Enquiry not found' }

    // Staff can only update their own enquiries
    if (
      session.user.role === UserRole.Staff &&
      String(before.assignedTo) !== session.user.id
    ) {
      return { ok: false, error: 'You can only update enquiries assigned to you' }
    }

    const master = await validateMasterFields(parsed.data)
    if (!master.ok) {
      return { ok: false, error: 'Please fix the errors below', fieldErrors: master.fieldErrors, values: raw }
    }

    const update: Record<string, unknown> = { ...parsed.data }
    // Keep the denormalised sort weight in sync when priority changes.
    if (parsed.data.priority != null) update.priorityWeight = master.priorityWeight ?? 2

    // Re-resolve the SLA target when priority or category changes — anchored to
    // the ORIGINAL createdAt so the clock never restarts, only the target moves.
    if (parsed.data.priority != null || parsed.data.category != null) {
      const priority = parsed.data.priority ?? before.priority
      const category = parsed.data.category ?? before.category
      const policy   = await resolveSlaPolicy(priority, category)
      update.slaPolicyId = policy.policyId
      update.slaDueAt    = computeSlaDueAt(new Date(before.createdAt), policy.resolutionMinutes)
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean()

    if (!enquiry) return { ok: false, error: 'Enquiry not found' }

    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.EnquiryUpdated,
      entityType: EntityType.Enquiry,
      entityId:   id,
      changes: { before: before as Record<string, unknown>, after: parsed.data },
    })

    revalidateTag(CACHE_TAGS.enquiries)
    revalidateTag(CACHE_TAGS.enquiry(id))

    return { ok: true, data: toPlain(enquiry) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (soft: sets status = Cancelled)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteEnquiry(
  id: string
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const session = await requirePermission('enquiry:cancel')

    await dbConnect()
    const enquiry = await Enquiry.findById(id)
    if (!enquiry) return { ok: false, error: 'Enquiry not found' }

    if (enquiry.status === EnquiryStatus.Closed) {
      return { ok: false, error: 'Closed enquiries cannot be deleted' }
    }

    enquiry.status = EnquiryStatus.Cancelled
    await enquiry.save()

    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.EnquiryCancelled,
      entityType: EntityType.Enquiry,
      entityId:   id,
    })

    revalidateTag(CACHE_TAGS.enquiries)
    revalidateTag(CACHE_TAGS.enquiry(id))
    revalidateTag(CACHE_TAGS.dashboard)

    return { ok: true, data: { deleted: true } }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE STATUS
// ─────────────────────────────────────────────────────────────────────────────

export async function updateEnquiryStatus(
  payload: unknown
): Promise<ActionResult<{ status: EnquiryStatus }>> {
  try {
    const session = await requirePermission('enquiry:update_status')

    const parsed = UpdateStatusSchema.safeParse(payload)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Invalid status update',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    await dbConnect()
    const enquiry = await Enquiry.findById(parsed.data.id)
    if (!enquiry) return { ok: false, error: 'Enquiry not found' }

    const prevStatus = enquiry.status
    enquiry.status   = parsed.data.status as EnquiryStatus

    // FSM guard is enforced in the pre-save hook
    await enquiry.save()

    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.StatusChanged,
      entityType: EntityType.Enquiry,
      entityId:   parsed.data.id,
      changes: {
        before: { status: prevStatus },
        after:  { status: parsed.data.status, note: parsed.data.note },
      },
    })

    revalidateTag(CACHE_TAGS.enquiries)
    revalidateTag(CACHE_TAGS.enquiry(parsed.data.id))
    revalidateTag(CACHE_TAGS.dashboard)

    return { ok: true, data: { status: parsed.data.status as EnquiryStatus } }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Invalid status transition')) {
      return { ok: false, error: err.message }
    }
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ONE
// ─────────────────────────────────────────────────────────────────────────────

export async function getEnquiryById(
  id: string
): Promise<ActionResult<EnquiryDocument>> {
  try {
    const session = await requirePermission('enquiry:read')

    await dbConnect()
    const query = Enquiry
      .findById(id)
      .select('+internalNotes')
      .populate('assignedTo', 'name email avatar phone')
      .populate('createdBy',  'name email')

    // Staff scoping — only their own enquiries
    if (session.user.role === UserRole.Staff) {
      const enquiry = await query.lean()
      if (!enquiry) return { ok: false, error: 'Enquiry not found' }
      if (String(enquiry.assignedTo) !== session.user.id) {
        return { ok: false, error: 'Enquiry not found' }
      }
      return { ok: true, data: toPlain(enquiry) }
    }

    const enquiry = await query.lean()
    if (!enquiry) return { ok: false, error: 'Enquiry not found' }

    return { ok: true, data: toPlain(enquiry) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST (search + filter + paginate)
// ─────────────────────────────────────────────────────────────────────────────

export async function getEnquiries(
  rawParams: Record<string, unknown> = {}
): Promise<ActionResult<PaginatedResult<EnquiryDocument>>> {
  try {
    const session = await requirePermission('enquiry:read')

    const parsed = EnquiryFilterSchema.safeParse(rawParams)
    if (!parsed.success) {
      return { ok: false, error: 'Invalid filter parameters' }
    }

    const {
      search, status, priority, enquirySource, product,
      category, assignedTo, city, district, slaStatus,
      dateFrom, dateTo, page, pageSize, sortBy, sortOrder,
    } = parsed.data

    await dbConnect()

    // ── Build filter ────────────────────────────────────────────────────────
    const filter: FilterQuery<EnquiryDocument> = {}

    // Role scoping
    if (session.user.role === UserRole.Staff) {
      filter.assignedTo = session.user.id
    } else if (session.user.role === UserRole.Manager && session.user.locationZoneId) {
      // Manager sees all enquiries in their zone (via assigned staff's zone)
      // Simplified: filter by createdBy location — refine with a $lookup if needed
    }

    if (search) {
      filter.$text = { $search: search }
    }
    if (status)        filter.status        = status
    if (priority)      filter.priority      = priority
    if (enquirySource) filter.enquirySource = enquirySource
    if (product)       filter.product       = product
    if (category)      filter.category      = category
    if (city)          filter.city          = { $regex: city, $options: 'i' }
    if (district)      filter.district      = { $regex: district, $options: 'i' }
    if (assignedTo && session.user.role !== UserRole.Staff) {
      filter.assignedTo = assignedTo
    }

    if (slaStatus) {
      const now = new Date()
      if (slaStatus === 'met')    filter.slaMet = true
      if (slaStatus === 'missed') filter.slaMet = false
      if (slaStatus === 'breached') {
        filter.slaMet   = null
        filter.slaDueAt = { $lt: now, $ne: null }
      }
      if (slaStatus === 'at_risk') {
        // Open, not yet due, but within the last SLA_AT_RISK_RATIO of its window.
        filter.slaMet = null
        filter.$expr = {
          $and: [
            { $ne: ['$slaDueAt', null] },
            { $gte: ['$slaDueAt', now] },
            {
              $lte: [
                { $subtract: ['$slaDueAt', now] },
                { $multiply: [SLA_AT_RISK_RATIO, { $subtract: ['$slaDueAt', '$createdAt'] }] },
              ],
            },
          ],
        }
      }
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {
        ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { $lte: new Date(dateTo + 'T23:59:59') } : {}),
      }
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1
    // Priority sorts by its denormalised severity rank, not the raw code string.
    const sortField = sortBy === 'priority' ? 'priorityWeight' : sortBy
    const sort: Record<string, 1 | -1> = search
      ? { score: { $meta: 'textScore' } as unknown as -1, [sortField]: sortDir }
      : { [sortField]: sortDir }

    const [data, total] = await Promise.all([
      Enquiry.find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate('assignedTo', 'name avatar')
        .lean(),
      Enquiry.countDocuments(filter),
    ])

    return {
      ok: true,
      data: {
        data:       toPlain(data),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext:    page * pageSize < total,
        hasPrev:    page > 1,
      },
    }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN
// ─────────────────────────────────────────────────────────────────────────────

export async function assignEnquiry(
  payload: unknown
): Promise<ActionResult<{ assigned: boolean }>> {
  try {
    const session = await requirePermission('enquiry:assign')

    const parsed = AssignEnquirySchema.safeParse(payload)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Invalid assignment data',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    await dbConnect()

    const staff = await User.findById(parsed.data.staffId).lean()
    if (!staff) return { ok: false, error: 'Staff member not found' }

    // Assignment record — pre-save hook deactivates any previous active assignment
    await Assignment.create({
      enquiryId:      parsed.data.enquiryId,
      assignedTo:     parsed.data.staffId,
      assignedBy:     session.user.id,
      assignmentType: AssignmentType.Manual,
      reason:         parsed.data.reason,
      isActive:       true,
    })

    await Enquiry.findByIdAndUpdate(parsed.data.enquiryId, {
      assignedTo: parsed.data.staffId,
      assignedBy: session.user.id,
      assignedAt: new Date(),
      status:     EnquiryStatus.Assigned,
    })

    // Decrement previous staff load, increment new staff load
    await User.findByIdAndUpdate(parsed.data.staffId, { $inc: { currentLoad: 1 } })

    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.EnquiryAssigned,
      entityType: EntityType.Enquiry,
      entityId:   parsed.data.enquiryId,
      metadata:   { staffId: parsed.data.staffId, staffName: staff.name },
    })

    revalidateTag(CACHE_TAGS.enquiries)
    revalidateTag(CACHE_TAGS.assignments)
    revalidateTag(CACHE_TAGS.dashboard)

    return { ok: true, data: { assigned: true } }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF LIST FOR ASSIGNMENT  (feeds the Assign Staff modal)
// ─────────────────────────────────────────────────────────────────────────────

export interface StaffAssignOption {
  id:           string
  name:         string
  email:        string
  loadPercent:  number
  isOverloaded: boolean
  zoneMatch:    boolean   // staff's district/city coverage matches this enquiry's
}

export async function getStaffForAssignmentAction(
  enquiryId: string
): Promise<ActionResult<StaffAssignOption[]>> {
  try {
    await requirePermission('enquiry:assign')
    await dbConnect()

    const enquiry = await Enquiry.findById(enquiryId).select('district city').lean()
    if (!enquiry) return { ok: false, error: 'Enquiry not found' }

    const district = enquiry.district?.trim().toLowerCase()
    const city     = enquiry.city?.trim().toLowerCase()

    const staff = await User.find({ role: UserRole.Staff, status: UserStatus.Active })
      .select('name email district city currentLoad maxLoad')
      .lean()

    const options: StaffAssignOption[] = staff.map((s) => {
      const loadPercent = s.maxLoad > 0 ? Math.round((s.currentLoad / s.maxLoad) * 100) : 0
      const zoneMatch =
        (!!district && s.district?.trim().toLowerCase() === district) ||
        (!!city     && s.city?.trim().toLowerCase()     === city)
      return {
        id:           String(s._id),
        name:         s.name,
        email:        s.email,
        loadPercent,
        isOverloaded: s.currentLoad >= s.maxLoad,
        zoneMatch:    !!zoneMatch,
      }
    })

    // Zone-matched staff first, then least-loaded first within each group.
    options.sort((a, b) => {
      if (a.zoneMatch !== b.zoneMatch) return a.zoneMatch ? -1 : 1
      return a.loadPercent - b.loadPercent
    })

    return { ok: true, data: toPlain(options) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS  (used by dashboard widgets)
// ─────────────────────────────────────────────────────────────────────────────

export async function getEnquiryStats() {
  try {
    const session = await requirePermission('enquiry:read')

    await dbConnect()

    const match: FilterQuery<EnquiryDocument> = {}
    if (session.user.role === UserRole.Staff) {
      match.assignedTo = session.user.id
    }

    const stats = await Enquiry.aggregate([
      { $match: match },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort:  { _id: 1 } },
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } },
          ],
          bySource: [
            { $group: { _id: '$enquirySource', count: { $sum: 1 } } },
          ],
          totals: [
            {
              $group: {
                _id:        null,
                total:      { $sum: 1 },
                unassigned: { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.New] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.InProgress] }, 1, 0] } },
                resolved:   { $sum: { $cond: [{ $eq: ['$status', EnquiryStatus.Resolved] }, 1, 0] } },
                slaBreached: {
                  $sum: {
                    $cond: [
                      { $and: [
                        { $eq: ['$slaMet', null] },
                        { $ne: ['$slaDueAt', null] },
                        { $lt: ['$slaDueAt', '$$NOW'] },
                      ] },
                      1, 0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ])

    return { ok: true as const, data: toPlain(stats[0]) }
  } catch (err) {
    return authErrorToResult(err)
  }
}
