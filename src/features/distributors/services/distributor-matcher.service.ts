import dbConnect from '@/lib/db/connection'
import Dealer from '@/lib/db/models/Dealer'
import Distributor from '@/lib/db/models/Distributor'
import type { Types } from 'mongoose'

export interface ChannelResolution {
  dealerId?:      Types.ObjectId | null
  distributorId?: Types.ObjectId | null
}

// Case-insensitive exact match (values come from the same picker dataset).
function rx(v: string): RegExp {
  return new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
}

/**
 * Resolve the channel (dealer + distributor) that owns a given district/city.
 * Priority: dealer matching district+city → dealer matching district only
 * → distributor matching district (no specific dealer) → no match.
 *
 * Organisational/reporting tag only — does not affect staff auto-assignment.
 */
export async function resolveChannelByArea(params: {
  district?: string
  city?:     string
}): Promise<ChannelResolution> {
  await dbConnect()

  const district = params.district?.trim()
  const city     = params.city?.trim()
  if (!district) return {}

  const base = { isActive: true }

  // 1 — dealer whose serviceLocations match district+city
  if (city) {
    const dealer = await Dealer.findOne({
      ...base,
      serviceLocations: { $elemMatch: { district: rx(district), city: rx(city) } },
    }).select('_id distributorId').lean()
    if (dealer) return { dealerId: dealer._id, distributorId: dealer.distributorId }
  }

  // 2 — dealer whose serviceLocations match the district only
  const dealerByDistrict = await Dealer.findOne({
    ...base,
    serviceLocations: { $elemMatch: { district: rx(district) } },
  }).select('_id distributorId').lean()
  if (dealerByDistrict) return { dealerId: dealerByDistrict._id, distributorId: dealerByDistrict.distributorId }

  // 3 — no dealer covers it directly; fall back to the distributor's territory
  const distributor = await Distributor.findOne({
    ...base,
    assignedDistricts: rx(district),
  }).select('_id').lean()
  if (distributor) return { dealerId: null, distributorId: distributor._id }

  return {}
}
