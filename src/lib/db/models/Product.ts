import { Schema, model, models, type Model, type Types } from 'mongoose'
import { ProductUOM } from '@/types/enums'

export interface IProduct {
  _id:                   Types.ObjectId
  sku:                   string
  name:                  string
  description?:          string
  category:              string
  subCategory?:          string
  uom:                   ProductUOM
  hsnCode?:              string
  taxRate:               number          // GST / VAT rate in percent, e.g. 5, 12, 18
  costPrice:             number          // Base purchase / cost price
  sellingPrice:          number          // Base selling / MRP price
  minStockLevel:         number          // Reorder point alert trigger
  reorderQuantity?:      number          // Default reorder batch quantity
  requiresBatchTracking: boolean         // Whether inward/outward requires batch & expiry
  images?:               string[]
  isActive:              boolean
  createdAt:             Date
  updatedAt:             Date
}

export type ProductDocument = IProduct

const ProductSchema = new Schema<ProductDocument>(
  {
    sku: {
      type:      String,
      required:  [true, 'SKU is required'],
      unique:    true,
      uppercase: true,
      trim:      true,
      match:     [/^[A-Z0-9_-]{2,40}$/, 'SKU must be 2–40 alphanumeric characters, hyphens, or underscores'],
    },
    name: {
      type:      String,
      required:  [true, 'Product name is required'],
      trim:      true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    description: {
      type:      String,
      trim:      true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type:     String,
      required: [true, 'Category is required'],
      trim:     true,
      index:    true,
    },
    subCategory: {
      type:  String,
      trim:  true,
      index: true,
    },
    uom: {
      type:     String,
      required: [true, 'Unit of measure is required'],
      enum:     Object.values(ProductUOM),
      default:  ProductUOM.Units,
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    taxRate: {
      type:    Number,
      default: 0,
      min:     [0, 'Tax rate cannot be negative'],
      max:     [100, 'Tax rate cannot exceed 100%'],
    },
    costPrice: {
      type:    Number,
      default: 0,
      min:     [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type:     Number,
      required: [true, 'Selling price is required'],
      min:      [0, 'Selling price cannot be negative'],
    },
    minStockLevel: {
      type:    Number,
      default: 10,
      min:     [0, 'Minimum stock level cannot be negative'],
    },
    reorderQuantity: {
      type:    Number,
      default: 50,
      min:     [0, 'Reorder quantity cannot be negative'],
    },
    requiresBatchTracking: {
      type:    Boolean,
      default: true,
    },
    images: {
      type:    [String],
      default: [],
    },
    isActive: {
      type:    Boolean,
      default: true,
      index:   true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────
ProductSchema.index({ sku: 1 }, { unique: true })
ProductSchema.index({ name: 'text', description: 'text', sku: 'text' })
ProductSchema.index({ category: 1, isActive: 1 })

// ─── Virtuals ─────────────────────────────────────────────────────────────────
ProductSchema.virtual('stockLevels', {
  ref:          'StockLevel',
  localField:   '_id',
  foreignField: 'productId',
})

ProductSchema.virtual('batches', {
  ref:          'StockBatch',
  localField:   '_id',
  foreignField: 'productId',
})

const Product: Model<ProductDocument> =
  models.Product ?? model<ProductDocument>('Product', ProductSchema)

export default Product
