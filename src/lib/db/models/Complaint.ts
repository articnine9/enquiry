import { Schema, model, models, type Model, type Types } from 'mongoose'
import { ComplaintType, ComplaintStatus } from '@/types/enums'

// ─── Complaint ────────────────────────────────────────────────────────────────
// Logged against a customer by name/phone (denormalized, like Enquiry) — not
// every complainant will already be a converted Customer record, so the link
// is optional and auto-resolved by phone at the action layer, not enforced
// here as a hard foreign key.

export interface IComplaint {
  _id:            Types.ObjectId
  customerId?:    Types.ObjectId | null   // ref Customer, auto-linked by phone
  customerName:   string
  phone:          string
  complaintType:  ComplaintType
  complaintDate:  Date
  status:         ComplaintStatus
  description:    string
  resolutionNotes?: string | null         // required once status reaches Resolved
  enquiryId?:     Types.ObjectId | null    // ref Enquiry, optional
  distributorId?: Types.ObjectId | null    // ref Distributor, optional
  dealerId?:      Types.ObjectId | null    // ref Dealer, optional
  assignedTo?:    Types.ObjectId | null    // ref User, optional
  resolvedAt?:    Date | null
  createdBy:      Types.ObjectId
  createdAt:      Date
  updatedAt:      Date
}

export type ComplaintDocument = IComplaint

const ComplaintSchema = new Schema<ComplaintDocument>(
  {
    customerId: {
      type:    Schema.Types.ObjectId,
      ref:      'Customer',
      default:  null,
    },
    customerName: {
      type:      String,
      required:  [true, 'Customer name is required'],
      trim:      true,
      maxlength: [150, 'Customer name cannot exceed 150 characters'],
    },
    phone: {
      type:     String,
      required: [true, 'Phone number is required'],
      trim:     true,
      match:    [/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format'],
    },
    complaintType: {
      type:     String,
      enum:     Object.values(ComplaintType),
      required: [true, 'Complaint type is required'],
    },
    complaintDate: {
      type:     Date,
      required: [true, 'Complaint date is required'],
    },
    status: {
      type:     String,
      enum:     Object.values(ComplaintStatus),
      default:  ComplaintStatus.Open,
    },
    description: {
      type:      String,
      required:  [true, 'Complaint details are required'],
      trim:      true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    resolutionNotes: {
      type:      String,
      trim:      true,
      maxlength: [3000, 'Resolution notes cannot exceed 3000 characters'],
      default:   null,
    },
    enquiryId:     { type: Schema.Types.ObjectId, ref: 'Enquiry',      default: null },
    distributorId: { type: Schema.Types.ObjectId, ref: 'Distributor',  default: null },
    dealerId:      { type: Schema.Types.ObjectId, ref: 'Dealer',       default: null },
    assignedTo:    { type: Schema.Types.ObjectId, ref: 'User',         default: null },
    resolvedAt:    { type: Date, default: null },
    createdBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Created-by reference is required'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

ComplaintSchema.index({ customerId: 1, createdAt: -1 })
ComplaintSchema.index({ phone: 1 })
ComplaintSchema.index({ status: 1, complaintDate: -1 })
ComplaintSchema.index({ complaintType: 1, complaintDate: -1 })
ComplaintSchema.index({ assignedTo: 1, status: 1 })
ComplaintSchema.index({ distributorId: 1 })
ComplaintSchema.index({ dealerId: 1 })

// ─── Model ────────────────────────────────────────────────────────────────────

const Complaint: Model<ComplaintDocument> =
  models.Complaint ?? model<ComplaintDocument>('Complaint', ComplaintSchema)

export default Complaint
