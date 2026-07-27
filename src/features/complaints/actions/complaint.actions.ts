'use server'

import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import Complaint from '@/lib/db/models/Complaint'
import Customer from '@/lib/db/models/Customer'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { requirePermission, authErrorToResult } from '@/lib/auth/session'
import { CACHE_TAGS } from '@/lib/cache'
import {
  ActivityAction, EntityType, UserRole,
  ComplaintStatus, COMPLAINT_ALLOWED_TRANSITIONS, COMPLAINT_TYPE_LABELS,
} from '@/types/enums'
import { CreateComplaintSchema, UpdateComplaintStatusSchema, ComplaintFilterSchema } from '../validations/complaint.schema'
import type { ActionResult, PaginatedResult } from '@/types/api'
import type { FilterQuery } from 'mongoose'
import type { ComplaintDocument } from '@/lib/db/models/Complaint'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Row shape ─────────────────────────────────────────────────────────────────

export interface ComplaintRow {
  _id:              string
  customerId?:      string
  customerName:     string
  phone:            string
  complaintType:    string
  complaintDate:    string
  status:           string
  description:      string
  resolutionNotes?: string
  enquiryId?:       string
  enquiryNo?:       string
  distributorId?:   string
  distributorName?: string
  dealerId?:        string
  dealerName?:      string
  assignedTo?:      string
  assignedToName?:  string
  resolvedAt?:      string
  createdAt:        string
}

const POPULATE = [
  { path: 'enquiryId',     select: 'enquiryNo' },
  { path: 'distributorId', select: 'name' },
  { path: 'dealerId',      select: 'name' },
  { path: 'assignedTo',    select: 'name' },
]

function mapRow(c: Record<string, unknown>): ComplaintRow {
  const enquiry     = c.enquiryId as { _id?: unknown; enquiryNo?: string } | null
  const distributor  = c.distributorId as { _id?: unknown; name?: string } | null
  const dealer        = c.dealerId as { _id?: unknown; name?: string } | null
  const assignee       = c.assignedTo as { _id?: unknown; name?: string } | null

  return {
    _id:              String(c._id),
    customerId:       c.customerId ? String((c.customerId as { _id?: unknown })?._id ?? c.customerId) : undefined,
    customerName:     String(c.customerName),
    phone:            String(c.phone),
    complaintType:    String(c.complaintType),
    complaintDate:    String(c.complaintDate),
    status:           String(c.status),
    description:      String(c.description),
    resolutionNotes:  c.resolutionNotes as string | undefined,
    enquiryId:        enquiry?._id ? String(enquiry._id) : (c.enquiryId ? String(c.enquiryId) : undefined),
    enquiryNo:        enquiry?.enquiryNo,
    distributorId:    distributor?._id ? String(distributor._id) : (c.distributorId ? String(c.distributorId) : undefined),
    distributorName:  distributor?.name,
    dealerId:         dealer?._id ? String(dealer._id) : (c.dealerId ? String(c.dealerId) : undefined),
    dealerName:       dealer?.name,
    assignedTo:       assignee?._id ? String(assignee._id) : (c.assignedTo ? String(c.assignedTo) : undefined),
    assignedToName:   assignee?.name,
    resolvedAt:       c.resolvedAt ? String(c.resolvedAt) : undefined,
    createdAt:        String(c.createdAt),
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createComplaintAction(
  _prev: ActionResult<ComplaintRow> | null,
  formData: FormData
): Promise<ActionResult<ComplaintRow>> {
  try {
    const session = await requirePermission('complaint:create')
    await dbConnect()

    const raw = {
      customerName:  formData.get('customerName'),
      phone:         formData.get('phone'),
      complaintType: formData.get('complaintType'),
      complaintDate: formData.get('complaintDate'),
      description:   formData.get('description'),
      enquiryId:     formData.get('enquiryId') || undefined,
    }

    const parsed = CreateComplaintSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
        values:      raw,
      }
    }

    // Auto-link an existing Customer by phone — not enforced, just resolved
    // when one already exists so the complaint carries their channel tag.
    const existingCustomer = await Customer.findOne({ phone: parsed.data.phone })
      .select('distributorId dealerId')
      .lean()

    const complaint = await Complaint.create({
      ...parsed.data,
      customerId:    existingCustomer?._id ?? null,
      distributorId: existingCustomer?.distributorId ?? null,
      dealerId:      existingCustomer?.dealerId ?? null,
      status:        ComplaintStatus.Open,
      createdBy:     session.user.id,
    })

    await ActivityLog.create({
      actorId:     session.user.id,
      actorRole:   session.user.role,
      action:      ActivityAction.ComplaintLogged,
      entityType:  EntityType.Complaint,
      entityId:    complaint._id,
      description: `${COMPLAINT_TYPE_LABELS[parsed.data.complaintType]} logged for ${parsed.data.customerName}`,
      metadata:    { complaintType: parsed.data.complaintType, customerId: existingCustomer?._id ?? null },
    })

    revalidateTag(CACHE_TAGS.complaints)

    await complaint.populate(POPULATE)
    return { ok: true, data: toPlain(mapRow(complaint.toObject() as unknown as Record<string, unknown>)) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ── Update status (+ optional resolution notes / reassignment) ────────────────

export async function updateComplaintStatusAction(
  _prev: ActionResult<ComplaintRow> | null,
  formData: FormData
): Promise<ActionResult<ComplaintRow>> {
  try {
    const session = await requirePermission('complaint:update')
    await dbConnect()

    const raw = {
      id:              formData.get('id'),
      status:          formData.get('status'),
      resolutionNotes: formData.get('resolutionNotes') || undefined,
      assignedTo:      formData.get('assignedTo') || undefined,
    }

    const parsed = UpdateComplaintStatusSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const existing = await Complaint.findById(parsed.data.id)
    if (!existing) return { ok: false, error: 'Complaint not found' }

    if (session.user.role === UserRole.Staff && String(existing.assignedTo ?? '') !== session.user.id && String(existing.createdBy) !== session.user.id) {
      return { ok: false, error: 'You can only update complaints you logged or are assigned to' }
    }

    if (parsed.data.status !== existing.status) {
      const allowed = COMPLAINT_ALLOWED_TRANSITIONS[existing.status as ComplaintStatus] ?? []
      if (!allowed.includes(parsed.data.status)) {
        return { ok: false, error: `Cannot move a ${existing.status} complaint to ${parsed.data.status}` }
      }
    }

    const update: Record<string, unknown> = { status: parsed.data.status }
    if (parsed.data.resolutionNotes) update.resolutionNotes = parsed.data.resolutionNotes
    if (parsed.data.assignedTo !== undefined) update.assignedTo = parsed.data.assignedTo
    if (parsed.data.status === ComplaintStatus.Resolved && !existing.resolvedAt) update.resolvedAt = new Date()

    const complaint = await Complaint.findByIdAndUpdate(parsed.data.id, { $set: update }, { new: true })
    if (!complaint) return { ok: false, error: 'Complaint not found' }

    await ActivityLog.create({
      actorId:     session.user.id,
      actorRole:   session.user.role,
      action:      ActivityAction.ComplaintStatusChanged,
      entityType:  EntityType.Complaint,
      entityId:    parsed.data.id,
      changes:     { before: { status: existing.status }, after: { status: parsed.data.status } },
    })

    revalidateTag(CACHE_TAGS.complaints)

    await complaint.populate(POPULATE)
    return { ok: true, data: toPlain(mapRow(complaint.toObject() as unknown as Record<string, unknown>)) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getComplaintAction(id: string): Promise<ActionResult<ComplaintRow>> {
  try {
    const session = await requirePermission('complaint:read')
    await dbConnect()

    const complaint = await Complaint.findById(id).populate(POPULATE).lean()
    if (!complaint) return { ok: false, error: 'Complaint not found' }

    if (session.user.role === UserRole.Staff) {
      const assignedId = (complaint.assignedTo as unknown as { _id?: unknown })?._id ?? complaint.assignedTo
      if (String(assignedId ?? '') !== session.user.id && String(complaint.createdBy) !== session.user.id) {
        return { ok: false, error: 'Complaint not found' }
      }
    }

    return { ok: true, data: toPlain(mapRow(complaint as unknown as Record<string, unknown>)) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function getComplaintsAction(
  rawParams: Record<string, unknown> = {}
): Promise<ActionResult<PaginatedResult<ComplaintRow>>> {
  try {
    const session = await requirePermission('complaint:read')
    await dbConnect()

    const parsed = ComplaintFilterSchema.safeParse(rawParams)
    if (!parsed.success) return { ok: false, error: 'Invalid filter parameters' }

    const { search, complaintType, status, assignedTo, distributorId, dealerId, page, pageSize } = parsed.data

    const filter: FilterQuery<ComplaintDocument> = {}

    if (session.user.role === UserRole.Staff) {
      filter.$or = [{ assignedTo: session.user.id }, { createdBy: session.user.id }]
    } else if (assignedTo) {
      filter.assignedTo = assignedTo
    }

    if (complaintType)  filter.complaintType = complaintType
    if (status)         filter.status        = status
    if (distributorId)  filter.distributorId = distributorId
    if (dealerId)       filter.dealerId      = dealerId
    if (search)          filter.customerName = { $regex: search, $options: 'i' }

    const skip  = (page - 1) * pageSize
    const total = await Complaint.countDocuments(filter)

    const docs = await Complaint.find(filter)
      .sort({ complaintDate: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate(POPULATE)
      .lean()

    return {
      ok: true,
      data: {
        data:       toPlain(docs.map((d) => mapRow(d as unknown as Record<string, unknown>))),
        total, page, pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext:    page * pageSize < total,
        hasPrev:    page > 1,
      },
    }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ── Complaints for a specific customer (feeds the Customer detail page) ──────

export async function getComplaintsForCustomerAction(
  customerId: string
): Promise<ActionResult<ComplaintRow[]>> {
  try {
    await requirePermission('complaint:read')
    await dbConnect()

    const docs = await Complaint.find({ customerId })
      .sort({ complaintDate: -1 })
      .limit(10)
      .populate(POPULATE)
      .lean()

    return { ok: true, data: toPlain(docs.map((d) => mapRow(d as unknown as Record<string, unknown>))) }
  } catch (err) {
    return authErrorToResult(err)
  }
}
