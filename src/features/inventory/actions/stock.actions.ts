'use server'

import { revalidateTag } from 'next/cache'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import Warehouse, { type WarehouseDocument } from '@/lib/db/models/Warehouse'
import StockLevel from '@/lib/db/models/StockLevel'
import StockBatch from '@/lib/db/models/StockBatch'
import StockTransaction from '@/lib/db/models/StockTransaction'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { requirePermission, requireRole, authErrorToResult } from '@/lib/auth/session'
import { CACHE_TAGS } from '@/lib/cache'
import { ActivityAction, EntityType, StockTransactionType, UserRole, WarehouseType } from '@/types/enums'
import { resolveWarehouseScope } from '../services/warehouse-scope.service'
import {
  StockInwardInputSchema,
  StockOutwardInputSchema,
  StockTransferInputSchema,
  StockAdjustmentInputSchema,
  StockLedgerFilterSchema,
  type StockInwardInput,
  type StockOutwardInput,
  type StockTransferInput,
  type StockAdjustmentInput,
  type StockLedgerFilter,
} from '../validations/inventory.validation'
import type { ActionResult, PaginatedResult } from '@/types/api'

function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function generateTransactionNo(type: string): string {
  const prefix = {
    [StockTransactionType.InwardPurchase]:    'INW',
    [StockTransactionType.OutwardDispatch]:   'OUT',
    [StockTransactionType.OutwardSample]:     'SMP',
    [StockTransactionType.Transfer]:          'TRF',
    [StockTransactionType.AdjustmentLoss]:    'ADJ-L',
    [StockTransactionType.AdjustmentSurplus]: 'ADJ-S',
  }[type] || 'STX'

  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${y}${m}-${rand}`
}

export interface StockTransactionRow {
  _id:                 string
  transactionNo:       string
  type:                string
  sourceWarehouseId?:  string
  sourceWarehouseName?: string
  targetWarehouseId?:  string
  targetWarehouseName?: string
  items: Array<{
    productId:    string
    productName?: string
    productSku?:  string
    batchNumber?: string
    quantity:     number
    unitPrice?:   number
    totalPrice?:  number
  }>
  referenceNo?:        string
  enquiryId?:          string
  distributorId?:      string
  performedBy:         string
  performerName?:      string
  recipientName?:      string
  notes?:              string
  createdAt:           string
}

// ─── 1. Inward (Goods Receipt / Purchase) ─────────────────────────────────────

export async function recordStockInwardAction(
  data: StockInwardInput
): Promise<ActionResult<StockTransactionRow>> {
  try {
    const session = await requirePermission('stock:inward')
    await dbConnect()

    const parsed = StockInwardInputSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       parsed.error.errors[0]?.message || 'Invalid inward data',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const { targetWarehouseId, referenceNo, items, notes } = parsed.data
    const warehouse = await Warehouse.findById(targetWarehouseId)
    if (!warehouse) {
      return { ok: false, error: 'Target warehouse not found' }
    }

    const transactionNo = generateTransactionNo(StockTransactionType.InwardPurchase)
    const transactionItems = []

    for (const item of items) {
      const product = await Product.findById(item.productId)
      if (!product) {
        return { ok: false, error: `Product ID ${item.productId} not found` }
      }

      // Update Stock Level
      await StockLevel.findOneAndUpdate(
        { productId: product._id, warehouseId: warehouse._id },
        {
          $inc: { quantityOnHand: item.quantity },
          $set: { lastRestockedAt: new Date() },
        },
        { upsert: true, new: true }
      )

      // Update or create Stock Batch
      if (item.batchNumber && item.batchNumber.trim()) {
        const batchNum = item.batchNumber.trim().toUpperCase()
        const mfg = item.manufacturingDate ? new Date(item.manufacturingDate) : undefined
        const exp = item.expiryDate ? new Date(item.expiryDate) : undefined

        await StockBatch.findOneAndUpdate(
          { productId: product._id, warehouseId: warehouse._id, batchNumber: batchNum },
          {
            $inc: { quantity: item.quantity },
            $set: {
              ...(mfg ? { manufacturingDate: mfg } : {}),
              ...(exp ? { expiryDate: exp } : {}),
              costPrice: item.unitPrice || product.costPrice || 0,
              isActive:  true,
            },
          },
          { upsert: true, new: true }
        )
      }

      transactionItems.push({
        productId:   product._id,
        batchNumber: item.batchNumber ? item.batchNumber.trim().toUpperCase() : undefined,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice || product.costPrice || 0,
        totalPrice:  (item.unitPrice || product.costPrice || 0) * item.quantity,
        notes:       item.notes,
      })
    }

    const transaction = await StockTransaction.create({
      transactionNo,
      type:              StockTransactionType.InwardPurchase,
      targetWarehouseId: warehouse._id,
      items:             transactionItems,
      referenceNo,
      performedBy:       session.user.id,
      notes,
    })

    // Activity Log
    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.StockInward,
      entityType: EntityType.StockTransaction,
      entityId:   transaction._id,
      metadata:   { transactionNo, targetWarehouse: warehouse.name, itemCount: items.length },
    })

    revalidateTag(CACHE_TAGS.stock)
    revalidateTag(CACHE_TAGS.inventory)
    revalidateTag(CACHE_TAGS.products)

    return {
      ok: true,
      data: {
        _id:                 String(transaction._id),
        transactionNo:       transaction.transactionNo,
        type:                transaction.type,
        targetWarehouseId:   String(warehouse._id),
        targetWarehouseName: warehouse.name,
        items:               items.map(i => ({ ...i, quantity: i.quantity })),
        referenceNo:         transaction.referenceNo,
        performedBy:         String(session.user.id),
        notes:               transaction.notes,
        createdAt:           transaction.createdAt.toISOString(),
      },
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to record stock inward',
    }
  }
}

// ─── 2. Outward (Dispatch / Sample) ───────────────────────────────────────────

export async function recordStockOutwardAction(
  data: StockOutwardInput
): Promise<ActionResult<StockTransactionRow>> {
  try {
    const session = await requirePermission('stock:outward')
    await dbConnect()

    const parsed = StockOutwardInputSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       parsed.error.errors[0]?.message || 'Invalid outward data',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const { type, targetWarehouseId, recipientName, referenceNo, enquiryId, distributorId, items, notes } = parsed.data

    // "From" — always server-resolved, never trusted from the client:
    // Staff dispatch out of their own linked warehouse; Admin/Manager
    // always dispatch out of the one Central warehouse ("Admin"'s own
    // stock) — there is no manual source selection for either role.
    let sourceWarehouseId: string
    if (session.user.role === UserRole.Staff) {
      const ownWarehouse = await Warehouse.findOne({ managerId: session.user.id, isActive: true }).lean()
      if (!ownWarehouse) {
        return { ok: false, error: 'No warehouse is linked to your account yet — contact an admin' }
      }
      sourceWarehouseId = String(ownWarehouse._id)
      if (targetWarehouseId) {
        return { ok: false, error: 'Staff dispatches cannot select a destination warehouse' }
      }
      if (!recipientName) {
        return { ok: false, error: 'Recipient name is required' }
      }
    } else {
      const centralWarehouse = await Warehouse.findOne({ type: WarehouseType.Central, isActive: true }).lean()
      if (!centralWarehouse) {
        return { ok: false, error: 'No Central warehouse is configured — contact an admin' }
      }
      sourceWarehouseId = String(centralWarehouse._id)
      if (!targetWarehouseId && !recipientName) {
        return { ok: false, error: 'Select a destination warehouse or enter a recipient name' }
      }
    }

    const warehouse = await Warehouse.findById(sourceWarehouseId)
    if (!warehouse) {
      return { ok: false, error: 'Source warehouse not found' }
    }

    let targetWh: WarehouseDocument | null = null
    if (targetWarehouseId) {
      targetWh = await Warehouse.findById(targetWarehouseId)
      if (!targetWh) {
        return { ok: false, error: 'Destination warehouse not found' }
      }
      if (String(targetWh._id) === String(warehouse._id)) {
        return { ok: false, error: 'Source and destination warehouses must be different' }
      }
    }

    // Check stock availability
    for (const item of items) {
      const stockLevel = await StockLevel.findOne({ productId: item.productId, warehouseId: warehouse._id })
      const available = stockLevel ? stockLevel.quantityOnHand - (stockLevel.quantityAllocated || 0) : 0
      if (available < item.quantity) {
        const prod = await Product.findById(item.productId).select('name sku')
        return {
          ok:    false,
          error: `Insufficient stock for "${prod?.name || item.productId}". Available: ${available}, Requested: ${item.quantity}`,
        }
      }

      if (item.batchNumber && item.batchNumber.trim()) {
        const batch = await StockBatch.findOne({
          productId:   item.productId,
          warehouseId: warehouse._id,
          batchNumber: item.batchNumber.trim().toUpperCase(),
        })
        if (!batch || batch.quantity < item.quantity) {
          return {
            ok:    false,
            error: `Insufficient batch stock for Batch "${item.batchNumber}". Batch Available: ${batch?.quantity || 0}`,
          }
        }
      }
    }

    const transactionNo = generateTransactionNo(type)
    const transactionItems = []

    for (const item of items) {
      const product = await Product.findById(item.productId)

      // Decrement stock level
      await StockLevel.findOneAndUpdate(
        { productId: item.productId, warehouseId: warehouse._id },
        { $inc: { quantityOnHand: -item.quantity } }
      )

      // Decrement batch if specified
      if (item.batchNumber && item.batchNumber.trim()) {
        await StockBatch.findOneAndUpdate(
          {
            productId:   item.productId,
            warehouseId: warehouse._id,
            batchNumber: item.batchNumber.trim().toUpperCase(),
          },
          { $inc: { quantity: -item.quantity } }
        )
      }

      // Dispatching to another warehouse (e.g. a distributor's depot) —
      // credit the destination the same way Transfer does, so both ends of
      // the movement are reflected in stock levels, not just the source.
      if (targetWh) {
        await StockLevel.findOneAndUpdate(
          { productId: item.productId, warehouseId: targetWh._id },
          {
            $inc: { quantityOnHand: item.quantity },
            $set: { lastRestockedAt: new Date() },
          },
          { upsert: true, new: true }
        )

        if (item.batchNumber && item.batchNumber.trim()) {
          const batchNum = item.batchNumber.trim().toUpperCase()
          const sourceBatch = await StockBatch.findOne({
            productId:   item.productId,
            warehouseId: warehouse._id,
            batchNumber: batchNum,
          })
          if (sourceBatch) {
            await StockBatch.findOneAndUpdate(
              { productId: item.productId, warehouseId: targetWh._id, batchNumber: batchNum },
              {
                $inc: { quantity: item.quantity },
                $set: {
                  manufacturingDate: sourceBatch.manufacturingDate,
                  expiryDate:        sourceBatch.expiryDate,
                  costPrice:         sourceBatch.costPrice,
                  isActive:          true,
                },
              },
              { upsert: true, new: true }
            )
          }
        }
      }

      transactionItems.push({
        productId:   product?._id || new mongoose.Types.ObjectId(item.productId),
        batchNumber: item.batchNumber ? item.batchNumber.trim().toUpperCase() : undefined,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice || product?.sellingPrice || 0,
        totalPrice:  (item.unitPrice || product?.sellingPrice || 0) * item.quantity,
        notes:       item.notes,
      })
    }

    const transaction = await StockTransaction.create({
      transactionNo,
      type,
      sourceWarehouseId: warehouse._id,
      targetWarehouseId: targetWh?._id,
      recipientName:     recipientName || undefined,
      items:             transactionItems,
      referenceNo,
      enquiryId:         enquiryId ? new mongoose.Types.ObjectId(enquiryId) : undefined,
      distributorId:     distributorId ? new mongoose.Types.ObjectId(distributorId) : undefined,
      performedBy:       session.user.id,
      notes,
    })

    // Activity Log
    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.StockOutward,
      entityType: EntityType.StockTransaction,
      entityId:   transaction._id,
      metadata:   {
        transactionNo, sourceWarehouse: warehouse.name, itemCount: items.length,
        targetWarehouse: targetWh?.name, recipientName,
      },
    })

    revalidateTag(CACHE_TAGS.stock)
    revalidateTag(CACHE_TAGS.inventory)
    revalidateTag(CACHE_TAGS.products)

    return {
      ok: true,
      data: {
        _id:                 String(transaction._id),
        transactionNo:       transaction.transactionNo,
        type:                transaction.type,
        sourceWarehouseId:   String(warehouse._id),
        sourceWarehouseName: warehouse.name,
        targetWarehouseId:   targetWh ? String(targetWh._id) : undefined,
        targetWarehouseName: targetWh?.name,
        recipientName:       transaction.recipientName,
        items:               items.map(i => ({ ...i, quantity: i.quantity })),
        referenceNo:         transaction.referenceNo,
        performedBy:         String(session.user.id),
        notes:               transaction.notes,
        createdAt:           transaction.createdAt.toISOString(),
      },
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to record stock outward',
    }
  }
}

// ─── 3. Transfer (Between Warehouses) ─────────────────────────────────────────

export async function recordStockTransferAction(
  data: StockTransferInput
): Promise<ActionResult<StockTransactionRow>> {
  try {
    const session = await requirePermission('stock:transfer')
    await dbConnect()

    const parsed = StockTransferInputSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       parsed.error.errors[0]?.message || 'Invalid transfer data',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const { sourceWarehouseId, targetWarehouseId, referenceNo, items, notes } = parsed.data
    const [sourceWh, targetWh] = await Promise.all([
      Warehouse.findById(sourceWarehouseId),
      Warehouse.findById(targetWarehouseId),
    ])

    if (!sourceWh || !targetWh) {
      return { ok: false, error: 'Source or target warehouse not found' }
    }

    // Validate availability at source
    for (const item of items) {
      const stockLevel = await StockLevel.findOne({ productId: item.productId, warehouseId: sourceWh._id })
      const available = stockLevel ? stockLevel.quantityOnHand - (stockLevel.quantityAllocated || 0) : 0
      if (available < item.quantity) {
        const prod = await Product.findById(item.productId).select('name sku')
        return {
          ok:    false,
          error: `Insufficient stock in ${sourceWh.name} for "${prod?.name || item.productId}". Available: ${available}`,
        }
      }
    }

    const transactionNo = generateTransactionNo(StockTransactionType.Transfer)
    const transactionItems = []

    for (const item of items) {
      const product = await Product.findById(item.productId)

      // Decrement source warehouse
      await StockLevel.findOneAndUpdate(
        { productId: item.productId, warehouseId: sourceWh._id },
        { $inc: { quantityOnHand: -item.quantity } }
      )

      // Increment target warehouse
      await StockLevel.findOneAndUpdate(
        { productId: item.productId, warehouseId: targetWh._id },
        {
          $inc: { quantityOnHand: item.quantity },
          $set: { lastRestockedAt: new Date() },
        },
        { upsert: true, new: true }
      )

      // Batch adjustment if applicable
      if (item.batchNumber && item.batchNumber.trim()) {
        const batchNum = item.batchNumber.trim().toUpperCase()
        const sourceBatch = await StockBatch.findOne({
          productId:   item.productId,
          warehouseId: sourceWh._id,
          batchNumber: batchNum,
        })

        if (sourceBatch) {
          sourceBatch.quantity -= item.quantity
          await sourceBatch.save()

          await StockBatch.findOneAndUpdate(
            { productId: item.productId, warehouseId: targetWh._id, batchNumber: batchNum },
            {
              $inc: { quantity: item.quantity },
              $set: {
                manufacturingDate: sourceBatch.manufacturingDate,
                expiryDate:        sourceBatch.expiryDate,
                costPrice:         sourceBatch.costPrice,
                isActive:          true,
              },
            },
            { upsert: true, new: true }
          )
        }
      }

      transactionItems.push({
        productId:   product?._id || new mongoose.Types.ObjectId(item.productId),
        batchNumber: item.batchNumber ? item.batchNumber.trim().toUpperCase() : undefined,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice || product?.costPrice || 0,
        totalPrice:  (item.unitPrice || product?.costPrice || 0) * item.quantity,
        notes:       item.notes,
      })
    }

    const transaction = await StockTransaction.create({
      transactionNo,
      type:              StockTransactionType.Transfer,
      sourceWarehouseId: sourceWh._id,
      targetWarehouseId: targetWh._id,
      items:             transactionItems,
      referenceNo,
      performedBy:       session.user.id,
      notes,
    })

    // Activity Log
    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.StockTransfer,
      entityType: EntityType.StockTransaction,
      entityId:   transaction._id,
      metadata:   { transactionNo, from: sourceWh.name, to: targetWh.name, itemCount: items.length },
    })

    revalidateTag(CACHE_TAGS.stock)
    revalidateTag(CACHE_TAGS.inventory)
    revalidateTag(CACHE_TAGS.products)

    return {
      ok: true,
      data: {
        _id:                 String(transaction._id),
        transactionNo:       transaction.transactionNo,
        type:                transaction.type,
        sourceWarehouseId:   String(sourceWh._id),
        sourceWarehouseName: sourceWh.name,
        targetWarehouseId:   String(targetWh._id),
        targetWarehouseName: targetWh.name,
        items:               items.map(i => ({ ...i, quantity: i.quantity })),
        referenceNo:         transaction.referenceNo,
        performedBy:         String(session.user.id),
        notes:               transaction.notes,
        createdAt:           transaction.createdAt.toISOString(),
      },
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to record stock transfer',
    }
  }
}

// ─── 4. Adjustment (Loss / Damage / Surplus) ──────────────────────────────────

export async function recordStockAdjustmentAction(
  data: StockAdjustmentInput
): Promise<ActionResult<StockTransactionRow>> {
  try {
    const session = await requirePermission('stock:adjust')
    await dbConnect()

    const parsed = StockAdjustmentInputSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       parsed.error.errors[0]?.message || 'Invalid adjustment data',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const { type, warehouseId, referenceNo, items, reason } = parsed.data
    const warehouse = await Warehouse.findById(warehouseId)
    if (!warehouse) {
      return { ok: false, error: 'Warehouse not found' }
    }

    const isLoss = type === StockTransactionType.AdjustmentLoss
    const transactionNo = generateTransactionNo(type)
    const transactionItems = []

    for (const item of items) {
      const product = await Product.findById(item.productId)
      const qtyDelta = isLoss ? -item.quantity : item.quantity

      await StockLevel.findOneAndUpdate(
        { productId: item.productId, warehouseId: warehouse._id },
        {
          $inc: { quantityOnHand: qtyDelta },
          $set: { lastAuditAt: new Date() },
        },
        { upsert: true, new: true }
      )

      if (item.batchNumber && item.batchNumber.trim()) {
        await StockBatch.findOneAndUpdate(
          {
            productId:   item.productId,
            warehouseId: warehouse._id,
            batchNumber: item.batchNumber.trim().toUpperCase(),
          },
          { $inc: { quantity: qtyDelta } }
        )
      }

      transactionItems.push({
        productId:   product?._id || new mongoose.Types.ObjectId(item.productId),
        batchNumber: item.batchNumber ? item.batchNumber.trim().toUpperCase() : undefined,
        quantity:    item.quantity,
        unitPrice:   product?.costPrice || 0,
        totalPrice:  (product?.costPrice || 0) * item.quantity,
        notes:       reason,
      })
    }

    const transaction = await StockTransaction.create({
      transactionNo,
      type,
      sourceWarehouseId: isLoss ? warehouse._id : undefined,
      targetWarehouseId: !isLoss ? warehouse._id : undefined,
      items:             transactionItems,
      referenceNo,
      performedBy:       session.user.id,
      notes:             reason,
    })

    // Activity Log
    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.StockAdjusted,
      entityType: EntityType.StockTransaction,
      entityId:   transaction._id,
      metadata:   { transactionNo, warehouse: warehouse.name, type, reason },
    })

    revalidateTag(CACHE_TAGS.stock)
    revalidateTag(CACHE_TAGS.inventory)
    revalidateTag(CACHE_TAGS.products)

    return {
      ok: true,
      data: {
        _id:                 String(transaction._id),
        transactionNo:       transaction.transactionNo,
        type:                transaction.type,
        sourceWarehouseId:   isLoss ? String(warehouse._id) : undefined,
        sourceWarehouseName: isLoss ? warehouse.name : undefined,
        targetWarehouseId:   !isLoss ? String(warehouse._id) : undefined,
        targetWarehouseName: !isLoss ? warehouse.name : undefined,
        items:               items.map(i => ({ ...i, quantity: i.quantity })),
        referenceNo:         transaction.referenceNo,
        performedBy:         String(session.user.id),
        notes:               transaction.notes,
        createdAt:           transaction.createdAt.toISOString(),
      },
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to record stock adjustment',
    }
  }
}

// ─── 5. Ledger / Movements Query ──────────────────────────────────────────────

export async function getStockLedgerAction(
  rawFilter: Record<string, unknown> = {}
): Promise<ActionResult<PaginatedResult<StockTransactionRow>>> {
  try {
    const session = await requirePermission('inventory:read')
    await dbConnect()

    const scope = await resolveWarehouseScope(session.user.role, session.user.id)

    const parsed = StockLedgerFilterSchema.safeParse(rawFilter)
    const { productId, warehouseId, type, startDate, endDate, page, limit } = parsed.success
      ? parsed.data
      : { page: 1, limit: 20, productId: undefined, warehouseId: undefined, type: undefined, startDate: undefined, endDate: undefined }

    const query: mongoose.FilterQuery<typeof StockTransaction> = {}

    if (type && type.trim()) {
      query.type = type.trim()
    }

    if (productId && productId.trim()) {
      query['items.productId'] = new mongoose.Types.ObjectId(productId.trim())
    }

    if (scope) {
      // Staff — always restricted to their own warehouse(s), regardless of
      // whatever the client's filter dropdown sent.
      query.$or = [{ sourceWarehouseId: { $in: scope } }, { targetWarehouseId: { $in: scope } }]
    } else if (warehouseId && warehouseId.trim()) {
      const whId = new mongoose.Types.ObjectId(warehouseId.trim())
      query.$or = [{ sourceWarehouseId: whId }, { targetWarehouseId: whId }]
    }

    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        query.createdAt.$lte = end
      }
    }

    const skip = (page - 1) * limit

    const [txs, total] = await Promise.all([
      StockTransaction.find(query)
        .populate('sourceWarehouseId', 'name code')
        .populate('targetWarehouseId', 'name code')
        .populate('performedBy', 'name email')
        .populate('items.productId', 'name sku uom')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockTransaction.countDocuments(query),
    ])

    const rows: StockTransactionRow[] = txs.map(t => {
      const srcWh = t.sourceWarehouseId as unknown as { _id?: unknown; name?: string } | null
      const tgtWh = t.targetWarehouseId as unknown as { _id?: unknown; name?: string } | null
      const perf  = t.performedBy as unknown as { _id?: unknown; name?: string } | null

      const items = (t.items || []).map(i => {
        const p = i.productId as unknown as { _id?: unknown; name?: string; sku?: string } | null
        return {
          productId:   p?._id ? String(p._id) : String(i.productId),
          productName: p?.name,
          productSku:  p?.sku,
          batchNumber: i.batchNumber,
          quantity:    i.quantity,
          unitPrice:   i.unitPrice,
          totalPrice:  i.totalPrice,
        }
      })

      return {
        _id:                 String(t._id),
        transactionNo:       t.transactionNo,
        type:                t.type,
        sourceWarehouseId:   srcWh?._id ? String(srcWh._id) : undefined,
        sourceWarehouseName: srcWh?.name,
        targetWarehouseId:   tgtWh?._id ? String(tgtWh._id) : undefined,
        targetWarehouseName: tgtWh?.name,
        items,
        referenceNo:         t.referenceNo,
        enquiryId:           t.enquiryId ? String(t.enquiryId) : undefined,
        distributorId:       t.distributorId ? String(t.distributorId) : undefined,
        performedBy:         perf?._id ? String(perf._id) : String(t.performedBy),
        performerName:       perf?.name,
        recipientName:       t.recipientName,
        notes:               t.notes,
        createdAt:           t.createdAt ? t.createdAt.toISOString() : new Date().toISOString(),
      }
    })

    return {
      ok: true,
      data: {
        data:       toPlain(rows),
        total,
        page,
        pageSize:   limit,
        totalPages: Math.ceil(total / limit),
        hasNext:    page * limit < total,
        hasPrev:    page > 1,
      },
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to fetch stock movements',
    }
  }
}

// ─── 6. Per-warehouse stock breakdown (Admin/Manager) ─────────────────────────

export interface WarehouseStockBreakdown {
  warehouseId:      string
  warehouseName:    string
  currentBalance:   number
  totalReceived:    number
  receivedByType:   Array<{ type: string; quantity: number }>
  totalIssued:      number
  issuedByType:     Array<{ type: string; quantity: number }>
}

/**
 * "Admin should be able to view the complete stock details of each
 * distributor, including their current stock balance, received stock,
 * transferred/issued stock, and existing stock." Admin/Manager only — a
 * Staff/distributor's own KPI cards already cover their current balance,
 * this extra received-vs-issued breakdown is an Admin oversight view.
 */
export async function getWarehouseStockBreakdownAction(
  warehouseId: string
): Promise<ActionResult<WarehouseStockBreakdown>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const warehouse = await Warehouse.findById(warehouseId).select('name').lean()
    if (!warehouse) {
      return { ok: false, error: 'Warehouse not found' }
    }
    const whId = new mongoose.Types.ObjectId(warehouseId)

    const [balanceAgg, receivedAgg, issuedAgg] = await Promise.all([
      StockLevel.aggregate([
        { $match: { warehouseId: whId } },
        { $group: { _id: null, total: { $sum: '$quantityOnHand' } } },
      ]),
      StockTransaction.aggregate([
        { $match: { targetWarehouseId: whId } },
        { $unwind: '$items' },
        { $group: { _id: '$type', quantity: { $sum: '$items.quantity' } } },
      ]),
      StockTransaction.aggregate([
        { $match: { sourceWarehouseId: whId } },
        { $unwind: '$items' },
        { $group: { _id: '$type', quantity: { $sum: '$items.quantity' } } },
      ]),
    ])

    const receivedByType = receivedAgg.map((r) => ({ type: String(r._id), quantity: r.quantity as number }))
    const issuedByType   = issuedAgg.map((r) => ({ type: String(r._id), quantity: r.quantity as number }))

    return {
      ok: true,
      data: toPlain({
        warehouseId,
        warehouseName:  warehouse.name,
        currentBalance: balanceAgg[0]?.total ?? 0,
        totalReceived:  receivedByType.reduce((sum, r) => sum + r.quantity, 0),
        receivedByType,
        totalIssued:    issuedByType.reduce((sum, r) => sum + r.quantity, 0),
        issuedByType,
      }),
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to fetch warehouse stock breakdown',
    }
  }
}
