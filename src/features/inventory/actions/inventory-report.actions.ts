'use server'

import dbConnect from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Warehouse from '@/lib/db/models/Warehouse'
import StockLevel from '@/lib/db/models/StockLevel'
import StockBatch from '@/lib/db/models/StockBatch'
import StockTransaction from '@/lib/db/models/StockTransaction'
import { requirePermission, authErrorToResult } from '@/lib/auth/session'
import { resolveWarehouseScope } from '../services/warehouse-scope.service'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

export interface InventoryStats {
  totalSkus:            number
  totalWarehouses:      number
  totalStockQuantity:   number
  totalStockCostValue:  number
  totalStockSalesValue: number
  lowStockCount:        number
  nearExpiryBatchCount: number
  expiredBatchCount:    number
  recentMovementsCount: number
}

export interface LowStockAlertItem {
  productId:        string
  productName:      string
  sku:              string
  category:         string
  uom:              string
  minStockLevel:    number
  reorderQuantity:  number
  totalOnHand:      number
  totalAllocated:   number
  totalAvailable:   number
  shortageQuantity: number
}

export interface ExpiringBatchItem {
  batchId:           string
  productId:         string
  productName:       string
  sku:               string
  warehouseName:     string
  batchNumber:       string
  expiryDate:        string
  quantity:          number
  daysUntilExpiry:   number
  isExpired:         boolean
}

export async function getInventoryStatsAction(): Promise<ActionResult<InventoryStats>> {
  try {
    const session = await requirePermission('inventory:read')
    await dbConnect()

    const scope = await resolveWarehouseScope(session.user.role, session.user.id)

    const [
      totalSkus,
      totalWarehouses,
      allProducts,
      allStockLevels,
      allBatches,
      recentTxCount,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      scope ? Promise.resolve(scope.length) : Warehouse.countDocuments({ isActive: true }),
      Product.find({ isActive: true }).select('minStockLevel costPrice sellingPrice').lean(),
      StockLevel.find(scope ? { warehouseId: { $in: scope } } : {}).lean(),
      StockBatch.find({ quantity: { $gt: 0 }, ...(scope ? { warehouseId: { $in: scope } } : {}) }).lean(),
      StockTransaction.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        ...(scope ? { $or: [{ sourceWarehouseId: { $in: scope } }, { targetWarehouseId: { $in: scope } }] } : {}),
      }),
    ])

    const productMap = new Map<string, { minStock: number; cost: number; selling: number }>()
    for (const p of allProducts) {
      productMap.set(String(p._id), {
        minStock: p.minStockLevel || 0,
        cost:     p.costPrice || 0,
        selling:  p.sellingPrice || 0,
      })
    }

    const stockSumMap = new Map<string, { onHand: number; allocated: number }>()
    let totalStockQuantity = 0
    let totalStockCostValue = 0
    let totalStockSalesValue = 0

    for (const sl of allStockLevels) {
      const pId = String(sl.productId)
      const p = productMap.get(pId)
      const onHand = sl.quantityOnHand || 0
      const allocated = sl.quantityAllocated || 0

      totalStockQuantity += onHand
      if (p) {
        totalStockCostValue += onHand * p.cost
        totalStockSalesValue += onHand * p.selling
      }

      const existing = stockSumMap.get(pId) || { onHand: 0, allocated: 0 }
      stockSumMap.set(pId, {
        onHand:    existing.onHand + onHand,
        allocated: existing.allocated + allocated,
      })
    }

    let lowStockCount = 0
    for (const [pId, pData] of productMap.entries()) {
      const stock = stockSumMap.get(pId) || { onHand: 0, allocated: 0 }
      if (stock.onHand <= pData.minStock) {
        lowStockCount++
      }
    }

    const now = new Date()
    const thirtyDays = new Date()
    thirtyDays.setDate(now.getDate() + 30)

    let nearExpiryBatchCount = 0
    let expiredBatchCount = 0

    for (const b of allBatches) {
      if (b.expiryDate) {
        const exp = new Date(b.expiryDate)
        if (exp < now) {
          expiredBatchCount++
        } else if (exp <= thirtyDays) {
          nearExpiryBatchCount++
        }
      }
    }

    const stats: InventoryStats = {
      totalSkus,
      totalWarehouses,
      totalStockQuantity,
      totalStockCostValue:  Math.round(totalStockCostValue),
      totalStockSalesValue: Math.round(totalStockSalesValue),
      lowStockCount,
      nearExpiryBatchCount,
      expiredBatchCount,
      recentMovementsCount: recentTxCount,
    }

    return { ok: true, data: toPlain(stats) }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to fetch inventory stats',
    }
  }
}

export async function getLowStockAlertsAction(): Promise<ActionResult<LowStockAlertItem[]>> {
  try {
    const session = await requirePermission('inventory:read')
    await dbConnect()

    const scope = await resolveWarehouseScope(session.user.role, session.user.id)

    const products = await Product.find({ isActive: true }).lean()
    const productIds = products.map(p => p._id)

    const stockAgg = await StockLevel.aggregate([
      { $match: { productId: { $in: productIds }, ...(scope ? { warehouseId: { $in: scope } } : {}) } },
      {
        $group: {
          _id:            '$productId',
          totalOnHand:    { $sum: '$quantityOnHand' },
          totalAllocated: { $sum: '$quantityAllocated' },
        },
      },
    ])

    const stockMap = new Map<string, { onHand: number; allocated: number }>()
    for (const s of stockAgg) {
      stockMap.set(String(s._id), {
        onHand:    s.totalOnHand || 0,
        allocated: s.totalAllocated || 0,
      })
    }

    const alerts: LowStockAlertItem[] = []

    for (const p of products) {
      const s = stockMap.get(String(p._id)) || { onHand: 0, allocated: 0 }
      const minLevel = p.minStockLevel || 0
      if (s.onHand <= minLevel) {
        alerts.push({
          productId:        String(p._id),
          productName:      p.name,
          sku:              p.sku,
          category:         p.category,
          uom:              p.uom,
          minStockLevel:    minLevel,
          reorderQuantity:  p.reorderQuantity || 50,
          totalOnHand:      s.onHand,
          totalAllocated:   s.allocated,
          totalAvailable:   Math.max(0, s.onHand - s.allocated),
          shortageQuantity: Math.max(0, minLevel - s.onHand),
        })
      }
    }

    alerts.sort((a, b) => b.shortageQuantity - a.shortageQuantity)

    return { ok: true, data: toPlain(alerts) }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to fetch low stock alerts',
    }
  }
}

export async function getExpiringBatchesAction(): Promise<ActionResult<ExpiringBatchItem[]>> {
  try {
    const session = await requirePermission('inventory:read')
    await dbConnect()

    const scope = await resolveWarehouseScope(session.user.role, session.user.id)

    const now = new Date()
    const sixtyDays = new Date()
    sixtyDays.setDate(now.getDate() + 60)

    const batches = await StockBatch.find({
      quantity:   { $gt: 0 },
      expiryDate: { $lte: sixtyDays },
      ...(scope ? { warehouseId: { $in: scope } } : {}),
    })
      .populate('productId', 'name sku')
      .populate('warehouseId', 'name')
      .sort({ expiryDate: 1 })
      .lean()

    const items: ExpiringBatchItem[] = batches.map(b => {
      const prod = b.productId as unknown as { _id?: unknown; name?: string; sku?: string } | null
      const wh   = b.warehouseId as unknown as { _id?: unknown; name?: string } | null
      const exp  = b.expiryDate ? new Date(b.expiryDate) : new Date()
      const diffTime = exp.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        batchId:         String(b._id),
        productId:       prod?._id ? String(prod._id) : String(b.productId),
        productName:     prod?.name || 'Unknown Product',
        sku:             prod?.sku || '',
        warehouseName:   wh?.name || 'Unknown Warehouse',
        batchNumber:     b.batchNumber,
        expiryDate:      exp.toISOString(),
        quantity:        b.quantity,
        daysUntilExpiry: diffDays,
        isExpired:       diffDays <= 0,
      }
    })

    return { ok: true, data: toPlain(items) }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to fetch expiring batches',
    }
  }
}
