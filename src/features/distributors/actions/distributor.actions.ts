'use server'

import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import Distributor from '@/lib/db/models/Distributor'
import Dealer from '@/lib/db/models/Dealer'
import Enquiry from '@/lib/db/models/Enquiry'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import { CACHE_TAGS } from '@/lib/cache'
import { DistributorInputSchema } from '../validations/distributor.schema'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Row shapes ────────────────────────────────────────────────────────────────

export interface DistributorRow {
  _id:               string
  name:              string
  code:              string
  territory:         string
  contactName:       string
  contactPhone:      string
  contactEmail?:     string
  address?:          string
  assignedDistricts: string[]
  isActive:          boolean
  dealerCount:       number
  createdAt:         string
}

export interface DistributorOption {
  _id:               string
  name:              string
  code:              string
  assignedDistricts: string[]
}

// ── List ───────────────────────────────────────────────────────────────────────

export async function getDistributorsAction(): Promise<ActionResult<DistributorRow[]>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const [distributors, dealerCounts] = await Promise.all([
      Distributor.find({}).sort({ name: 1 }).lean(),
      Dealer.aggregate([
        { $group: { _id: '$distributorId', count: { $sum: 1 } } },
      ]),
    ])

    const countMap = new Map(dealerCounts.map((d: { _id: unknown; count: number }) => [String(d._id), d.count]))

    return {
      ok: true,
      data: toPlain(distributors.map((d) => ({
        _id:               String(d._id),
        name:              d.name,
        code:              d.code,
        territory:         d.territory,
        contactName:       d.contactName,
        contactPhone:      d.contactPhone,
        contactEmail:      d.contactEmail,
        address:           d.address,
        assignedDistricts: d.assignedDistricts ?? [],
        isActive:          d.isActive,
        dealerCount:       countMap.get(String(d._id)) ?? 0,
        createdAt:         String(d.createdAt),
      }))),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load distributors' }
  }
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getDistributorAction(id: string): Promise<ActionResult<DistributorRow>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const [d, dealerCount] = await Promise.all([
      Distributor.findById(id).lean(),
      Dealer.countDocuments({ distributorId: id }),
    ])
    if (!d) return { ok: false, error: 'Distributor not found' }

    return {
      ok: true,
      data: toPlain({
        _id:               String(d._id),
        name:              d.name,
        code:              d.code,
        territory:         d.territory,
        contactName:       d.contactName,
        contactPhone:      d.contactPhone,
        contactEmail:      d.contactEmail,
        address:           d.address,
        assignedDistricts: d.assignedDistricts ?? [],
        isActive:          d.isActive,
        dealerCount,
        createdAt:         String(d.createdAt),
      }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load distributor' }
  }
}

/** Lightweight list for the Dealer form's distributor picker. */
export async function getDistributorsForSelectAction(): Promise<ActionResult<DistributorOption[]>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const distributors = await Distributor.find({ isActive: true })
      .select('name code assignedDistricts')
      .sort({ name: 1 })
      .lean()

    return {
      ok: true,
      data: toPlain(distributors.map((d) => ({
        _id: String(d._id), name: d.name, code: d.code, assignedDistricts: d.assignedDistricts ?? [],
      }))),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load distributors' }
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createDistributorAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = DistributorInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const exists = await Distributor.findOne({ code: parsed.data.code })
    if (exists) return { ok: false, error: 'A distributor with this code already exists' }

    const distributor = await Distributor.create(parsed.data)
    revalidateTag(CACHE_TAGS.distributors)
    return { ok: true, data: { id: String(distributor._id) } }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create distributor' }
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateDistributorAction(
  id:    string,
  input: unknown
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = DistributorInputSchema.partial().safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    if (parsed.data.code) {
      const clash = await Distributor.findOne({ code: parsed.data.code, _id: { $ne: id } })
      if (clash) return { ok: false, error: 'A distributor with this code already exists' }
    }

    // If districts are being removed, make sure no dealer under this distributor
    // still services one of the removed districts.
    if (parsed.data.assignedDistricts) {
      const dealers = await Dealer.find({ distributorId: id }).select('name serviceLocations').lean()
      const nextSet = new Set(parsed.data.assignedDistricts.map((d) => d.toLowerCase()))
      for (const dealer of dealers) {
        const orphaned = (dealer.serviceLocations ?? []).find((sl) => !nextSet.has(sl.district.toLowerCase()))
        if (orphaned) {
          return {
            ok: false,
            error: `Cannot remove "${orphaned.district}" — dealer "${dealer.name}" still services it`,
          }
        }
      }
    }

    const distributor = await Distributor.findByIdAndUpdate(id, { $set: parsed.data })
    if (!distributor) return { ok: false, error: 'Distributor not found' }

    revalidateTag(CACHE_TAGS.distributors)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update distributor' }
  }
}

// ── Toggle active ──────────────────────────────────────────────────────────────

export async function toggleDistributorActiveAction(
  id:       string,
  isActive: boolean
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    await Distributor.findByIdAndUpdate(id, { isActive })
    revalidateTag(CACHE_TAGS.distributors)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteDistributorAction(id: string): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const distributor = await Distributor.findById(id)
    if (!distributor) return { ok: false, error: 'Distributor not found' }

    const dealerCount = await Dealer.countDocuments({ distributorId: id })
    if (dealerCount > 0) {
      return { ok: false, error: `Cannot delete — ${dealerCount} dealer${dealerCount === 1 ? '' : 's'} still reference this distributor` }
    }

    const enquiryCount = await Enquiry.countDocuments({ distributorId: id })
    if (enquiryCount > 0) {
      return { ok: false, error: `In use by ${enquiryCount} enquir${enquiryCount === 1 ? 'y' : 'ies'} — deactivate it instead` }
    }

    await Distributor.findByIdAndDelete(id)
    revalidateTag(CACHE_TAGS.distributors)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete distributor' }
  }
}
