import { z } from 'zod'
import { ProductUOM, WarehouseType, StockTransactionType } from '@/types/enums'

// ─── Product Validation ───────────────────────────────────────────────────────

export const ProductInputSchema = z.object({
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .toUpperCase()
    .min(2, 'SKU must be at least 2 characters')
    .max(40, 'SKU cannot exceed 40 characters')
    .regex(/^[A-Z0-9_-]+$/, 'SKU must contain only letters, numbers, hyphens, and underscores'),
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name cannot exceed 200 characters'),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category is required'),
  subCategory: z.string().trim().optional().or(z.literal('')),
  uom: z.nativeEnum(ProductUOM, { required_error: 'Unit of measure is required' }),
  hsnCode: z.string().trim().optional().or(z.literal('')),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').max(100, 'Max tax rate is 100%').default(0),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative').default(0),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
  minStockLevel: z.coerce.number().min(0, 'Minimum stock level cannot be negative').default(10),
  reorderQuantity: z.coerce.number().min(0, 'Reorder quantity cannot be negative').default(50),
  requiresBatchTracking: z.coerce.boolean().default(true),
  images: z.array(z.string()).default([]),
  isActive: z.coerce.boolean().default(true),
})

export type ProductInput = z.infer<typeof ProductInputSchema>

export const ProductFilterSchema = z.object({
  search:      z.string().optional(),
  category:    z.string().optional(),
  warehouseId: z.string().optional(),
  lowStockOnly: z.coerce.boolean().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
})

export type ProductFilter = z.infer<typeof ProductFilterSchema>

// ─── Warehouse Validation ─────────────────────────────────────────────────────

export const WarehouseInputSchema = z.object({
  code: z
    .string({ required_error: 'Code is required' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{2,30}$/, 'Code must be 2–30 uppercase alphanumeric characters'),
  name: z.string({ required_error: 'Warehouse name is required' }).trim().min(2).max(150),
  type: z.nativeEnum(WarehouseType).default(WarehouseType.RegionalHub),
  locationZoneId: z.string().optional().or(z.literal('')),
  address: z
    .object({
      line1:    z.string().trim().optional().or(z.literal('')),
      city:     z.string().trim().optional().or(z.literal('')),
      district: z.string().trim().optional().or(z.literal('')),
      state:    z.string().trim().optional().or(z.literal('')),
      pincode:  z.string().trim().optional().or(z.literal('')),
    })
    .optional(),
  managerId:    z.string().optional().or(z.literal('')),
  contactPhone: z.string().trim().optional().or(z.literal('')),
  isActive:     z.coerce.boolean().default(true),
})

export type WarehouseInput = z.infer<typeof WarehouseInputSchema>

// ─── Stock Transactions Validation ────────────────────────────────────────────

const TransactionItemInputSchema = z.object({
  productId:         z.string({ required_error: 'Product is required' }).min(1),
  batchNumber:       z.string().trim().toUpperCase().optional().or(z.literal('')),
  manufacturingDate: z.string().optional().or(z.literal('')),
  expiryDate:        z.string().optional().or(z.literal('')),
  quantity:          z.coerce.number().positive('Quantity must be greater than 0'),
  unitPrice:         z.coerce.number().min(0).optional(),
  totalPrice:        z.coerce.number().min(0).optional(),
  notes:             z.string().trim().optional().or(z.literal('')),
})

export type TransactionItemInput = z.infer<typeof TransactionItemInputSchema>

// 1. Goods Receipt / Purchase Inward
export const StockInwardInputSchema = z.object({
  targetWarehouseId: z.string({ required_error: 'Target warehouse is required' }).min(1),
  referenceNo:       z.string().trim().optional().or(z.literal('')),
  items:             z.array(TransactionItemInputSchema).min(1, 'At least one item is required'),
  notes:             z.string().trim().max(1000).optional().or(z.literal('')),
})

export type StockInwardInput = z.infer<typeof StockInwardInputSchema>

// 2. Sales / Sample Outward
export const StockOutwardInputSchema = z.object({
  type:              z.enum([StockTransactionType.OutwardDispatch, StockTransactionType.OutwardSample]),
  sourceWarehouseId: z.string({ required_error: 'Source warehouse is required' }).min(1),
  referenceNo:       z.string().trim().optional().or(z.literal('')),
  enquiryId:         z.string().optional().or(z.literal('')),
  distributorId:     z.string().optional().or(z.literal('')),
  items:             z.array(TransactionItemInputSchema).min(1, 'At least one item is required'),
  notes:             z.string().trim().max(1000).optional().or(z.literal('')),
})

export type StockOutwardInput = z.infer<typeof StockOutwardInputSchema>

// 3. Stock Transfer between warehouses
export const StockTransferInputSchema = z.object({
  sourceWarehouseId: z.string({ required_error: 'Source warehouse is required' }).min(1),
  targetWarehouseId: z.string({ required_error: 'Target warehouse is required' }).min(1),
  referenceNo:       z.string().trim().optional().or(z.literal('')),
  items:             z.array(TransactionItemInputSchema).min(1, 'At least one item is required'),
  notes:             z.string().trim().max(1000).optional().or(z.literal('')),
}).refine(data => data.sourceWarehouseId !== data.targetWarehouseId, {
  message: 'Source and target warehouses must be different',
  path: ['targetWarehouseId'],
})

export type StockTransferInput = z.infer<typeof StockTransferInputSchema>

// 4. Stock Adjustment
export const StockAdjustmentInputSchema = z.object({
  type:              z.enum([StockTransactionType.AdjustmentLoss, StockTransactionType.AdjustmentSurplus]),
  warehouseId:       z.string({ required_error: 'Warehouse is required' }).min(1),
  referenceNo:       z.string().trim().optional().or(z.literal('')),
  items:             z.array(TransactionItemInputSchema).min(1, 'At least one item is required'),
  reason:            z.string({ required_error: 'Reason is required' }).trim().min(3).max(1000),
})

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentInputSchema>

export const StockLedgerFilterSchema = z.object({
  productId:   z.string().optional(),
  warehouseId: z.string().optional(),
  type:        z.string().optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
})

export type StockLedgerFilter = z.infer<typeof StockLedgerFilterSchema>
