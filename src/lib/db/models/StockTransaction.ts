import { Schema, model, models, type Model, type Types } from 'mongoose'
import { StockTransactionType } from '@/types/enums'

export interface IStockTransactionItem {
  productId:    Types.ObjectId
  batchNumber?: string
  quantity:     number
  unitPrice?:   number
  totalPrice?:  number
  notes?:       string
}

export interface IStockTransaction {
  _id:                 Types.ObjectId
  transactionNo:       string
  type:                StockTransactionType
  sourceWarehouseId?:  Types.ObjectId
  targetWarehouseId?:  Types.ObjectId
  items:               IStockTransactionItem[]
  referenceNo?:        string
  enquiryId?:          Types.ObjectId
  distributorId?:      Types.ObjectId
  performedBy:         Types.ObjectId
  notes?:              string
  attachments?:        string[]
  createdAt:           Date
  updatedAt:           Date
}

export type StockTransactionDocument = IStockTransaction

const StockTransactionItemSchema = new Schema<IStockTransactionItem>(
  {
    productId: {
      type:     Schema.Types.ObjectId,
      ref:      'Product',
      required: [true, 'Product is required'],
    },
    batchNumber: {
      type:      String,
      trim:      true,
      uppercase: true,
    },
    quantity: {
      type:     Number,
      required: [true, 'Quantity is required'],
      min:      [0.001, 'Quantity must be greater than 0'],
    },
    unitPrice: {
      type: Number,
      min:  [0, 'Unit price cannot be negative'],
    },
    totalPrice: {
      type: Number,
      min:  [0, 'Total price cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
)

const StockTransactionSchema = new Schema<StockTransactionDocument>(
  {
    transactionNo: {
      type:      String,
      required:  [true, 'Transaction number is required'],
      unique:    true,
      uppercase: true,
      trim:      true,
    },
    type: {
      type:     String,
      required: [true, 'Transaction type is required'],
      enum:     Object.values(StockTransactionType),
      index:    true,
    },
    sourceWarehouseId: {
      type:  Schema.Types.ObjectId,
      ref:   'Warehouse',
      index: true,
    },
    targetWarehouseId: {
      type:  Schema.Types.ObjectId,
      ref:   'Warehouse',
      index: true,
    },
    items: {
      type:     [StockTransactionItemSchema],
      required: [true, 'At least one item is required'],
      validate: [
        (val: IStockTransactionItem[]) => val.length > 0,
        'Stock transaction must have at least one item',
      ],
    },
    referenceNo: {
      type:  String,
      trim:  true,
      index: true,
    },
    enquiryId: {
      type:  Schema.Types.ObjectId,
      ref:   'Enquiry',
      index: true,
    },
    distributorId: {
      type:  Schema.Types.ObjectId,
      ref:   'Distributor',
      index: true,
    },
    performedBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Operator user is required'],
      index:    true,
    },
    notes: {
      type:      String,
      trim:      true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    attachments: {
      type:    [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

StockTransactionSchema.index({ transactionNo: 1 }, { unique: true })
StockTransactionSchema.index({ createdAt: -1 })
StockTransactionSchema.index({ 'items.productId': 1, createdAt: -1 })

StockTransactionSchema.virtual('performer', {
  ref:          'User',
  localField:   'performedBy',
  foreignField: '_id',
  justOne:      true,
})

StockTransactionSchema.virtual('sourceWarehouse', {
  ref:          'Warehouse',
  localField:   'sourceWarehouseId',
  foreignField: '_id',
  justOne:      true,
})

StockTransactionSchema.virtual('targetWarehouse', {
  ref:          'Warehouse',
  localField:   'targetWarehouseId',
  foreignField: '_id',
  justOne:      true,
})

const StockTransaction: Model<StockTransactionDocument> =
  models.StockTransaction ?? model<StockTransactionDocument>('StockTransaction', StockTransactionSchema)

export default StockTransaction
