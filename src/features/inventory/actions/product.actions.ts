'use server'

import { revalidateTag } from 'next/cache'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/connection'
import Product from '@/lib/db/models/Product'
import StockLevel from '@/lib/db/models/StockLevel'
import StockBatch from '@/lib/db/models/StockBatch'
import ActivityLog from '@/lib/db/models/ActivityLog'
import { requirePermission, authErrorToResult } from '@/lib/auth/session'
import { CACHE_TAGS } from '@/lib/cache'
import { ActivityAction, EntityType } from '@/types/enums'
import { ProductInputSchema, ProductFilterSchema, type ProductInput } from '../validations/inventory.validation'
import type { ActionResult, PaginatedResult } from '@/types/api'

function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

export interface ProductRow {
  _id:                   string
  sku:                   string
  name:                  string
  description?:          string
  category:              string
  subCategory?:          string
  uom:                   string
  hsnCode?:              string
  taxRate:               number
  costPrice:             number
  sellingPrice:          number
  minStockLevel:         number
  reorderQuantity:       number
  requiresBatchTracking: boolean
  images:                string[]
  isActive:              boolean
  totalOnHand:           number
  totalAllocated:        number
  totalAvailable:        number
  isLowStock:            boolean
  createdAt:             string
}

export interface ProductDetail extends ProductRow {
  stockByWarehouse: Array<{
    warehouseId:        string
    warehouseName:      string
    warehouseCode:      string
    quantityOnHand:     number
    quantityAllocated:  number
    quantityAvailable:  number
    lastRestockedAt?:   string
  }>
  batches: Array<{
    _id:                string
    warehouseId:        string
    warehouseName:      string
    batchNumber:        string
    manufacturingDate?: string
    expiryDate?:        string
    quantity:           number
    isExpired:          boolean
    isNearExpiry:       boolean
  }>
}

// ─── Query Products ───────────────────────────────────────────────────────────

export async function getProductsAction(
  rawFilter: Record<string, unknown> = {}
): Promise<ActionResult<PaginatedResult<ProductRow>>> {
  try {
    await requirePermission('inventory:read')
    await dbConnect()

    const parsed = ProductFilterSchema.safeParse(rawFilter)
    const { search, category, warehouseId, lowStockOnly, page, limit } = parsed.success
      ? parsed.data
      : { page: 1, limit: 20, search: undefined, category: undefined, warehouseId: undefined, lowStockOnly: undefined }

    const query: mongoose.FilterQuery<typeof Product> = {}

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i')
      query.$or = [{ name: regex }, { sku: regex }, { description: regex }, { category: regex }]
    }

    if (category && category.trim()) {
      query.category = category.trim()
    }

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ])

    const productIds = products.map(p => p._id)

    // Aggregate stock levels for these products
    const stockMatch: mongoose.FilterQuery<typeof StockLevel> = { productId: { $in: productIds } }
    if (warehouseId) {
      stockMatch.warehouseId = new mongoose.Types.ObjectId(warehouseId)
    }

    const stockAgg = await StockLevel.aggregate([
      { $match: stockMatch },
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

    let rows: ProductRow[] = products.map(p => {
      const s = stockMap.get(String(p._id)) || { onHand: 0, allocated: 0 }
      const totalOnHand    = s.onHand
      const totalAllocated = s.allocated
      const totalAvailable = Math.max(0, totalOnHand - totalAllocated)
      const minStockLevel  = p.minStockLevel || 0

      return {
        _id:                   String(p._id),
        sku:                   p.sku,
        name:                  p.name,
        description:          p.description,
        category:              p.category,
        subCategory:          p.subCategory,
        uom:                   p.uom,
        hsnCode:              p.hsnCode,
        taxRate:               p.taxRate || 0,
        costPrice:             p.costPrice || 0,
        sellingPrice:          p.sellingPrice || 0,
        minStockLevel,
        reorderQuantity:       p.reorderQuantity || 50,
        requiresBatchTracking: p.requiresBatchTracking ?? true,
        images:                p.images || [],
        isActive:              p.isActive ?? true,
        totalOnHand,
        totalAllocated,
        totalAvailable,
        isLowStock:            totalOnHand <= minStockLevel,
        createdAt:             p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      }
    })

    if (lowStockOnly) {
      rows = rows.filter(r => r.isLowStock)
    }

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
      error: err instanceof Error ? err.message : 'Failed to fetch products',
    }
  }
}

// ─── Get Single Product Details ───────────────────────────────────────────────

export async function getProductByIdAction(id: string): Promise<ActionResult<ProductDetail>> {
  try {
    await requirePermission('inventory:read')
    await dbConnect()

    const p = await Product.findById(id).lean()
    if (!p) {
      return { ok: false, error: 'Product not found' }
    }

    // Fetch warehouse stock levels
    const stockLevels = await StockLevel.find({ productId: p._id })
      .populate('warehouseId', 'name code')
      .lean()

    const stockByWarehouse = stockLevels.map(sl => {
      const wh = sl.warehouseId as unknown as { _id?: unknown; name?: string; code?: string } | null
      const onHand    = sl.quantityOnHand || 0
      const allocated = sl.quantityAllocated || 0
      return {
        warehouseId:       wh?._id ? String(wh._id) : String(sl.warehouseId),
        warehouseName:     wh?.name || 'Unknown Warehouse',
        warehouseCode:     wh?.code || '',
        quantityOnHand:    onHand,
        quantityAllocated: allocated,
        quantityAvailable: Math.max(0, onHand - allocated),
        lastRestockedAt:   sl.lastRestockedAt ? sl.lastRestockedAt.toISOString() : undefined,
      }
    })

    // Fetch batches
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)

    const batchesDoc = await StockBatch.find({ productId: p._id, quantity: { $gt: 0 } })
      .populate('warehouseId', 'name')
      .sort({ expiryDate: 1 })
      .lean()

    const batches = batchesDoc.map(b => {
      const wh = b.warehouseId as unknown as { _id?: unknown; name?: string } | null
      const expiry = b.expiryDate ? new Date(b.expiryDate) : null
      return {
        _id:                String(b._id),
        warehouseId:        wh?._id ? String(wh._id) : String(b.warehouseId),
        warehouseName:      wh?.name || 'Unknown Warehouse',
        batchNumber:        b.batchNumber,
        manufacturingDate:  b.manufacturingDate ? b.manufacturingDate.toISOString() : undefined,
        expiryDate:         expiry ? expiry.toISOString() : undefined,
        quantity:           b.quantity,
        isExpired:          expiry ? expiry < now : false,
        isNearExpiry:       expiry ? expiry >= now && expiry <= thirtyDaysFromNow : false,
      }
    })

    const totalOnHand    = stockByWarehouse.reduce((sum, w) => sum + w.quantityOnHand, 0)
    const totalAllocated = stockByWarehouse.reduce((sum, w) => sum + w.quantityAllocated, 0)
    const minStockLevel  = p.minStockLevel || 0

    const detail: ProductDetail = {
      _id:                   String(p._id),
      sku:                   p.sku,
      name:                  p.name,
      description:          p.description,
      category:              p.category,
      subCategory:          p.subCategory,
      uom:                   p.uom,
      hsnCode:              p.hsnCode,
      taxRate:               p.taxRate || 0,
      costPrice:             p.costPrice || 0,
      sellingPrice:          p.sellingPrice || 0,
      minStockLevel,
      reorderQuantity:       p.reorderQuantity || 50,
      requiresBatchTracking: p.requiresBatchTracking ?? true,
      images:                p.images || [],
      isActive:              p.isActive ?? true,
      totalOnHand,
      totalAllocated,
      totalAvailable:        Math.max(0, totalOnHand - totalAllocated),
      isLowStock:            totalOnHand <= minStockLevel,
      createdAt:             p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      stockByWarehouse,
      batches,
    }

    return { ok: true, data: toPlain(detail) }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to fetch product details',
    }
  }
}

// ─── Create Product ───────────────────────────────────────────────────────────

export async function createProductAction(
  data: ProductInput
): Promise<ActionResult<ProductRow>> {
  try {
    const session = await requirePermission('inventory:create')
    await dbConnect()

    const parsed = ProductInputSchema.safeParse(data)
    if (!parsed.success) {
      return {
        ok:          false,
        error:       parsed.error.errors[0]?.message || 'Invalid product data',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const payload = parsed.data

    const existingSku = await Product.findOne({ sku: payload.sku })
    if (existingSku) {
      return { ok: false, error: `Product with SKU "${payload.sku}" already exists` }
    }

    const created = await Product.create({
      ...payload,
      isActive: payload.isActive ?? true,
    })

    // Activity Log
    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.ProductCreated,
      entityType: EntityType.Product,
      entityId:   created._id,
      changes: {
        before: {},
        after:  { sku: created.sku, name: created.name, category: created.category },
      },
      metadata: { sku: created.sku, name: created.name },
    })

    revalidateTag(CACHE_TAGS.products)
    revalidateTag(CACHE_TAGS.inventory)

    return {
      ok: true,
      data: {
        _id:                   String(created._id),
        sku:                   created.sku,
        name:                  created.name,
        description:          created.description,
        category:              created.category,
        subCategory:          created.subCategory,
        uom:                   created.uom,
        hsnCode:              created.hsnCode,
        taxRate:               created.taxRate || 0,
        costPrice:             created.costPrice || 0,
        sellingPrice:          created.sellingPrice,
        minStockLevel:         created.minStockLevel || 0,
        reorderQuantity:       created.reorderQuantity || 50,
        requiresBatchTracking: created.requiresBatchTracking,
        images:                created.images || [],
        isActive:              created.isActive,
        totalOnHand:           0,
        totalAllocated:        0,
        totalAvailable:        0,
        isLowStock:            true,
        createdAt:             created.createdAt.toISOString(),
      },
    }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to create product',
    }
  }
}

// ─── Update Product ───────────────────────────────────────────────────────────

export async function updateProductAction(
  id: string,
  data: Partial<ProductInput>
): Promise<ActionResult<ProductRow>> {
  try {
    const session = await requirePermission('inventory:update')
    await dbConnect()

    const product = await Product.findById(id)
    if (!product) {
      return { ok: false, error: 'Product not found' }
    }

    if (data.sku && data.sku !== product.sku) {
      const duplicate = await Product.findOne({ sku: data.sku, _id: { $ne: id } })
      if (duplicate) {
        return { ok: false, error: `SKU "${data.sku}" is already used by another product` }
      }
    }

    const before = product.toObject()

    Object.assign(product, data)
    await product.save()

    // Activity Log
    await ActivityLog.create({
      actorId:    session.user.id,
      actorRole:  session.user.role,
      action:     ActivityAction.ProductUpdated,
      entityType: EntityType.Product,
      entityId:   product._id,
      changes: {
        before: { name: before.name, sellingPrice: before.sellingPrice },
        after:  { name: product.name, sellingPrice: product.sellingPrice },
      },
      metadata: { sku: product.sku, name: product.name },
    })

    revalidateTag(CACHE_TAGS.products)
    revalidateTag(CACHE_TAGS.inventory)

    return getProductByIdAction(id)
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to update product',
    }
  }
}

// ─── Toggle Product Active ───────────────────────────────────────────────────

export async function toggleProductStatusAction(id: string): Promise<ActionResult<{ isActive: boolean }>> {
  try {
    await requirePermission('inventory:update')
    await dbConnect()

    const product = await Product.findById(id)
    if (!product) {
      return { ok: false, error: 'Product not found' }
    }

    product.isActive = !product.isActive
    await product.save()

    revalidateTag(CACHE_TAGS.products)
    revalidateTag(CACHE_TAGS.inventory)

    return { ok: true, data: { isActive: product.isActive } }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to toggle product status',
    }
  }
}

// ─── Get Distinct Categories ──────────────────────────────────────────────────

export async function getProductCategoriesAction(): Promise<ActionResult<string[]>> {
  try {
    await requirePermission('inventory:read')
    await dbConnect()

    const categories = await Product.distinct('category')
    return { ok: true, data: categories.filter(Boolean) }
  } catch (err) {
    const authErr = authErrorToResult(err)
    if (authErr) return authErr
    return {
      ok:    false,
      error: err instanceof Error ? err.message : 'Failed to fetch categories',
    }
  }
}
