import { Schema, model, models, type Model, type Types } from 'mongoose'
import { WarehouseType } from '@/types/enums'

export interface IWarehouse {
  _id:             Types.ObjectId
  code:            string
  name:            string
  type:            WarehouseType
  locationZoneId?: Types.ObjectId
  address?: {
    line1?:   string
    city?:    string
    district?: string
    state?:   string
    pincode?: string
  }
  managerId?:      Types.ObjectId
  contactPhone?:   string
  isActive:        boolean
  createdAt:       Date
  updatedAt:       Date
}

export type WarehouseDocument = IWarehouse

const WarehouseSchema = new Schema<WarehouseDocument>(
  {
    code: {
      type:      String,
      required:  [true, 'Warehouse code is required'],
      unique:    true,
      uppercase: true,
      trim:      true,
      match:     [/^[A-Z0-9_-]{2,30}$/, 'Code must be 2–30 uppercase alphanumeric characters'],
    },
    name: {
      type:      String,
      required:  [true, 'Warehouse name is required'],
      trim:      true,
      maxlength: [150, 'Warehouse name cannot exceed 150 characters'],
    },
    type: {
      type:     String,
      required: [true, 'Warehouse type is required'],
      enum:     Object.values(WarehouseType),
      default:  WarehouseType.RegionalHub,
    },
    locationZoneId: {
      type:  Schema.Types.ObjectId,
      ref:   'LocationZone',
      index: true,
    },
    address: {
      line1:    { type: String, trim: true },
      city:     { type: String, trim: true },
      district: { type: String, trim: true },
      state:    { type: String, trim: true },
      pincode:  { type: String, trim: true },
    },
    managerId: {
      type:  Schema.Types.ObjectId,
      ref:   'User',
      index: true,
    },
    contactPhone: {
      type: String,
      trim: true,
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

WarehouseSchema.index({ code: 1 }, { unique: true })
WarehouseSchema.index({ isActive: 1, name: 1 })

WarehouseSchema.virtual('manager', {
  ref:          'User',
  localField:   'managerId',
  foreignField: '_id',
  justOne:      true,
})

WarehouseSchema.virtual('locationZone', {
  ref:          'LocationZone',
  localField:   'locationZoneId',
  foreignField: '_id',
  justOne:      true,
})

const Warehouse: Model<WarehouseDocument> =
  models.Warehouse ?? model<WarehouseDocument>('Warehouse', WarehouseSchema)

export default Warehouse
