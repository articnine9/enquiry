'use server'

import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import type { FilterQuery } from 'mongoose'
import dbConnect from '@/lib/db/connection'
import Enquiry, { type EnquiryDocument } from '@/lib/db/models/Enquiry'
import { ActivityLog, User } from '@/lib/db/models'
import { requireSession, requirePermission, requireRole, authErrorToResult } from '@/lib/auth/session'
import { autoAssign, reassign } from '@/features/assignments/services/assignment.service'
import { resolveMasterValue } from '@/features/settings/services/masterData.service'
import { resolveSlaPolicy } from '@/features/settings/services/slaPolicy.service'
import { resolveChannelByArea } from '@/features/distributors/services/distributor-matcher.service'
import { convertEnquiryToCustomer } from '@/features/customers/services/customer-conversion.service'
import { checkAndNotifyEscalations, type EscalationCandidate } from '../services/escalation-notifier.service'
import { computeSlaDueAt, SLA_AT_RISK_RATIO } from '@/lib/sla'
import type { MasterDataType } from '@/lib/db/models/MasterData'
import { CACHE_TAGS } from '@/lib/cache'
import { ENQUIRY_CSV_COLUMNS } from '../utils/csv-export'
import {
  CreateEnquirySchema,
  UpdateEnquirySchema,
  UpdateStatusSchema,
  EnquiryFilterSchema,
  ReassignEnquirySchema,
  type CreateEnquiryInput,
} from '../validations/enquiry.schema'
import {
  ActivityAction,
  EntityType,
  UserRole,
  UserStatus,
  EnquiryStatus,
  LeadStage,
  LEAD_STAGE_CONVERTED,
} from '@/types/enums'
import type { ActionResult, PaginatedResult } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPlain<T>(doc: T): T {
  // Convert Mongoose doc → plain JS object safe for RSC serialisation
  return JSON.parse(JSON.stringify(doc))
}

// ── Escalation sweep (lazy — no cron exists, so this piggybacks on reads) ──────

function toEscalationCandidate(
  enquiry: { _id: unknown; enquiryNo: string; customerName: string; status: string; leadStage?: string; lastActionAt?: Date | null; escalationNotifiedTier?: string | null },
  assignedToId: unknown
): EscalationCandidate {
  return {
    _id:          enquiry._id,
    enquiryNo:    enquiry.enquiryNo,
    customerName: enquiry.customerName,
    assignedTo:   assignedToId,
    status:       enquiry.status,
    leadStage:    enquiry.leadStage,
    lastActionAt: enquiry.lastActionAt,
    escalationNotifiedTier: enquiry.escalationNotifiedTier,
  }
}

// Fire-and-forget — never blocks or fails the page render that triggered it.
function queueEscalationCheck(candidates: EscalationCandidate[]): void {
  if (candidates.length === 0) return
  checkAndNotifyEscalations(candidates).catch((err) => console.error('Escalation sweep failed:', err))
}

// Verify each supplied dropdown value exists & is active in MasterData, and
// derive the priority sort weight. Only fields present in `data` are checked
// (so partial updates skip untouched fields).
type MasterFieldKey = 'enquirySource' | 'category' | 'product' | 'priority' | 'businessCategory' | 'businessSubCategory'

const MASTER_FIELDS: { key: MasterFieldKey; type: MasterDataType; label: string }[] = [
  { key: 'enquirySource',        type: 'enquiry_source',        label: 'enquiry source' },
  { key: 'category',             type: 'enquiry_category',      label: 'category' },
  { key: 'product',              type: 'enquiry_product',       label: 'product' },
  { key: 'priority',             type: 'enquiry_priority',      label: 'priority' },
  { key: 'businessCategory',     type: 'business_category',     label: 'business category' },
  { key: 'businessSubCategory',  type: 'business_subcategory',  label: 'business sub-category' },
]

async function validateMasterFields(
  data: Partial<Record<MasterFieldKey, string>>
): Promise<
  | { ok: true; priorityWeight?: number }
  | { ok: false; fieldErrors: Record<string, string[]> }
> {
  const fieldErrors: Record<string, string[]> = {}
  let priorityWeight: number | undefined
  let subCategoryRow: Awaited<ReturnType<typeof resolveMasterValue>> = null

  for (const f of MASTER_FIELDS) {
    const code = data[f.key]
    if (code == null) continue
    const row = await resolveMasterValue(f.type, code)
    if (!row || !row.isActive) {
      fieldErrors[f.key] = [`Select a valid ${f.label}`]
      continue
    }
    if (f.key === 'priority') priorityWeight = row.weight ?? 2
    if (f.key === 'businessSubCategory') subCategoryRow = row
  }

  // A sub-category must actually belong to the chosen category.
  if (data.businessCategory && subCategoryRow && subCategoryRow.parentCode !== data.businessCategory) {
    fieldErrors.businessSubCategory = ['Sub-category does not belong to the selected business category']
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  return { ok: true, priorityWeight }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE — shared core, used by both the single-enquiry form and bulk import.
// ─────────────────────────────────────────────────────────────────────────────

// Bulk import awaits auto-assignment (so staff load-balancing stays accurate
// across a whole batch processed back-to-back); the manual form fires it
// off in the background instead, since a single create shouldn't make the
// user wait on it.
async function createValidatedEnquiry(
  input: CreateEnquiryInput,
  session: SessionUser,
  opts: { awaitAutoAssign?: boolean } = {}
): Promise<ActionResult<EnquiryDocument>> {
  const master = await validateMasterFields(input)
  if (!master.ok) {
    return { ok: false, error: 'Please fix the errors below', fieldErrors: master.fieldErrors, values: input }
  }

  const now    = new Date()
  const policy = await resolveSlaPolicy(input.priority, input.category)
  // City-tier matching dropped — Enquiry no longer captures a city/town
  // value; taluks (a different administrative level) are passed instead so
  // distributors that share a district can be disambiguated by taluk scope.
  const channel = await resolveChannelByArea({ district: input.district, taluks: input.taluks })

  const enquiry = await Enquiry.create({
    ...input,
    priorityWeight: master.priorityWeight ?? 2,
    slaPolicyId:    policy.policyId,
    slaDueAt:       computeSlaDueAt(now, policy.resolutionMinutes),
    distributorId:  channel.distributorId ?? null,
    dealerId:       channel.dealerId ?? null,
    createdBy:      session.user.id,
  })

  // Attempt auto-assignment. District+taluk coverage first, falling back to
  // district/pincode-level zone resolution.
  const assignParams = {
    enquiryId: String(enquiry._id),
    pincode:   input.pincode ?? '',
    district:  input.district,
    taluks:    input.taluks,
    actorId:   session.user.id,
    actorRole: session.user.role,
  }
  if (opts.awaitAutoAssign) {
    const r = await autoAssign(assignParams).catch((err) => {
      console.error(`Auto-assign threw for ${enquiry._id}:`, err)
      return null
    })
    if (r && !r.ok) console.error(`Auto-assign failed for ${enquiry._id}:`, r.error)
  } else {
    autoAssign(assignParams)
      .then((r) => { if (!r.ok) console.error(`Auto-assign failed for ${enquiry._id}:`, r.error) })
      .catch((err) => console.error(`Auto-assign threw for ${enquiry._id}:`, err))
  }

  await ActivityLog.create({
    actorId:    session.user.id,
    actorRole:  session.user.role,
    action:     ActivityAction.EnquiryCreated,
    entityType: EntityType.Enquiry,
    entityId:   enquiry._id,
  })

  return { ok: true, data: toPlain(enquiry) }
}

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
    // Taluks arrive as repeated `taluks` entries (one per checked option) —
    // Object.fromEntries only keeps the last, so pull the full set separately.
    raw.taluks = formData.getAll('taluks') as unknown as string

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

    const result = await createValidatedEnquiry(parsed.data, session)
    if (!result.ok) return { ...result, values: raw }

    revalidateTag(CACHE_TAGS.enquiries)
    revalidateTag(CACHE_TAGS.dashboard)

    return result
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
    // EnquiryForm always renders the Location section, so always read the
    // full checked set (an empty array here is a real "cleared all" edit).
    raw.taluks = formData.getAll('taluks') as unknown as string

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

    // Re-resolve the distributor/dealer channel tag when district or taluks
    // change — taluks now feed disambiguation for districts shared by more
    // than one distributor (see distributor-matcher.service.ts).
    if (parsed.data.district != null || parsed.data.taluks != null) {
      const district = parsed.data.district ?? before.district
      const taluks   = parsed.data.taluks   ?? before.taluks
      const channel  = await resolveChannelByArea({ district, taluks })
      update.distributorId = channel.distributorId ?? null
      update.dealerId      = channel.dealerId ?? null
    }

    update.lastActionAt = new Date()
    update.escalationNotifiedTier = null

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
    enquiry.lastActionAt = new Date()
    enquiry.escalationNotifiedTier = null

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
// UPDATE LEAD STAGE
// Free picklist — no transition guard, unlike status above. Independent axis:
// where the deal sits in the sales pipeline, not whether the ticket is open.
// ─────────────────────────────────────────────────────────────────────────────

export async function updateLeadStageAction(
  id:        string,
  leadStage: string,
  dealValue?: number | null
): Promise<ActionResult<{ leadStage: LeadStage }>> {
  try {
    const session = await requirePermission('enquiry:update_status')

    if (!Object.values(LeadStage).includes(leadStage as LeadStage)) {
      return { ok: false, error: 'Invalid lead stage' }
    }

    await dbConnect()
    const before = await Enquiry.findById(id)
      .select('leadStage assignedTo convertedAt customerName phone email address taluks district product category distributorId dealerId businessCategory businessSubCategory')
      .lean()
    if (!before) return { ok: false, error: 'Enquiry not found' }

    if (
      session.user.role === UserRole.Staff &&
      String(before.assignedTo) !== session.user.id
    ) {
      return { ok: false, error: 'You can only update enquiries assigned to you' }
    }

    // First time this enquiry crosses into a converted stage — move it into the
    // Customer database. Guarded by convertedAt so later stage moves among the
    // converted set (e.g. Order Confirmed → Delivered) don't double-count it.
    const now = new Date()
    const isConverting =
      LEAD_STAGE_CONVERTED.includes(leadStage as LeadStage) && !before.convertedAt

    const update: Record<string, unknown> = { leadStage, lastActionAt: now, escalationNotifiedTier: null }
    if (isConverting) {
      update.convertedAt = now
      if (dealValue != null) update.dealValue = dealValue
    }

    await Enquiry.findByIdAndUpdate(id, { $set: update })

    if (isConverting) {
      await convertEnquiryToCustomer({ ...before, dealValue }, now).catch((err) => {
        console.error(`Customer conversion failed for enquiry ${id}:`, err)
      })
    }

    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.LeadStageChanged,
      entityType: EntityType.Enquiry,
      entityId:   id,
      changes: {
        before: { leadStage: before.leadStage },
        after:  { leadStage },
      },
    })

    revalidateTag(CACHE_TAGS.enquiries)
    revalidateTag(CACHE_TAGS.enquiry(id))
    revalidateTag(CACHE_TAGS.dashboard)

    return { ok: true, data: { leadStage: leadStage as LeadStage } }
  } catch (err) {
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
      .populate('distributorId', 'name code territory')
      .populate('dealerId',      'name')

    // Staff scoping — their own assigned enquiries, plus any enquiry they
    // personally created (auto-assign can route a newly-created enquiry to
    // someone else or to Admin; the creator should still be able to see the
    // one they just submitted instead of hitting a 404 right after saving).
    if (session.user.role === UserRole.Staff) {
      const enquiry = await query.lean()
      if (!enquiry) return { ok: false, error: 'Enquiry not found' }
      const assignedToId = (enquiry.assignedTo as unknown as { _id?: unknown })?._id ?? enquiry.assignedTo
      const createdById   = (enquiry.createdBy  as unknown as { _id?: unknown })?._id ?? enquiry.createdBy
      const isAssignee = String(assignedToId) === session.user.id
      const isCreator  = createdById != null && String(createdById) === session.user.id
      if (!isAssignee && !isCreator) {
        return { ok: false, error: 'Enquiry not found' }
      }
      queueEscalationCheck([toEscalationCandidate(enquiry, assignedToId)])
      return { ok: true, data: toPlain(enquiry) }
    }

    const enquiry = await query.lean()
    if (!enquiry) return { ok: false, error: 'Enquiry not found' }

    const assignedToId = (enquiry.assignedTo as unknown as { _id?: unknown })?._id ?? enquiry.assignedTo
    queueEscalationCheck([toEscalationCandidate(enquiry, assignedToId)])

    return { ok: true, data: toPlain(enquiry) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared filter-building — used by both the paginated list and the export.
// ─────────────────────────────────────────────────────────────────────────────

type SessionUser = Awaited<ReturnType<typeof requirePermission>>

function buildEnquiryFilter(
  session: SessionUser,
  parsed: Omit<import('../validations/enquiry.schema').EnquiryFilterInput, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'>
): FilterQuery<EnquiryDocument> {
  const {
    search, status, leadStage, priority, enquirySource, product,
    category, businessCategory, businessSubCategory, assignedTo, taluk, district, distributorId, dealerId, slaStatus,
    dateFrom, dateTo,
  } = parsed

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
  if (leadStage)     filter.leadStage     = leadStage
  if (priority)      filter.priority      = priority
  if (enquirySource) filter.enquirySource = enquirySource
  if (product)       filter.product       = product
  if (category)      filter.category      = category
  if (businessCategory)    filter.businessCategory    = businessCategory
  if (businessSubCategory) filter.businessSubCategory = businessSubCategory
  if (taluk)         filter.taluks        = { $regex: taluk, $options: 'i' }   // matches if any taluk in the array contains the text
  if (district)      filter.district      = { $regex: district, $options: 'i' }
  if (distributorId) filter.distributorId = distributorId
  if (dealerId)      filter.dealerId      = dealerId
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

  return filter
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

    const { search, page, pageSize, sortBy, sortOrder } = parsed.data

    await dbConnect()

    const filter = buildEnquiryFilter(session, parsed.data)

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
        .populate('distributorId', 'name code')
        .populate('dealerId', 'name')
        .lean(),
      Enquiry.countDocuments(filter),
    ])

    queueEscalationCheck(
      data.map((e) => toEscalationCandidate(e, (e.assignedTo as unknown as { _id?: unknown })?._id ?? e.assignedTo))
    )

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
// EXPORT (all rows matching the current filters — not paginated)
// ─────────────────────────────────────────────────────────────────────────────

const EXPORT_ROW_CAP = 10_000

export interface ExportEnquiryRow {
  enquiryNo:     string
  customerName:  string
  phone:         string
  email:         string
  address:       string
  state:         string
  district:      string
  taluks:        string
  pincode:       string
  location:      string
  status:        string
  leadStage:     string
  priority:      string
  enquirySource: string
  businessCategory:    string
  businessSubCategory: string
  product:       string
  category:      string
  subject:       string
  description:   string
  tags:          string
  slaMet:        string
  distributor:   string
  dealer:        string
  assignedTo:    string
  createdAt:     string
}

export async function exportEnquiriesAction(
  rawParams: Record<string, unknown> = {}
): Promise<ActionResult<ExportEnquiryRow[]>> {
  try {
    const session = await requirePermission('enquiry:read')

    const parsed = EnquiryFilterSchema.safeParse(rawParams)
    if (!parsed.success) {
      return { ok: false, error: 'Invalid filter parameters' }
    }

    await dbConnect()

    const filter = buildEnquiryFilter(session, parsed.data)

    const total = await Enquiry.countDocuments(filter)
    if (total > EXPORT_ROW_CAP) {
      return {
        ok: false,
        error: `${total.toLocaleString()} enquiries match these filters — narrow them down below ${EXPORT_ROW_CAP.toLocaleString()} to export.`,
      }
    }

    const rows = await Enquiry.find(filter)
      .sort({ createdAt: -1 })
      .limit(EXPORT_ROW_CAP)
      .populate('assignedTo', 'name')
      .populate('distributorId', 'name')
      .populate('dealerId', 'name')
      .lean()

    const data: ExportEnquiryRow[] = rows.map((e) => ({
      enquiryNo:     e.enquiryNo,
      customerName:  e.customerName,
      phone:         e.phone,
      email:         e.email ?? '',
      address:       e.address,
      state:         e.state ?? '',
      district:      e.district ?? '',
      taluks:        (e.taluks ?? []).join('; '),
      pincode:       e.pincode ?? '',
      location:      e.location,
      status:        e.status,
      leadStage:     e.leadStage,
      priority:      e.priority,
      enquirySource: e.enquirySource,
      businessCategory:    e.businessCategory ?? '',
      businessSubCategory: e.businessSubCategory ?? '',
      product:       e.product,
      category:      e.category,
      subject:       e.subject,
      description:   e.description ?? '',
      tags:          (e.tags ?? []).join('; '),
      slaMet:        e.slaMet == null ? 'Open' : e.slaMet ? 'Met' : 'Missed',
      distributor:   (e.distributorId as unknown as { name?: string } | null)?.name ?? '',
      dealer:        (e.dealerId as unknown as { name?: string } | null)?.name ?? '',
      assignedTo:    (e.assignedTo as unknown as { name?: string } | null)?.name ?? '',
      createdAt:     e.createdAt ? new Date(e.createdAt).toISOString() : '',
    }))

    return { ok: true, data: toPlain(data) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT (CSV → preview → commit)
// ─────────────────────────────────────────────────────────────────────────────

const IMPORT_ROW_CAP = 500

export interface ImportRowResult {
  rowIndex:     number   // 1-based, matches the CSV's data rows (header excluded)
  ok:           boolean
  errors:       string[]
  customerName: string
  phone:        string
  enquiryNo?:   string   // set once actually created (commit step only)
}

// Maps a CSV record (keyed by column label, as read off the header row) to
// the subset of CreateEnquirySchema fields import actually writes — ignores
// any read-only/export-only columns present (Enquiry No, Status, SLA, etc.),
// so a re-exported file can be re-imported unedited.
function mapImportRecord(record: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const col of ENQUIRY_CSV_COLUMNS) {
    if (!col.importable) continue
    const raw = record[col.label]
    if (raw === undefined) continue
    if (col.key === 'taluks' || col.key === 'tags') {
      out[col.key] = raw ? raw.split(';').map((s) => s.trim()).filter(Boolean) : []
    } else {
      out[col.key] = raw
    }
  }
  return out
}

async function validateImportRow(
  record: Record<string, string>,
  rowIndex: number
): Promise<{ result: ImportRowResult; input: CreateEnquiryInput | null }> {
  const raw = mapImportRecord(record)
  const base: Pick<ImportRowResult, 'customerName' | 'phone'> = {
    customerName: String(raw.customerName ?? '').trim() || `Row ${rowIndex}`,
    phone:        String(raw.phone ?? '').trim(),
  }

  const parsed = CreateEnquirySchema.safeParse(raw)
  if (!parsed.success) {
    const errors = Object.entries(parsed.error.flatten().fieldErrors)
      .flatMap(([field, msgs]) => (msgs ?? []).map((m) => `${field}: ${m}`))
    return { result: { rowIndex, ok: false, errors, ...base }, input: null }
  }

  const master = await validateMasterFields(parsed.data)
  if (!master.ok) {
    const errors = Object.entries(master.fieldErrors).flatMap(([field, msgs]) => msgs.map((m) => `${field}: ${m}`))
    return { result: { rowIndex, ok: false, errors, ...base }, input: null }
  }

  return { result: { rowIndex, ok: true, errors: [], ...base }, input: parsed.data }
}

export async function previewEnquiryImportAction(
  records: Record<string, string>[]
): Promise<ActionResult<ImportRowResult[]>> {
  try {
    await requirePermission('enquiry:create')

    if (records.length === 0) return { ok: false, error: 'The file has no data rows' }
    if (records.length > IMPORT_ROW_CAP) {
      return { ok: false, error: `${records.length} rows found — split files above ${IMPORT_ROW_CAP} rows into smaller batches.` }
    }

    await dbConnect()

    const results: ImportRowResult[] = []
    for (let i = 0; i < records.length; i++) {
      const { result } = await validateImportRow(records[i], i + 1)
      results.push(result)
    }

    return { ok: true, data: results }
  } catch (err) {
    return authErrorToResult(err)
  }
}

export async function importEnquiriesAction(
  records: Record<string, string>[]
): Promise<ActionResult<ImportRowResult[]>> {
  try {
    const session = await requirePermission('enquiry:create')

    if (records.length === 0) return { ok: false, error: 'Nothing to import' }
    if (records.length > IMPORT_ROW_CAP) {
      return { ok: false, error: `${records.length} rows found — split files above ${IMPORT_ROW_CAP} rows into smaller batches.` }
    }

    await dbConnect()

    // Processed one at a time (not in parallel) so enquiry-number generation,
    // staff load-balancing, and distributor/dealer resolution all stay
    // correct and consistent with a single manual create.
    const results: ImportRowResult[] = []
    let createdCount = 0
    for (let i = 0; i < records.length; i++) {
      const { result, input } = await validateImportRow(records[i], i + 1)
      if (!input) { results.push(result); continue }

      const created = await createValidatedEnquiry(input, session, { awaitAutoAssign: true })
      if (!created.ok) {
        results.push({ ...result, ok: false, errors: [created.error] })
        continue
      }
      createdCount++
      results.push({ ...result, enquiryNo: created.data.enquiryNo })
    }

    if (createdCount > 0) {
      revalidateTag(CACHE_TAGS.enquiries)
      revalidateTag(CACHE_TAGS.dashboard)
    }

    return { ok: true, data: results }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REASSIGN  (escalation-driven — routes through the transaction-safe
// assignment.service.ts reassign(), unlike assignEnquiry above which writes
// directly. Reason is mandatory here, for the audit trail.)
// ─────────────────────────────────────────────────────────────────────────────

export async function reassignEnquiryAction(
  _prev: ActionResult<{ reassigned: boolean }> | null,
  formData: FormData
): Promise<ActionResult<{ reassigned: boolean }>> {
  try {
    const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)

    const parsed = ReassignEnquirySchema.safeParse(Object.fromEntries(formData.entries()))
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Invalid reassignment data',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const result = await reassign({
      enquiryId: parsed.data.enquiryId,
      staffId:   parsed.data.staffId,
      actorId:   session.user.id,
      actorRole: session.user.role,
      reason:    parsed.data.reason,
    })
    if (!result.ok) return { ok: false, error: result.error }

    revalidateTag(CACHE_TAGS.enquiries)
    revalidateTag(CACHE_TAGS.enquiry(parsed.data.enquiryId))
    revalidateTag(CACHE_TAGS.assignments)
    revalidateTag(CACHE_TAGS.dashboard)

    return { ok: true, data: { reassigned: true } }
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
  zoneMatch:    boolean   // staff's district coverage matches this enquiry's
}

export async function getStaffForAssignmentAction(
  enquiryId: string
): Promise<ActionResult<StaffAssignOption[]>> {
  try {
    await requirePermission('enquiry:assign')
    await dbConnect()

    const enquiry = await Enquiry.findById(enquiryId).select('district').lean()
    if (!enquiry) return { ok: false, error: 'Enquiry not found' }

    const district = enquiry.district?.trim().toLowerCase()

    const staff = await User.find({ role: UserRole.Staff, status: UserStatus.Active })
      .select('name email assignedDistricts assignedTaluks currentLoad maxLoad')
      .lean()

    const options: StaffAssignOption[] = staff.map((s) => {
      const loadPercent = s.maxLoad > 0 ? Math.round((s.currentLoad / s.maxLoad) * 100) : 0
      const zoneMatch = !!district && (s.assignedDistricts ?? []).some((d) => d.trim().toLowerCase() === district)
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
