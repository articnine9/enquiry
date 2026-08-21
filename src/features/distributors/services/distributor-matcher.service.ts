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
 * Resolve the channel (dealer + distributor) that owns a given district/city/taluk.
 *
 * Tiers, most to least specific:
 *  1. Dealer matching district + city
 *  2. Dealer matching district only
 *  3. Distributor matching district + at least one of the enquiry's taluks
 *  4. Distributor matching district only
 *
 * At every tier, if MORE THAN ONE active record matches, resolution stops and
 * returns {} (unassigned) rather than guessing — e.g. Coimbatore district is
 * split across three distributors (Coimbatore North / South / Pollachi) with
 * no dealers under them; without taluk-level data to disambiguate, silently
 * picking whichever one Mongo returns first was tagging enquiries to the
 * wrong distributor. Leaving it unassigned surfaces the gap for a human to
 * resolve manually (or for an admin to scope assignedTaluks) instead.
 *
 * Organisational/reporting tag only — does not affect staff auto-assignment.
 */
export async function resolveChannelByArea(params: {
  district?: string
  city?:     string
  taluks?:   string[]
}): Promise<ChannelResolution> {
  await dbConnect()

  const district = params.district?.trim()
  const city     = params.city?.trim()
  const taluks   = (params.taluks ?? []).map((t) => t.trim()).filter(Boolean)
  if (!district) return {}

  const base = { isActive: true }

  // 1 — dealer(s) whose serviceLocations match district+city
  if (city) {
    const dealers = await Dealer.find({
      ...base,
      serviceLocations: { $elemMatch: { district: rx(district), city: rx(city) } },
    }).select('_id distributorId').lean()
    if (dealers.length === 1) return { dealerId: dealers[0]._id, distributorId: dealers[0].distributorId }
    if (dealers.length > 1)   return {}
  }

  // 2 — dealer(s) whose serviceLocations match the district only
  const dealersByDistrict = await Dealer.find({
    ...base,
    serviceLocations: { $elemMatch: { district: rx(district) } },
  }).select('_id distributorId').lean()
  if (dealersByDistrict.length === 1) {
    return { dealerId: dealersByDistrict[0]._id, distributorId: dealersByDistrict[0].distributorId }
  }
  if (dealersByDistrict.length > 1) return {}

  // 3 — no dealer covers it directly; try distributor scoped to one of this
  // enquiry's taluks within the district (disambiguates shared districts).
  if (taluks.length > 0) {
    const distributorsByTaluk = await Distributor.find({
      ...base,
      assignedDistricts: rx(district),
      assignedTaluks:    { $in: taluks.map(rx) },
    }).select('_id').lean()
    if (distributorsByTaluk.length === 1) return { dealerId: null, distributorId: distributorsByTaluk[0]._id }
    if (distributorsByTaluk.length > 1)   return {}
  }

  // 4 — distributor matching the district only, unscoped by taluk
  const distributorsByDistrict = await Distributor.find({
    ...base,
    assignedDistricts: rx(district),
  }).select('_id').lean()
  if (distributorsByDistrict.length === 1) return { dealerId: null, distributorId: distributorsByDistrict[0]._id }
  if (distributorsByDistrict.length > 1)   return {}

  return {}
}
