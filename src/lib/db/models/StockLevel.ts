import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface IStockLevel {
  _id:                Types.ObjectId
  productId:          Types.ObjectId
  warehouseId:        Types.ObjectId
  quantityOnHand:     number
  quantityAllocated:  number
  quantityAvailable?: number // virtual
  lastRestockedAt?:   Date
  lastAuditAt?:       Date
  createdAt:          Date
  updatedAt:          Date
}

export type StockLevelDocument = IStockLevel

const StockLevelSchema = new Schema<StockLevelDocument>(
  {
    productId: {
      type:     Schema.Types.ObjectId,
      ref:      'Product',
      required: [true, 'Product is required'],
      index:    true,
    },
    warehouseId: {
      type:     Schema.Types.ObjectId,
      ref:      'Warehouse',
      required: [true, 'Warehouse is required'],
      index:    true,
    },
    quantityOnHand: {
      type:    Number,
      default: 0,
      min:     [0, 'Quantity on hand cannot be negative'],
    },
    quantityAllocated: {
      type:    Number,
      default: 0,
      min:     [0, 'Allocated quantity cannot be negative'],
    },
    lastRestockedAt: {
      type: Date,
    },
    lastAuditAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// Compound index: Unique stock level per product per warehouse
StockLevelSchema.index({ productId: 1, warehouseId: 1 }, { unique: true })

StockLevelSchema.virtual('quantityAvailable').get(function () {
  return Math.max(0, (this.quantityOnHand || 0) - (this.quantityAllocated || 0))
})

StockLevelSchema.virtual('product', {
  ref:          'Product',
  localField:   'productId',
  foreignField: '_id',
  justOne:      true,
})

StockLevelSchema.virtual('warehouse', {
  ref:          'Warehouse',
  localField:   'warehouseId',
  foreignField: '_id',
  justOne:      true,
})

const StockLevel: Model<StockLevelDocument> =
  models.StockLevel ?? model<StockLevelDocument>('StockLevel', StockLevelSchema)

export default StockLevel
