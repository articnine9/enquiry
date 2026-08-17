'use server'

import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import Warehouse from '@/lib/db/models/Warehouse'
import StockLevel from '@/lib/db/models/StockLevel'
import { requirePermission, authErrorToResult } from '@/lib/auth/session'
import { CACHE_TAGS } from '@/lib/cache'
import { WarehouseInputSchema, type WarehouseInput } from '../validations/inventory.validation'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

export interface WarehouseRow {
  _id:              string
  code:             string
  name:             string
  type:             string
  locationZoneId?:  string
  locationZoneName?: string
  managerId?:       string
  managerName?:     string
  contactPhone?:    string
  address?: {
    line1?:   string
    city?:    string
    district?: string
    state?:   string
    pincode?: string
  }
  totalSkus:        number
  totalQuantity:    number
  isActive:         boolean
  createdAt:        string
}

export async function getWarehousesAction(): Promise<ActionResult<WarehouseRow[]>> {
  try {
    await requirePermission('warehouse:read')
    await dbConnect()

    const warehouses = await Warehouse.find()
      .populate('managerId', 'name email')
      .populate('locationZoneId', 'name')
      .sort({ name: 1 })
      .lean()

    const stockAgg = await StockLevel.aggregate([
      {
        $group: {
          _id:           '$warehouseId',
          totalSkus:     { $sum: 1 },
          totalQuantity: { $sum: '$quantityOnHand' },
        },
      },
    ])

    const stockMap = new Map<string, { totalSkus: number; totalQuantity: number }>()
    for (const s of stockAgg) {
      stockMap.set(String(s._id), {
        totalSkus:     s.totalSkus || 0,
        totalQuantity: s.totalQuantity || 0,
      })
    }

    const rows: WarehouseRow[] = warehouses.map(w => {
      const mgr = w.managerId as unknown as { _id?: unknown; name?: string } | null
      const zone = w.locationZoneId as unknown as { _id?: unknown; name?: string } | null
      const s = stockMap.get(String(w._id)) || { totalSkus: 0, totalQuantity: 0 }

      return {
        _id:              String(w._id),
        code:             w.code,
        name:             w.name,
        type:             w.type,
        locationZoneId:   zone?._id ? String(zone._id) : undefined,
        locationZoneName: zone?.name,
        managerId:        mgr?._id ? String(mgr._id) : undefined,
        managerName:      mgr?.name,
        contactPhone:     w.contactPhone,
        address:          w.address,
        totalSkus:        s.totalSkus,
        totalQuantity:    s.totalQuantity,
        isActive:         w.isActive ?? true,
        createdAt:        w.createdAt ? w.createdAt.toISOString() : new Date().toISOString(),
      }
    })

    return { ok: true, data: toPlain(rows) }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to fetch warehouses',
    }
  }
}

export async function createWarehouseAction(
  data: Partial<WarehouseInput>
): Promise<ActionResult<WarehouseRow>> {
  try {
    await requirePermission('warehouse:manage')
    await dbConnect()

    const parsed = WarehouseInputSchema.safeParse({
      ...data,
      isActive: data.isActive ?? true,
    })
    if (!parsed.success) {
      return {
        ok:          false,
        error:       parsed.error.errors[0]?.message || 'Invalid warehouse data',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const payload = parsed.data

    const existingCode = await Warehouse.findOne({ code: payload.code })
    if (existingCode) {
      return { ok: false, error: `Warehouse code "${payload.code}" already exists` }
    }

    const created = await Warehouse.create(payload)

    revalidateTag(CACHE_TAGS.warehouses)
    revalidateTag(CACHE_TAGS.inventory)

    return {
      ok: true,
      data: {
        _id:           String(created._id),
        code:          created.code,
        name:          created.name,
        type:          created.type,
        contactPhone:  created.contactPhone,
        address:       created.address,
        totalSkus:     0,
        totalQuantity: 0,
        isActive:      created.isActive,
        createdAt:     created.createdAt.toISOString(),
      },
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to create warehouse',
    }
  }
}

export async function updateWarehouseAction(
  id: string,
  data: Partial<WarehouseInput>
): Promise<ActionResult<WarehouseRow>> {
  try {
    await requirePermission('warehouse:manage')
    await dbConnect()

    const warehouse = await Warehouse.findById(id)
    if (!warehouse) {
      return { ok: false, error: 'Warehouse not found' }
    }

    if (data.code && data.code !== warehouse.code) {
      const duplicate = await Warehouse.findOne({ code: data.code, _id: { $ne: id } })
      if (duplicate) {
        return { ok: false, error: `Warehouse code "${data.code}" is already in use` }
      }
    }

    Object.assign(warehouse, data)
    await warehouse.save()

    revalidateTag(CACHE_TAGS.warehouses)
    revalidateTag(CACHE_TAGS.inventory)

    const listRes = await getWarehousesAction()
    const updated = listRes.ok ? listRes.data?.find(w => w._id === id) : null

    if (updated) {
      return { ok: true, data: updated }
    }

    return {
      ok: true,
      data: {
        _id:           String(warehouse._id),
        code:          warehouse.code,
        name:          warehouse.name,
        type:          warehouse.type,
        contactPhone:  warehouse.contactPhone,
        address:       warehouse.address,
        totalSkus:     0,
        totalQuantity: 0,
        isActive:      warehouse.isActive,
        createdAt:     warehouse.createdAt.toISOString(),
      },
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to update warehouse',
    }
  }
}
