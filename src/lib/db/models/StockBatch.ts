import { Schema, model, models, type Model, type Types } from 'mongoose'

export interface IStockBatch {
  _id:               Types.ObjectId
  productId:         Types.ObjectId
  warehouseId:       Types.ObjectId
  batchNumber:       string
  manufacturingDate?: Date
  expiryDate?:       Date
  quantity:          number
  costPrice?:        number
  isActive:          boolean
  createdAt:         Date
  updatedAt:         Date
}

export type StockBatchDocument = IStockBatch

const StockBatchSchema = new Schema<StockBatchDocument>(
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
    batchNumber: {
      type:      String,
      required:  [true, 'Batch number is required'],
      trim:      true,
      uppercase: true,
      maxlength: [50, 'Batch number cannot exceed 50 characters'],
    },
    manufacturingDate: {
      type: Date,
    },
    expiryDate: {
      type:  Date,
      index: true,
    },
    quantity: {
      type:    Number,
      default: 0,
      min:     [0, 'Batch quantity cannot be negative'],
    },
    costPrice: {
      type: Number,
      min:  [0, 'Cost price cannot be negative'],
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// Index: Unique batch number per product in a warehouse
StockBatchSchema.index({ productId: 1, warehouseId: 1, batchNumber: 1 }, { unique: true })
StockBatchSchema.index({ expiryDate: 1, quantity: 1 })

StockBatchSchema.virtual('product', {
  ref:          'Product',
  localField:   'productId',
  foreignField: '_id',
  justOne:      true,
})

StockBatchSchema.virtual('warehouse', {
  ref:          'Warehouse',
  localField:   'warehouseId',
  foreignField: '_id',
  justOne:      true,
})

const StockBatch: Model<StockBatchDocument> =
  models.StockBatch ?? model<StockBatchDocument>('StockBatch', StockBatchSchema)

export default StockBatch
