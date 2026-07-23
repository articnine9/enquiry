import { Schema, model, models, type Model, type Types } from 'mongoose'
import { VisitType } from '@/types/enums'

// ─── FieldVisit ───────────────────────────────────────────────────────────────
// A logged in-person visit by a staff member — poultry farm / hotel /
// restaurant prospect visits, or channel visits to a Dealer/Distributor.
// Distributors/Dealers have no login of their own (see Distributor.ts), so
// visits are always recorded by the staff member who made them, optionally
// tagged with which dealer/distributor/enquiry the visit relates to.

export interface IFieldVisit {
  _id:           Types.ObjectId
  staffId:       Types.ObjectId          // ref User — who logged the visit
  visitDate:     Date
  visitType:     VisitType
  customerName:  string
  notes?:        string
  enquiryId?:    Types.ObjectId | null   // ref Enquiry, optional
  distributorId?: Types.ObjectId | null  // ref Distributor, optional
  dealerId?:     Types.ObjectId | null   // ref Dealer, optional
  gpsLat?:       number | null
  gpsLng?:       number | null
  photoUrl?:     string | null
  createdAt:     Date
  updatedAt:     Date
}

export type FieldVisitDocument = IFieldVisit

const FieldVisitSchema = new Schema<FieldVisitDocument>(
  {
    staffId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Staff is required'],
    },
    visitDate: {
      type:     Date,
      required: [true, 'Visit date is required'],
    },
    visitType: {
      type:     String,
      enum:     Object.values(VisitType),
      required: [true, 'Visit type is required'],
    },
    customerName: {
      type:      String,
      required:  [true, 'Customer name is required'],
      trim:      true,
      maxlength: [150, 'Customer name cannot exceed 150 characters'],
    },
    notes: {
      type:      String,
      trim:      true,
      maxlength: [3000, 'Notes cannot exceed 3000 characters'],
    },
    enquiryId: {
      type:    Schema.Types.ObjectId,
      ref:     'Enquiry',
      default: null,
    },
    distributorId: {
      type:    Schema.Types.ObjectId,
      ref:     'Distributor',
      default: null,
    },
    dealerId: {
      type:    Schema.Types.ObjectId,
      ref:     'Dealer',
      default: null,
    },
    gpsLat: { type: Number, min: -90,  max: 90,  default: null },
    gpsLng: { type: Number, min: -180, max: 180, default: null },
    photoUrl: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

FieldVisitSchema.index({ staffId: 1, visitDate: -1 })
FieldVisitSchema.index({ visitType: 1, visitDate: -1 })
FieldVisitSchema.index({ distributorId: 1, visitDate: -1 })
FieldVisitSchema.index({ dealerId: 1, visitDate: -1 })
FieldVisitSchema.index({ enquiryId: 1 })

// ─── Model ────────────────────────────────────────────────────────────────────

const FieldVisit: Model<FieldVisitDocument> =
  models.FieldVisit ?? model<FieldVisitDocument>('FieldVisit', FieldVisitSchema)

export default FieldVisit
