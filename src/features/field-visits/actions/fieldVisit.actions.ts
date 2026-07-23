'use server'

import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import FieldVisit from '@/lib/db/models/FieldVisit'
import Distributor from '@/lib/db/models/Distributor'
import Dealer from '@/lib/db/models/Dealer'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { requireSession, requirePermission, authErrorToResult } from '@/lib/auth/session'
import { uploadFieldVisitPhoto } from '@/lib/storage/supabase'
import { CACHE_TAGS } from '@/lib/cache'
import { ActivityAction, EntityType, UserRole, VISIT_TYPE_LABELS } from '@/types/enums'
import { CreateFieldVisitSchema, FieldVisitFilterSchema } from '../validations/fieldVisit.schema'
import type { ActionResult, PaginatedResult } from '@/types/api'
import type { FilterQuery } from 'mongoose'
import type { FieldVisitDocument } from '@/lib/db/models/FieldVisit'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Row shape ─────────────────────────────────────────────────────────────────

export interface FieldVisitRow {
  _id:              string
  staffId:          string
  staffName?:       string
  visitDate:        string
  visitType:        string
  customerName:     string
  notes?:           string
  enquiryId?:       string
  enquiryNo?:       string
  distributorId?:   string
  distributorName?: string
  dealerId?:        string
  dealerName?:      string
  gpsLat?:          number | null
  gpsLng?:          number | null
  photoUrl?:        string | null
  createdAt:        string
}

const POPULATE = [
  { path: 'staffId',       select: 'name email' },
  { path: 'distributorId', select: 'name' },
  { path: 'dealerId',      select: 'name' },
  { path: 'enquiryId',     select: 'enquiryNo customerName' },
]

function mapRow(v: Record<string, unknown>): FieldVisitRow {
  const staff        = v.staffId as { _id?: unknown; name?: string } | null
  const distributor   = v.distributorId as { _id?: unknown; name?: string } | null
  const dealer        = v.dealerId as { _id?: unknown; name?: string } | null
  const enquiry        = v.enquiryId as { _id?: unknown; enquiryNo?: string } | null

  return {
    _id:              String(v._id),
    staffId:          String(staff?._id ?? v.staffId ?? ''),
    staffName:        staff?.name,
    visitDate:        String(v.visitDate),
    visitType:        String(v.visitType),
    customerName:     String(v.customerName),
    notes:            v.notes as string | undefined,
    enquiryId:        enquiry?._id ? String(enquiry._id) : (v.enquiryId ? String(v.enquiryId) : undefined),
    enquiryNo:        enquiry?.enquiryNo,
    distributorId:    distributor?._id ? String(distributor._id) : (v.distributorId ? String(v.distributorId) : undefined),
    distributorName:  distributor?.name,
    dealerId:         dealer?._id ? String(dealer._id) : (v.dealerId ? String(v.dealerId) : undefined),
    dealerName:       dealer?.name,
    gpsLat:           v.gpsLat as number | null | undefined,
    gpsLng:           v.gpsLng as number | null | undefined,
    photoUrl:         v.photoUrl as string | null | undefined,
    createdAt:        String(v.createdAt),
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createFieldVisitAction(
  _prev: ActionResult<FieldVisitRow> | null,
  formData: FormData
): Promise<ActionResult<FieldVisitRow>> {
  try {
    const session = await requirePermission('visit:create')
    await dbConnect()

    const raw = {
      visitDate:     formData.get('visitDate'),
      visitType:     formData.get('visitType'),
      customerName:  formData.get('customerName'),
      notes:         formData.get('notes') || undefined,
      enquiryId:     formData.get('enquiryId') || undefined,
      distributorId: formData.get('distributorId') || undefined,
      dealerId:      formData.get('dealerId') || undefined,
      gpsLat:        formData.get('gpsLat') || undefined,
      gpsLng:        formData.get('gpsLng') || undefined,
    }

    const parsed = CreateFieldVisitSchema.safeParse(raw)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
        values:      raw,
      }
    }

    let photoUrl: string | null = null
    const photo = formData.get('photo')
    if (photo instanceof File && photo.size > 0) {
      try {
        photoUrl = await uploadFieldVisitPhoto(photo)
      } catch (err) {
        return {
          ok:     false,
          error:  err instanceof Error ? err.message : 'Photo upload failed',
          values: raw,
        }
      }
    }

    const visit = await FieldVisit.create({
      ...parsed.data,
      staffId: session.user.id,
      photoUrl,
    })

    await ActivityLog.create({
      actorId:     session.user.id,
      actorRole:   session.user.role,
      action:      ActivityAction.FieldVisitLogged,
      entityType:  EntityType.FieldVisit,
      entityId:    visit._id,
      description: `${VISIT_TYPE_LABELS[parsed.data.visitType]} logged for ${parsed.data.customerName}`,
      metadata: {
        visitType:     parsed.data.visitType,
        distributorId: parsed.data.distributorId,
        dealerId:      parsed.data.dealerId,
      },
    })

    revalidateTag(CACHE_TAGS.fieldVisits)

    await visit.populate(POPULATE)

    return { ok: true, data: toPlain(mapRow(visit.toObject() as unknown as Record<string, unknown>)) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getFieldVisitAction(id: string): Promise<ActionResult<FieldVisitRow>> {
  try {
    const session = await requirePermission('visit:read')
    await dbConnect()

    const visit = await FieldVisit.findById(id).populate(POPULATE).lean()
    if (!visit) return { ok: false, error: 'Visit not found' }

    if (session.user.role === UserRole.Staff && String((visit.staffId as { _id?: unknown })?._id ?? visit.staffId) !== session.user.id) {
      return { ok: false, error: 'Visit not found' }
    }

    return { ok: true, data: toPlain(mapRow(visit as unknown as Record<string, unknown>)) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function getFieldVisitsAction(
  rawParams: Record<string, unknown> = {}
): Promise<ActionResult<PaginatedResult<FieldVisitRow>>> {
  try {
    const session = await requirePermission('visit:read')
    await dbConnect()

    const parsed = FieldVisitFilterSchema.safeParse(rawParams)
    if (!parsed.success) return { ok: false, error: 'Invalid filter parameters' }

    const { staffId, visitType, distributorId, dealerId, search, from, to, page, pageSize } = parsed.data

    const filter: FilterQuery<FieldVisitDocument> = {}

    if (session.user.role === UserRole.Staff) {
      filter.staffId = session.user.id
    } else if (staffId) {
      filter.staffId = staffId
    }

    if (visitType)     filter.visitType     = visitType
    if (distributorId) filter.distributorId = distributorId
    if (dealerId)      filter.dealerId      = dealerId
    if (search)         filter.customerName = { $regex: search, $options: 'i' }
    if (from || to) {
      filter.visitDate = {
        ...(from ? { $gte: from } : {}),
        ...(to   ? { $lte: to   } : {}),
      }
    }

    const skip  = (page - 1) * pageSize
    const total = await FieldVisit.countDocuments(filter)

    const docs = await FieldVisit.find(filter)
      .sort({ visitDate: -1 })
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

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getFieldVisitStatsAction(): Promise<
  ActionResult<{ total: number; byType: Record<string, number> }>
> {
  try {
    const session = await requirePermission('visit:read')
    await dbConnect()

    const filter: FilterQuery<FieldVisitDocument> =
      session.user.role === UserRole.Staff ? { staffId: session.user.id } : {}

    const rows = await FieldVisit.aggregate<{ _id: string; count: number }>([
      { $match: filter },
      { $group: { _id: '$visitType', count: { $sum: 1 } } },
    ])

    const byType = Object.fromEntries(rows.map((r) => [r._id, r.count]))
    const total  = rows.reduce((s, r) => s + r.count, 0)

    return { ok: true, data: { total, byType } }
  } catch (err) {
    return authErrorToResult(err)
  }
}

// ── Option lists (for the visit form's optional distributor/dealer selects) ──

export interface OptionRow { _id: string; name: string }

export async function getDistributorOptionsAction(): Promise<ActionResult<OptionRow[]>> {
  try {
    await requireSession()
    await dbConnect()
    const rows = await Distributor.find({ isActive: true }).select('name').sort({ name: 1 }).lean()
    return { ok: true, data: toPlain(rows.map((r) => ({ _id: String(r._id), name: r.name }))) }
  } catch (err) {
    return authErrorToResult(err)
  }
}

export async function getDealerOptionsAction(distributorId?: string): Promise<ActionResult<OptionRow[]>> {
  try {
    await requireSession()
    await dbConnect()
    const filter: FilterQuery<{ isActive: boolean; distributorId?: string }> = { isActive: true }
    if (distributorId) filter.distributorId = distributorId
    const rows = await Dealer.find(filter).select('name').sort({ name: 1 }).lean()
    return { ok: true, data: toPlain(rows.map((r) => ({ _id: String(r._id), name: r.name }))) }
  } catch (err) {
    return authErrorToResult(err)
  }
}
