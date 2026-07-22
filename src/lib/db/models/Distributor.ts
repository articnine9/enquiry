import { Schema, model, models, type Model, type Types } from 'mongoose'

// ─── Distributor ──────────────────────────────────────────────────────────────
// Territory-level channel partner. Owns a set of districts; Dealers are a
// reverse relationship (Dealer.distributorId), never stored here directly —
// same reasoning as LocationZone never storing its staff list.

export interface IDistributor {
  _id:              Types.ObjectId
  name:             string
  code:             string          // short reference code, e.g. 'CBE-01'
  territory:        string          // display label, e.g. 'Coimbatore Region'
  contactName:      string
  contactPhone:     string
  contactEmail?:    string
  address?:         string
  assignedDistricts: string[]       // from the South India district dataset
  isActive:         boolean
  createdAt:        Date
  updatedAt:        Date
}

export type DistributorDocument = IDistributor

const DistributorSchema = new Schema<DistributorDocument>(
  {
    name: {
      type:      String,
      required:  [true, 'Distributor name is required'],
      trim:      true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    code: {
      type:      String,
      required:  [true, 'Code is required'],
      unique:    true,
      uppercase: true,
      trim:      true,
      match:     [/^[A-Z0-9_-]{2,30}$/, 'Code must be 2–30 uppercase alphanumeric characters'],
    },
    territory: {
      type:      String,
      required:  [true, 'Territory is required'],
      trim:      true,
      maxlength: [150, 'Territory cannot exceed 150 characters'],
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
    assignedDistricts: {
      type:    [String],
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

DistributorSchema.index({ code: 1 }, { unique: true })
DistributorSchema.index({ assignedDistricts: 1 })
DistributorSchema.index({ isActive: 1, name: 1 })

// ─── Virtuals ─────────────────────────────────────────────────────────────────

DistributorSchema.virtual('dealers', {
  ref:          'Dealer',
  localField:   '_id',
  foreignField: 'distributorId',
})

// ─── Model ────────────────────────────────────────────────────────────────────

const Distributor: Model<DistributorDocument> =
  models.Distributor ?? model<DistributorDocument>('Distributor', DistributorSchema)

export default Distributor
