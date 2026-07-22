'use server'

import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import Dealer from '@/lib/db/models/Dealer'
import Distributor from '@/lib/db/models/Distributor'
import Enquiry from '@/lib/db/models/Enquiry'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import { CACHE_TAGS } from '@/lib/cache'
import { DealerInputSchema } from '../validations/distributor.schema'
import type { IDealerServiceLocation } from '@/lib/db/models/Dealer'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Row shape ─────────────────────────────────────────────────────────────────

export interface DealerRow {
  _id:              string
  name:             string
  distributorId:    string
  contactName:      string
  contactPhone:     string
  contactEmail?:    string
  address?:         string
  serviceLocations: IDealerServiceLocation[]
  isActive:         boolean
  createdAt:        string
}

// Every district a dealer services must already belong to its distributor's
// assigned districts — checked here since it needs a cross-collection lookup
// a schema validator can't perform.
async function validateServiceLocations(
  distributorId: string,
  serviceLocations: { district: string; city?: string }[]
): Promise<string | null> {
  const distributor = await Distributor.findById(distributorId).select('assignedDistricts name').lean()
  if (!distributor) return 'Distributor not found'

  const allowed = new Set((distributor.assignedDistricts ?? []).map((d) => d.toLowerCase()))
  for (const loc of serviceLocations) {
    if (!allowed.has(loc.district.toLowerCase())) {
      return `"${loc.district}" is not one of ${distributor.name}'s assigned districts`
    }
  }
  return null
}

// ── List (by distributor) ───────────────────────────────────────────────────────

export async function getDealersByDistributorAction(
  distributorId: string
): Promise<ActionResult<DealerRow[]>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const dealers = await Dealer.find({ distributorId }).sort({ name: 1 }).lean()

    return {
      ok: true,
      data: toPlain(dealers.map((d) => ({
        _id:              String(d._id),
        name:             d.name,
        distributorId:    String(d.distributorId),
        contactName:      d.contactName,
        contactPhone:     d.contactPhone,
        contactEmail:     d.contactEmail,
        address:          d.address,
        serviceLocations: d.serviceLocations ?? [],
        isActive:         d.isActive,
        createdAt:        String(d.createdAt),
      }))),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load dealers' }
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createDealerAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = DealerInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const locError = await validateServiceLocations(parsed.data.distributorId, parsed.data.serviceLocations)
    if (locError) return { ok: false, error: locError }

    const dealer = await Dealer.create(parsed.data)
    revalidateTag(CACHE_TAGS.dealers)
    return { ok: true, data: { id: String(dealer._id) } }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create dealer' }
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateDealerAction(
  id:    string,
  input: unknown
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = DealerInputSchema.partial().safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    if (parsed.data.serviceLocations) {
      const existing = await Dealer.findById(id).select('distributorId').lean()
      if (!existing) return { ok: false, error: 'Dealer not found' }
      const distributorId = parsed.data.distributorId ?? String(existing.distributorId)
      const locError = await validateServiceLocations(distributorId, parsed.data.serviceLocations)
      if (locError) return { ok: false, error: locError }
    }

    const dealer = await Dealer.findByIdAndUpdate(id, { $set: parsed.data })
    if (!dealer) return { ok: false, error: 'Dealer not found' }

    revalidateTag(CACHE_TAGS.dealers)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update dealer' }
  }
}

// ── Toggle active ──────────────────────────────────────────────────────────────

export async function toggleDealerActiveAction(
  id:       string,
  isActive: boolean
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    await Dealer.findByIdAndUpdate(id, { isActive })
    revalidateTag(CACHE_TAGS.dealers)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteDealerAction(id: string): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const dealer = await Dealer.findById(id)
    if (!dealer) return { ok: false, error: 'Dealer not found' }

    const enquiryCount = await Enquiry.countDocuments({ dealerId: id })
    if (enquiryCount > 0) {
      return { ok: false, error: `In use by ${enquiryCount} enquir${enquiryCount === 1 ? 'y' : 'ies'} — deactivate it instead` }
    }

    await Dealer.findByIdAndDelete(id)
    revalidateTag(CACHE_TAGS.dealers)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete dealer' }
  }
}
