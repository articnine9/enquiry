import { Schema, model, models, type Model, type Document } from 'mongoose'
import { FollowUpType, FollowUpOutcome } from '@/types/enums'

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum FollowUpStatus {
  Scheduled = 'scheduled',
  Completed = 'completed',
  Missed    = 'missed',
  Cancelled = 'cancelled',
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface IFollowUpAttachment {
  fileName:   string
  url:        string
  mimeType:   string
  sizeBytes:  number
  uploadedAt: Date
  uploadedBy: Schema.Types.ObjectId
}

export interface IFollowUp {
  enquiryId:         Schema.Types.ObjectId
  createdBy:         Schema.Types.ObjectId
  type:              FollowUpType
  status:            FollowUpStatus
  outcome?:          FollowUpOutcome
  notes:             string
  internalNotes?:    string           // select:false — managers/admins only
  scheduledAt:       Date             // when this follow-up should happen
  completedAt?:      Date             // when it actually happened
  durationMinutes?:  number           // call/meeting duration
  nextFollowUpDate?: Date             // schedules the next entry
  nextFollowUpType?: FollowUpType     // type hint for the next entry
  reminderAt?:       Date             // when to fire a reminder notification
  reminderSentAt?:   Date             // set once reminder has been dispatched
  reminderDismissed: boolean
  tags:              string[]
  attachments:       IFollowUpAttachment[]
  createdAt:         Date
  updatedAt:         Date
  // virtuals
  isOverdue:         boolean
  isOpen:            boolean
  ageInDays:         number
}

export type FollowUpDocument = IFollowUp & Document

// ── Attachment sub-schema (reused) ────────────────────────────────────────────

const AttachmentSchema = new Schema(
  {
    fileName:   { type: String, required: true, trim: true },
    url:        { type: String, required: true },
    mimeType:   { type: String, required: true },
    sizeBytes:  { type: Number, required: true, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
)

// ── Main schema ───────────────────────────────────────────────────────────────

const FollowUpSchema = new Schema<FollowUpDocument>(
  {
    enquiryId: {
      type:     Schema.Types.ObjectId,
      ref:      'Enquiry',
      required: [true, 'Enquiry reference is required'],
      index:    true,
    },
    createdBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Creator reference is required'],
    },
    type: {
      type:     String,
      required: [true, 'Follow-up type is required'],
      enum:     { values: Object.values(FollowUpType), message: 'Invalid type: {VALUE}' },
    },
    status: {
      type:    String,
      default: FollowUpStatus.Scheduled,
      enum:    { values: Object.values(FollowUpStatus), message: 'Invalid status: {VALUE}' },
      index:   true,
    },
    outcome: {
      type: String,
      enum: { values: Object.values(FollowUpOutcome), message: 'Invalid outcome: {VALUE}' },
    },
    notes: {
      type:      String,
      required:  [true, 'Notes are required'],
      trim:      true,
      minlength: [5,    'Notes must be at least 5 characters'],
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },
    internalNotes: {
      type:      String,
      trim:      true,
      maxlength: 2000,
      select:    false,
    },
    scheduledAt: {
      type:     Date,
      required: [true, 'Scheduled date is required'],
    },
    completedAt:     { type: Date, default: null },
    durationMinutes: { type: Number, min: 1, max: 480, default: null },

    // Next follow-up scheduling
    nextFollowUpDate: {
      type: Date,
      default: null,
      validate: {
        validator(this: FollowUpDocument, v: Date | null) {
          if (!v) return true
          return v > new Date()
        },
        message: 'Next follow-up date must be in the future',
      },
    },
    nextFollowUpType: {
      type: String,
      enum: { values: Object.values(FollowUpType), message: 'Invalid next type: {VALUE}' },
    },

    // Reminder
    reminderAt:        { type: Date, default: null },
    reminderSentAt:    { type: Date, default: null },
    reminderDismissed: { type: Boolean, default: false },

    tags: {
      type:     [String],
      default:  [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message:   'Cannot have more than 10 tags',
      },
    },

    attachments: { type: [AttachmentSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Indexes ───────────────────────────────────────────────────────────────────

FollowUpSchema.index({ enquiryId: 1, status: 1 })
FollowUpSchema.index({ enquiryId: 1, createdAt: -1 })
FollowUpSchema.index({ createdBy: 1, status: 1 })
FollowUpSchema.index({ createdBy: 1, scheduledAt: 1 })

// Partial index — only index open follow-ups with a future scheduled date
// Used by the reminder daemon and "upcoming" queries
FollowUpSchema.index(
  { scheduledAt: 1, status: 1 },
  { partialFilterExpression: { status: FollowUpStatus.Scheduled } }
)

// Reminder dispatch index — only unset reminder entries
FollowUpSchema.index(
  { reminderAt: 1 },
  {
    partialFilterExpression: {
      reminderSentAt:    null,
      reminderDismissed: false,
      status:            FollowUpStatus.Scheduled,
    },
  }
)

// ── Virtuals ──────────────────────────────────────────────────────────────────

FollowUpSchema.virtual('isOverdue').get(function (this: FollowUpDocument) {
  return (
    this.status === FollowUpStatus.Scheduled &&
    this.scheduledAt < new Date()
  )
})

FollowUpSchema.virtual('isOpen').get(function (this: FollowUpDocument) {
  return this.status === FollowUpStatus.Scheduled
})

FollowUpSchema.virtual('ageInDays').get(function (this: FollowUpDocument) {
  return Math.floor(
    (Date.now() - this.createdAt.getTime()) / 86_400_000
  )
})

FollowUpSchema.virtual('enquiry', {
  ref: 'Enquiry', localField: 'enquiryId', foreignField: '_id', justOne: true,
})
FollowUpSchema.virtual('creator', {
  ref: 'User', localField: 'createdBy', foreignField: '_id', justOne: true,
})

// ── Hooks ─────────────────────────────────────────────────────────────────────

FollowUpSchema.pre('save', function (this: FollowUpDocument, next) {
  // Auto-set completedAt when marking as completed
  if (this.isModified('status') && this.status === FollowUpStatus.Completed && !this.completedAt) {
    this.completedAt = new Date()
  }
  // nextFollowUpType only valid when nextFollowUpDate is set
  if (!this.nextFollowUpDate) {
    this.nextFollowUpType = undefined
  }
  // reminderAt must be before scheduledAt
  if (this.reminderAt && this.reminderAt >= this.scheduledAt) {
    return next(new Error('Reminder must be set before the scheduled date'))
  }
  next()
})

// ── Statics ───────────────────────────────────────────────────────────────────

interface FollowUpModel extends Model<FollowUpDocument> {
  findForEnquiry(enquiryId: string): Promise<FollowUpDocument[]>
  findUpcoming(staffId: string, days?: number): Promise<FollowUpDocument[]>
  findOverdue(staffId?: string): Promise<FollowUpDocument[]>
  findDueReminders(): Promise<FollowUpDocument[]>
}

FollowUpSchema.statics.findForEnquiry = function (enquiryId: string) {
  return this.find({ enquiryId })
    .sort({ scheduledAt: -1 })
    .populate('createdBy', 'name email')
    .lean()
}

FollowUpSchema.statics.findUpcoming = function (staffId: string, days = 7) {
  const from = new Date()
  const to   = new Date(Date.now() + days * 86_400_000)
  return this.find({
    createdBy:   staffId,
    status:      FollowUpStatus.Scheduled,
    scheduledAt: { $gte: from, $lte: to },
  })
    .sort({ scheduledAt: 1 })
    .populate('enquiryId', 'enquiryNo customerName')
    .lean()
}

FollowUpSchema.statics.findOverdue = function (staffId?: string) {
  return this.find({
    ...(staffId ? { createdBy: staffId } : {}),
    status:      FollowUpStatus.Scheduled,
    scheduledAt: { $lt: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .populate('enquiryId', 'enquiryNo customerName priority')
    .lean()
}

FollowUpSchema.statics.findDueReminders = function () {
  return this.find({
    status:            FollowUpStatus.Scheduled,
    reminderAt:        { $lte: new Date() },
    reminderSentAt:    null,
    reminderDismissed: false,
  }).lean()
}

// ── Model ─────────────────────────────────────────────────────────────────────

const FollowUp: FollowUpModel =
  (models.FollowUp as FollowUpModel) ??
  model<FollowUpDocument, FollowUpModel>('FollowUp', FollowUpSchema)

export default FollowUp
