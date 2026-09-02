import Warehouse from '@/lib/db/models/Warehouse'
import { UserRole } from '@/types/enums'
import type { Types } from 'mongoose'

/**
 * Resolves how far a caller's Inventory reads should reach.
 *
 * - Manager/SuperAdmin → null (unrestricted, see every warehouse).
 * - Staff → their own warehouse id(s), or [] if none is linked yet — an
 *   empty array naturally yields empty results everywhere it's used (no
 *   special-casing needed), rather than accidentally falling through to
 *   "unrestricted".
 *
 * Returns ObjectId instances (not strings) so the result drops straight
 * into both `.find()` queries (Mongoose casts strings fine there anyway)
 * and `.aggregate()` `$match` stages (which do NOT cast — a raw string
 * would silently match nothing).
 *
 * Every Inventory read action must call this and force its query to the
 * result rather than trusting a client-sent warehouseId, so a Staff user
 * can't see another distributor's (or Admin's) stock by passing a
 * different id.
 */
export async function resolveWarehouseScope(role: UserRole, userId: string): Promise<Types.ObjectId[] | null> {
  if (role !== UserRole.Staff) return null

  const warehouses = await Warehouse.find({ managerId: userId, isActive: true }).select('_id').lean()
  return warehouses.map((w) => w._id)
}
