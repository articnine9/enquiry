import { Schema, model, models, type Model, type Types } from 'mongoose'
import {
  EnquiryStatus,
  EnquiryPriority,
  EnquirySource,
  EnquiryCategory,
  EnquiryProduct,
  LeadStage,
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
  // Business Category Classification — required on new enquiries, validated
  // against MasterData (business_category / business_subcategory) at the
  // action layer, same as source/category/product/priority above.
  businessCategory?:    string
  businessSubCategory?: string
  priorityWeight: number
  status:        EnquiryStatus
  // Sales pipeline stage — independent of status above. Free picklist, no FSM.
  leadStage:     LeadStage

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

  // Channel — auto-tagged from district/city at creation, editable afterward.
  // Organisational/reporting only; does not affect staff assignment above.
  distributorId?: Types.ObjectId | null
  dealerId?:      Types.ObjectId | null

  // Set once, the first time leadStage crosses into a converted stage — guards
  // against creating duplicate Customer purchase-history entries for the same deal.
  convertedAt?:   Date | null
  // Deal value captured at conversion — feeds Revenue Generated on the Staff
  // performance dashboard. Null for leads not yet converted (or legacy records).
  dealValue?:     number | null

  // Escalation — bumped on meaningful staff action (status/lead-stage change,
  // assignment, follow-up), distinct from `updatedAt` which also gets touched
  // by system-side bookkeeping (e.g. SLA pause handling). Drives the 24h/48h/72h
  // reminder → escalation → reassignment tiers.
  lastActionAt?:  Date
  // Highest escalation tier a notification has already been sent for, so the
  // lazy check (run whenever the enquiry list/detail is viewed) never re-notifies
  // for the same tier crossing.
  escalationNotifiedTier?: 'reminder' | 'escalated' | null

  // SLA — resolved via SLAPolicy at create/priority-change time, frozen at resolution
  slaPolicyId?:      Types.ObjectId | null
  slaDueAt?:         Date | null
  slaMet?:           boolean | null   // null while open; frozen true/false when resolved
  slaPausedAt?:      Date | null      // set while status = Paused; clears (and shifts slaDueAt) on resume
  slaPausedTotalMs?: number           // cumulative paused duration, across all pause/resume cycles

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
  [EnquiryStatus.InProgress]: [EnquiryStatus.FollowUp,   EnquiryStatus.Paused,    EnquiryStatus.Resolved, EnquiryStatus.Cancelled],
  [EnquiryStatus.Paused]:     [EnquiryStatus.InProgress, EnquiryStatus.Cancelled],
  [EnquiryStatus.FollowUp]:   [EnquiryStatus.InProgress, EnquiryStatus.Resolved,  EnquiryStatus.Cancelled],
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
    businessCategory: {
      type: String,
      trim: true,
    },
    businessSubCategory: {
      type: String,
      trim: true,
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
    // Sales pipeline stage — independent of status. No transition guard.
    leadStage: {
      type: String,
      enum: {
        values:  Object.values(LeadStage),
        message: 'Invalid lead stage: {VALUE}',
      },
      default: LeadStage.NewLead,
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

    // ── Channel (distributor / dealer) ─────────────────────────────────────────
    distributorId: { type: Schema.Types.ObjectId, ref: 'Distributor', default: null },
    dealerId:       { type: Schema.Types.ObjectId, ref: 'Dealer',       default: null },
    convertedAt:    { type: Date, default: null },
    dealValue:      { type: Number, min: 0, default: null },

    lastActionAt: { type: Date, default: Date.now },
    escalationNotifiedTier: {
      type:    String,
      enum:    ['reminder', 'escalated', null],
      default: null,
    },

    // ── SLA ───────────────────────────────────────────────────────────────────
    slaPolicyId:      { type: Schema.Types.ObjectId, ref: 'SLAPolicy', default: null },
    slaDueAt:         { type: Date,    default: null },
    slaMet:           { type: Boolean, default: null },
    slaPausedAt:      { type: Date,    default: null },
    slaPausedTotalMs: { type: Number,  default: 0 },

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
EnquirySchema.index({ status: 1, slaDueAt: 1 })   // breached-open lookups
EnquirySchema.index({ slaMet: 1 })                // compliance reporting
EnquirySchema.index({ distributorId: 1, createdAt: -1 })
EnquirySchema.index({ dealerId: 1, createdAt: -1 })
EnquirySchema.index({ leadStage: 1, createdAt: -1 })
EnquirySchema.index({ businessCategory: 1, businessSubCategory: 1 })
EnquirySchema.index({ assignedTo: 1, lastActionAt: 1 })
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

// Snapshot the persisted status whenever a document is hydrated from the DB, so
// the FSM guard below can compare against the true previous value. `$locals` is
// scratch space Mongoose provides for exactly this — it's never persisted and
// never touched by `find`/`update` queries themselves.
EnquirySchema.post('init', function (doc) {
  doc.$locals.previousStatus = doc.status
})

// Auto-generate enquiry number on first save
EnquirySchema.pre('save', async function (next) {
  if (this.isNew && !this.enquiryNo) {
    this.enquiryNo = await generateEnquiryNo()
  }

  if (this.isModified('status') && !this.isNew) {
    const now = new Date()
    const prevStatus = this.$locals.previousStatus as EnquiryStatus | undefined

    if (this.status === EnquiryStatus.Resolved && !this.resolvedAt) {
      this.resolvedAt = now
      // Freeze the SLA verdict at the moment of resolution — permanent from here on,
      // even if the policy or due date changes later.
      if (this.slaDueAt) this.slaMet = now.getTime() <= new Date(this.slaDueAt).getTime()
    }
    if (this.status === EnquiryStatus.Closed   && !this.closedAt)   this.closedAt   = now
    if (this.status === EnquiryStatus.Assigned  && !this.assignedAt) this.assignedAt = now

    // SLA pause/resume — the due date absorbs however long the clock was paused,
    // so `getSlaStatus` never needs to know about pause history, only the current state.
    if (this.status === EnquiryStatus.Paused && prevStatus !== EnquiryStatus.Paused) {
      this.slaPausedAt = now
    }
    if (prevStatus === EnquiryStatus.Paused && this.status !== EnquiryStatus.Paused) {
      if (this.slaPausedAt && this.slaDueAt) {
        const pausedMs = now.getTime() - new Date(this.slaPausedAt).getTime()
        this.slaDueAt = new Date(new Date(this.slaDueAt).getTime() + pausedMs)
        this.slaPausedTotalMs = (this.slaPausedTotalMs ?? 0) + pausedMs
      }
      this.slaPausedAt = null
    }
  }

  next()
})

// FSM guard — reject invalid status transitions on update
EnquirySchema.pre('save', function (next) {
  if (!this.isModified('status') || this.isNew) return next()

  const prev = this.$locals.previousStatus as EnquiryStatus | undefined
  if (prev && prev !== this.status) {
    const allowed = ALLOWED_TRANSITIONS[prev] ?? []
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
