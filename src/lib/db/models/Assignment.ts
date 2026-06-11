import { Schema, model, models, type Model, type Document } from 'mongoose'
import { AssignmentType, AssignmentStatus, ZoneMatchTier } from '@/types/assignment.types'
import type { IAssignment } from '@/types/assignment.types'

// ── Document type ─────────────────────────────────────────────────────────────

export type AssignmentDocument = IAssignment & Document & {
  durationHours: number  // virtual
}

// ── Schema ────────────────────────────────────────────────────────────────────

const AssignmentSchema = new Schema<AssignmentDocument>(
  {
    enquiryId: {
      type:     Schema.Types.ObjectId,
      ref:      'Enquiry',
      required: [true, 'Enquiry reference is required'],
      index:    true,
    },
    staffId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Staff reference is required'],
      index:    true,
    },
    zoneId: {
      type:    Schema.Types.ObjectId,
      ref:     'LocationZone',
      default: null,
    },
    assignedById: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Actor reference is required'],
    },

    type: {
      type:     String,
      required: true,
      enum:     { values: Object.values(AssignmentType), message: 'Invalid assignment type: {VALUE}' },
    },
    status: {
      type:    String,
      default: AssignmentStatus.Active,
      enum:    { values: Object.values(AssignmentStatus), message: 'Invalid assignment status: {VALUE}' },
      index:   true,
    },
    matchTier: {
      type: String,
      enum: { values: Object.values(ZoneMatchTier), message: 'Invalid match tier: {VALUE}' },
    },

    reason: {
      type:      String,
      trim:      true,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },

    // Linked list pointer — enables full history traversal
    previousAssignmentId: {
      type:    Schema.Types.ObjectId,
      ref:     'Assignment',
      default: null,
    },

    assignedAt:      { type: Date, required: true, default: () => new Date() },
    releasedAt:      { type: Date, default: null },
    releasedReason:  { type: String, trim: true, maxlength: 500, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Compound indexes ──────────────────────────────────────────────────────────

// Fast lookup: active assignment for an enquiry
AssignmentSchema.index({ enquiryId: 1, status: 1 })
// Staff workload queries
AssignmentSchema.index({ staffId: 1, status: 1 })
// Assignment history for a staff member, newest first
AssignmentSchema.index({ staffId: 1, assignedAt: -1 })
// History page for an enquiry
AssignmentSchema.index({ enquiryId: 1, assignedAt: -1 })
// Zone-level workload
AssignmentSchema.index({ zoneId: 1, status: 1 })
// Admin reporting
AssignmentSchema.index({ type: 1, createdAt: -1 })

// ── Virtuals ──────────────────────────────────────────────────────────────────

/** Hours between assignment and release (or now if still active) */
AssignmentSchema.virtual('durationHours').get(function () {
  const end = this.releasedAt ?? new Date()
  return Math.round((end.getTime() - this.assignedAt.getTime()) / 3_600_000)
})

AssignmentSchema.virtual('staff', {
  ref:         'User',
  localField:  'staffId',
  foreignField: '_id',
  justOne:     true,
})

AssignmentSchema.virtual('assignedBy', {
  ref:         'User',
  localField:  'assignedById',
  foreignField: '_id',
  justOne:     true,
})

AssignmentSchema.virtual('zone', {
  ref:         'LocationZone',
  localField:  'zoneId',
  foreignField: '_id',
  justOne:     true,
})

AssignmentSchema.virtual('enquiry', {
  ref:         'Enquiry',
  localField:  'enquiryId',
  foreignField: '_id',
  justOne:     true,
})

AssignmentSchema.virtual('previousAssignment', {
  ref:         'Assignment',
  localField:  'previousAssignmentId',
  foreignField: '_id',
  justOne:     true,
})

// ── Statics ───────────────────────────────────────────────────────────────────

interface AssignmentModel extends Model<AssignmentDocument> {
  findActiveForEnquiry(enquiryId: string): Promise<AssignmentDocument | null>
  findHistoryForEnquiry(enquiryId: string): Promise<AssignmentDocument[]>
  findActiveForStaff(staffId: string): Promise<AssignmentDocument[]>
  countActiveForStaff(staffId: string): Promise<number>
}

AssignmentSchema.statics.findActiveForEnquiry = function (enquiryId: string) {
  return this.findOne({ enquiryId, status: AssignmentStatus.Active })
    .populate('staffId', 'name email')
    .populate('zoneId',  'name code')
    .lean()
}

AssignmentSchema.statics.findHistoryForEnquiry = function (enquiryId: string) {
  return this.find({ enquiryId })
    .sort({ assignedAt: -1 })
    .populate('staffId',    'name email')
    .populate('assignedById', 'name email')
    .populate('zoneId',     'name code')
    .lean()
}

AssignmentSchema.statics.findActiveForStaff = function (staffId: string) {
  return this.find({ staffId, status: AssignmentStatus.Active })
    .populate('enquiryId', 'enquiryNo customerName status priority')
    .sort({ assignedAt: -1 })
    .lean()
}

AssignmentSchema.statics.countActiveForStaff = function (staffId: string) {
  return this.countDocuments({ staffId, status: AssignmentStatus.Active })
}

// ── Prevent mutating history records ─────────────────────────────────────────

AssignmentSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate'],
  function (next) {
    // Allow only status/releasedAt/releasedReason updates (release operation)
    const update = this.getUpdate() as Record<string, unknown>
    const allowed = new Set(['status', 'releasedAt', 'releasedReason', 'updatedAt', '$set'])
    const keys    = Object.keys(update).filter((k) => !k.startsWith('$'))
    const setKeys = Object.keys((update.$set ?? {}) as object)

    const forbidden = [...keys, ...setKeys].filter((k) => !allowed.has(k))
    if (forbidden.length > 0) {
      return next(new Error(`Assignment: immutable fields cannot be updated: ${forbidden.join(', ')}`))
    }
    next()
  }
)

// ── Model ─────────────────────────────────────────────────────────────────────

const Assignment: AssignmentModel =
  (models.Assignment as AssignmentModel) ??
  model<AssignmentDocument, AssignmentModel>('Assignment', AssignmentSchema)

export default Assignment
