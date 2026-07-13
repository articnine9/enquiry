/**
 * Zone matcher — pure domain logic, no HTTP concerns.
 *
 * Resolution priority:
 *   1. Exact 5-digit pincode match
 *   2. Normalised district match
 *   3. Normalised city match
 *   4. Global fallback (ZoneMatchTier.Global, zone = null)
 */

import dbConnect from '@/lib/db/connection'
import LocationZone, { type LocationZoneDocument } from '@/lib/db/models/LocationZone'
import User from '@/lib/db/models/User'
import { UserRole } from '@/types/enums'
import { ZoneMatchTier } from '@/types/assignment.types'
import type { ZoneResolution, StaffResolution } from '@/types/assignment.types'
import type { Types } from 'mongoose'

// ── Zone resolution ───────────────────────────────────────────────────────────

/**
 * Find the best matching zone for an enquiry's address fields.
 * Returns the zone (or null) together with the tier that matched.
 */
export async function resolveZone(params: {
  pincode?:  string
  district?: string
  city?:     string
}): Promise<ZoneResolution> {
  await dbConnect()

  const { pincode, district, city } = params

  // 1 — exact pincode
  if (pincode) {
    const zone = await LocationZone.findByPincode(pincode.trim())
    if (zone) return { zone, matchTier: ZoneMatchTier.Pincode }
  }

  // 2 — district
  if (district) {
    const zone = await LocationZone.findByDistrict(district)
    if (zone) return { zone, matchTier: ZoneMatchTier.District }
  }

  // 3 — city
  if (city) {
    const zone = await LocationZone.findByCity(city)
    if (zone) return { zone, matchTier: ZoneMatchTier.City }
  }

  // 4 — no zone found
  return { zone: null, matchTier: ZoneMatchTier.Global }
}

// ── Direct district / city staff resolution ───────────────────────────────────

/**
 * Match an enquiry directly to a staff member by their coverage area.
 * Priority: district+city → district → city. Within a tier, the least-loaded
 * active & available staff member wins. Returns null when nobody covers the area.
 */
export async function resolveStaffByArea(params: {
  district?:   string
  city?:       string
  excludeIds?: Types.ObjectId[]
}): Promise<{ staffId: Types.ObjectId; zoneId?: Types.ObjectId; tier: ZoneMatchTier } | null> {
  await dbConnect()

  const district = params.district?.trim()
  const city     = params.city?.trim()
  const excludeIds = params.excludeIds ?? []
  if (!district && !city) return null

  const base = {
    role:        UserRole.Staff,
    status:      'active',
    isAvailable: true,
    $expr:       { $lt: ['$currentLoad', '$maxLoad'] },
    ...(excludeIds.length && { _id: { $nin: excludeIds } }),
  }

  // Case-insensitive exact matches (values come from the same picker dataset).
  const rx = (v: string) => new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

  const attempts: { filter: Record<string, unknown>; tier: ZoneMatchTier }[] = []
  if (district && city) attempts.push({ filter: { ...base, district: rx(district), city: rx(city) }, tier: ZoneMatchTier.City })
  if (district)         attempts.push({ filter: { ...base, district: rx(district) },                  tier: ZoneMatchTier.District })
  if (city)             attempts.push({ filter: { ...base, city: rx(city) },                          tier: ZoneMatchTier.City })

  for (const a of attempts) {
    const staff = await User.findOne(a.filter)
      .sort({ currentLoad: 1 })
      .select('_id locationZoneId')
      .lean()
    if (staff) {
      return {
        staffId: staff._id as Types.ObjectId,
        zoneId:  staff.locationZoneId as Types.ObjectId | undefined,
        tier:    a.tier,
      }
    }
  }

  return null
}

// ── Staff resolution ──────────────────────────────────────────────────────────

/**
 * Find the least-loaded active staff member within a zone.
 * Falls back to any available staff globally if the zone has no capacity.
 *
 * Selection criteria (in priority order):
 *   1. Staff whose locationZoneId matches the zone
 *   2. Status = Active, currentLoad < maxLoad
 *   3. Sort by currentLoad ASC (round-robin by load)
 *   4. If no zone-matched staff, repeat for all zones (global fallback)
 */
export async function resolveStaff(params: {
  zone:         LocationZoneDocument | null
  excludeIds?:  Types.ObjectId[]
}): Promise<StaffResolution | null> {
  await dbConnect()

  const { zone, excludeIds = [] } = params

  const baseFilter = {
    status:      'active',
    $expr:       { $lt: ['$currentLoad', '$maxLoad'] },
    ...(excludeIds.length && { _id: { $nin: excludeIds } }),
  }

  // 1 — zone-scoped staff
  if (zone) {
    const staff = await User.findOne({
      ...baseFilter,
      locationZoneId: zone._id,
    })
      .sort({ currentLoad: 1 })
      .select('_id currentLoad maxLoad locationZoneId')
      .lean()

    if (staff) {
      return {
        staffId: staff._id as Types.ObjectId,
        zoneId:  zone._id,
        tier:    ZoneMatchTier.Pincode, // overridden by caller with actual tier
      }
    }
  }

  // 2 — global fallback: any available staff
  const globalStaff = await User.findOne(baseFilter)
    .sort({ currentLoad: 1 })
    .select('_id currentLoad maxLoad locationZoneId')
    .lean()

  if (!globalStaff) return null

  return {
    staffId: globalStaff._id as Types.ObjectId,
    zoneId:  globalStaff.locationZoneId as Types.ObjectId | undefined,
    tier:    ZoneMatchTier.Global,
  }
}

// ── Zone capacity check ───────────────────────────────────────────────────────

/**
 * Returns true when the zone still has headroom (its staff's combined
 * currentLoad < zone.maxCapacity).  Used to block auto-assign when a
 * zone is saturated.
 */
export async function isZoneAtCapacity(zoneId: Types.ObjectId): Promise<boolean> {
  await dbConnect()

  const result = await User.aggregate<{ totalLoad: number }>([
    { $match: { locationZoneId: zoneId, status: 'active' } },
    { $group: { _id: null, totalLoad: { $sum: '$currentLoad' } } },
  ])

  const zone = await LocationZone.findById(zoneId).select('maxCapacity').lean()
  if (!zone) return false

  const load = result[0]?.totalLoad ?? 0
  return load >= zone.maxCapacity
}

// ── Zone coverage helpers ─────────────────────────────────────────────────────

/** List all zones that cover a given pincode (multiple zones may share pincodes). */
export async function getZonesByPincode(pincode: string): Promise<LocationZoneDocument[]> {
  await dbConnect()
  return LocationZone.find({ isActive: true, pincodes: pincode.trim() })
    .lean<LocationZoneDocument[]>()
}

/** Summary of which staff are in each zone and their current load. */
export async function getZoneWorkloadSummary(): Promise<
  { zoneId: string; zoneName: string; staffCount: number; totalLoad: number; maxCapacity: number }[]
> {
  await dbConnect()

  const zones = await LocationZone.find({ isActive: true }).select('_id name maxCapacity').lean()

  const staffByZone = await User.aggregate<{
    _id:        Types.ObjectId
    staffCount: number
    totalLoad:  number
  }>([
    { $match: { status: 'active', locationZoneId: { $ne: null } } },
    {
      $group: {
        _id:        '$locationZoneId',
        staffCount: { $sum: 1 },
        totalLoad:  { $sum: '$currentLoad' },
      },
    },
  ])

  const loadMap = new Map(staffByZone.map((r) => [String(r._id), r]))

  return zones.map((z) => {
    const entry = loadMap.get(String(z._id))
    return {
      zoneId:      String(z._id),
      zoneName:    z.name,
      staffCount:  entry?.staffCount ?? 0,
      totalLoad:   entry?.totalLoad  ?? 0,
      maxCapacity: z.maxCapacity,
    }
  })
}
