import { Schema, model, models, type Model, type Types } from 'mongoose'

// ─── Dealer ───────────────────────────────────────────────────────────────────
// Service point under a Distributor. Every dealer belongs to exactly one
// distributor; its service locations must be a subset of that distributor's
// assigned districts (enforced at the action layer, not here — it needs a
// cross-collection lookup a schema validator can't reach).

export interface IDealerServiceLocation {
  district: string
  city?:    string
}

export interface IDealer {
  _id:               Types.ObjectId
  name:              string
  distributorId:     Types.ObjectId   // ref Distributor, required
  contactName:       string
  contactPhone:      string
  contactEmail?:     string
  address?:          string
  serviceLocations:  IDealerServiceLocation[]
  isActive:          boolean
  createdAt:         Date
  updatedAt:         Date
}

export type DealerDocument = IDealer

const ServiceLocationSchema = new Schema<IDealerServiceLocation>(
  {
    district: { type: String, required: true, trim: true },
    city:     { type: String, trim: true },
  },
  { _id: false }
)

const DealerSchema = new Schema<DealerDocument>(
  {
    name: {
      type:      String,
      required:  [true, 'Dealer name is required'],
      trim:      true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    distributorId: {
      type:     Schema.Types.ObjectId,
      ref:      'Distributor',
      required: [true, 'Distributor is required'],
    },
    contactName: {
      type:      String,
      required:  [true, 'Contact name is required'],
      trim:      true,
      maxlength: [150, 'Contact name cannot exceed 150 characters'],
    },
    contactPhone: {
      type:     String,
      required: [true, 'Contact phone is required'],
      trim:     true,
      match:    [/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format'],
    },
    contactEmail: {
      type:      String,
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    address: {
      type:      String,
      trim:      true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    serviceLocations: {
      type:    [ServiceLocationSchema],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

DealerSchema.index({ distributorId: 1, isActive: 1 })
DealerSchema.index({ 'serviceLocations.district': 1 })
DealerSchema.index({ 'serviceLocations.district': 1, 'serviceLocations.city': 1 })

// ─── Virtuals ─────────────────────────────────────────────────────────────────

DealerSchema.virtual('distributor', {
  ref:          'Distributor',
  localField:   'distributorId',
  foreignField: '_id',
  justOne:      true,
})

// ─── Model ────────────────────────────────────────────────────────────────────

const Dealer: Model<DealerDocument> =
  models.Dealer ?? model<DealerDocument>('Dealer', DealerSchema)

export default Dealer
