import { Schema, model, models, type Model, type Types } from 'mongoose'
import {
  EnquiryStatus,
  EnquiryPriority,
  EnquirySource,
  EnquiryCategory,
  EnquiryProduct,
} from '@/types/enums'

// ─── TypeScript interface ─────────────────────────────────────────────────────

export interface IEnquiry {
  _id:           Types.ObjectId
  enquiryNo:     string

  // Customer
  customerName:  string
  phone:         string
  email?:        string
  address:       string
  city:          string
  district:      string
  pincode:       string
  location:      string          // area / locality free-text

  // Enquiry meta
  enquirySource: string
  category:      string
  product:       string
  priority:      string
  priorityWeight: number
  status:        EnquiryStatus

  // Detail
  subject:       string
  description?:  string
  internalNotes?: string
  tags:          string[]
  attachments:   IAttachment[]

  // Assignment
  assignedTo?:   Types.ObjectId
  assignedBy?:   Types.ObjectId | 'system'
  assignedAt?:   Date

  // Timestamps
  resolvedAt?:   Date
  closedAt?:     Date
  createdBy:     Types.ObjectId
  createdAt:     Date
  updatedAt:     Date
}

export interface IAttachment {
  fileName:   string
  url:        string
  mimeType:   string
  sizeBytes:  number
  uploadedAt: Date
  uploadedBy: Types.ObjectId
}

// Mongoose document type (IEnquiry + Document methods)
export type EnquiryDocument = IEnquiry & {
  // Virtual getters added by schema
  isOpen:              boolean
  ageInDays:           number
  resolutionTimeHours: number | null
}

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const AttachmentSchema = new Schema<IAttachment>(
  {
    fileName:   { type: String, required: true, trim: true },
    url:        { type: String, required: true },
    mimeType:   { type: String, required: true },
    sizeBytes:  { type: Number, required: true, min: 0 },
    uploadedAt: { type: Date,   default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
)

// ─── Auto-incrementing enquiry number helper ──────────────────────────────────

async function generateEnquiryNo(): Promise<string> {
  const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } })
  const Counter = models.Counter ?? model('Counter', CounterSchema)
  const year    = new Date().getFullYear().toString().slice(-2)
  const counter = await Counter.findByIdAndUpdate(
    `enquiry_${year}`,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  )
  return `ENQ-${year}-${String(counter.seq).padStart(5, '0')}`
}

// ─── FSM: allowed status transitions ─────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<EnquiryStatus, EnquiryStatus[]> = {
  [EnquiryStatus.New]:        [EnquiryStatus.Assigned,   EnquiryStatus.Cancelled],
  [EnquiryStatus.Assigned]:   [EnquiryStatus.InProgress, EnquiryStatus.Cancelled],
  [EnquiryStatus.InProgress]: [EnquiryStatus.FollowUp,   EnquiryStatus.Resolved, EnquiryStatus.Cancelled],
  [EnquiryStatus.FollowUp]:   [EnquiryStatus.InProgress, EnquiryStatus.Resolved, EnquiryStatus.Cancelled],
  [EnquiryStatus.Resolved]:   [EnquiryStatus.Closed,     EnquiryStatus.InProgress],
  [EnquiryStatus.Closed]:     [],
  [EnquiryStatus.Cancelled]:  [],
}

// ─── Main schema ──────────────────────────────────────────────────────────────

const EnquirySchema = new Schema<EnquiryDocument>(
  {
    enquiryNo: {
      type:   String,
      unique: true,
      // auto-set in pre-save hook
    },

    // ── Customer fields ───────────────────────────────────────────────────────
    customerName: {
      type:      String,
      required:  [true, 'Customer name is required'],
      trim:      true,
      minlength: [2,   'Name must be at least 2 characters'],
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    phone: {
      type:     String,
      required: [true, 'Phone number is required'],
      trim:     true,
      match:    [/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format'],
    },
    email: {
      type:      String,
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
      default:   undefined,
    },
    address: {
      type:      String,
      required:  [true, 'Address is required'],
      trim:      true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    city: {
      type:      String,
      required:  [true, 'City is required'],
      trim:      true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    district: {
      type:      String,
      required:  [true, 'District is required'],
      trim:      true,
      maxlength: [100, 'District cannot exceed 100 characters'],
    },
    pincode: {
      type:     String,
      required: [true, 'Pincode is required'],
      trim:     true,
      match:    [/^\d{5,10}$/, 'Pincode must be 5–10 digits'],
    },
    location: {
      type:      String,
      required:  [true, 'Location / locality is required'],
      trim:      true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },

    // ── Enquiry meta ──────────────────────────────────────────────────────────
    // Source / category / product / priority are validated against the MasterData
    // collection at the action layer, so the schema keeps them as plain strings.
    enquirySource: {
      type:     String,
      required: [true, 'Enquiry source is required'],
      trim:     true,
      default:  EnquirySource.Web,
    },
    category: {
      type:     String,
      required: [true, 'Category is required'],
      trim:     true,
      default:  EnquiryCategory.General,
    },
    product: {
      type:     String,
      required: [true, 'Product is required'],
      trim:     true,
      default:  EnquiryProduct.Other,
    },
    priority: {
      type:    String,
      trim:    true,
      default: EnquiryPriority.Medium,
    },
    // Denormalised priority rank (from MasterData.weight) for correct sorting.
    priorityWeight: {
      type:    Number,
      default: 2,
    },
    status: {
      type: String,
      enum: {
        values:  Object.values(EnquiryStatus),
        message: 'Invalid status: {VALUE}',
      },
      default: EnquiryStatus.New,
    },

    // ── Detail ────────────────────────────────────────────────────────────────
    subject: {
      type:      String,
      required:  [true, 'Subject is required'],
      trim:      true,
      minlength: [5,   'Subject must be at least 5 characters'],
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    description: {
      type:      String,
      trim:      true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    internalNotes: {
      type:      String,
      maxlength: [2000, 'Internal notes cannot exceed 2000 characters'],
      select:    false,  // excluded from queries unless explicitly selected
    },
    tags: {
      type:     [String],
      default:  [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message:   'Cannot have more than 10 tags',
      },
    },
    attachments: { type: [AttachmentSchema], default: [] },

    // ── Assignment ────────────────────────────────────────────────────────────
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: Schema.Types.Mixed },   // ObjectId | 'system'
    assignedAt: { type: Date },

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    resolvedAt: { type: Date },
    closedAt:   { type: Date },
    createdBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Created-by reference is required'],
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

EnquirySchema.index({ enquiryNo: 1 },                         { unique: true })
EnquirySchema.index({ status: 1, assignedTo: 1 })
EnquirySchema.index({ status: 1, priority: 1 })
EnquirySchema.index({ status: 1, createdAt: -1 })
EnquirySchema.index({ assignedTo: 1, status: 1, createdAt: -1 })
EnquirySchema.index({ city: 1, district: 1 })
EnquirySchema.index({ pincode: 1 })
EnquirySchema.index({ product: 1, status: 1 })
EnquirySchema.index({ enquirySource: 1 })
EnquirySchema.index({ createdAt: -1 })
EnquirySchema.index({ customerName: 1 })
EnquirySchema.index({ phone: 1 })
// Full-text search across the most user-visible fields
EnquirySchema.index(
  {
    customerName: 'text',
    phone:        'text',
    email:        'text',
    subject:      'text',
    location:     'text',
    city:         'text',
    district:     'text',
  },
  {
    weights: {
      customerName: 10,
      phone:        8,
      email:        5,
      subject:      4,
      city:         2,
      district:     2,
      location:     1,
    },
    name: 'enquiry_text_search',
  }
)

// ─── Virtuals ─────────────────────────────────────────────────────────────────

EnquirySchema.virtual('isOpen').get(function (this: EnquiryDocument) {
  return ![EnquiryStatus.Closed, EnquiryStatus.Cancelled].includes(this.status)
})

EnquirySchema.virtual('ageInDays').get(function (this: EnquiryDocument) {
  return Math.floor((Date.now() - new Date(this.createdAt).getTime()) / 86_400_000)
})

EnquirySchema.virtual('resolutionTimeHours').get(function (this: EnquiryDocument) {
  if (!this.resolvedAt) return null
  return Math.round(
    (new Date(this.resolvedAt).getTime() - new Date(this.createdAt).getTime()) / 3_600_000
  )
})

EnquirySchema.virtual('assignedStaff', {
  ref:          'User',
  localField:   'assignedTo',
  foreignField: '_id',
  justOne:      true,
})

EnquirySchema.virtual('followUps', {
  ref:          'FollowUp',
  localField:   '_id',
  foreignField: 'enquiryId',
})

// ─── Hooks ────────────────────────────────────────────────────────────────────

// Auto-generate enquiry number on first save
EnquirySchema.pre('save', async function (next) {
  if (this.isNew && !this.enquiryNo) {
    this.enquiryNo = await generateEnquiryNo()
  }

  if (this.isModified('status') && !this.isNew) {
    const now = new Date()
    if (this.status === EnquiryStatus.Resolved && !this.resolvedAt) this.resolvedAt = now
    if (this.status === EnquiryStatus.Closed   && !this.closedAt)   this.closedAt   = now
    if (this.status === EnquiryStatus.Assigned  && !this.assignedAt) this.assignedAt = now
  }

  next()
})

// FSM guard — reject invalid status transitions on update
EnquirySchema.pre('save', function (next) {
  if (!this.isModified('status') || this.isNew) return next()

  // $__ is mongoose's internal state, not exposed on the public Document type
  const internals = this as unknown as {
    $__?: { activePaths?: { paths?: Record<string, string> } }
  }
  const prev = internals.$__?.activePaths?.paths?.status
  if (prev && prev !== this.status) {
    const allowed = ALLOWED_TRANSITIONS[prev as EnquiryStatus] ?? []
    if (!allowed.includes(this.status)) {
      return next(new Error(`Invalid status transition: ${prev} → ${this.status}`))
    }
  }
  next()
})

// ─── Model ────────────────────────────────────────────────────────────────────

const Enquiry: Model<EnquiryDocument> =
  models.Enquiry ?? model<EnquiryDocument>('Enquiry', EnquirySchema)

export default Enquiry
