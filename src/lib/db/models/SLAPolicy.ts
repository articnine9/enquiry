import { Schema, model, models, type Model, type Types } from 'mongoose'

// ─── SLA policy ───────────────────────────────────────────────────────────────
// Resolution-time target for an enquiry, scoped by priority and (optionally) a
// specific category. `category: null` is the default row for that priority —
// used whenever no category-specific override exists.

export interface ISLAPolicy {
  _id:                Types.ObjectId
  priority:           string        // matches a MasterData `enquiry_priority` code
  category:           string | null // matches a MasterData `enquiry_category` code, or null = all categories
  resolutionMinutes:  number        // time-to-resolve target, in minutes
  isActive:           boolean
  isSystem:           boolean       // seeded default — protected from deletion
  createdAt:          Date
  updatedAt:          Date
}

export type SLAPolicyDocument = ISLAPolicy

const SLAPolicySchema = new Schema<SLAPolicyDocument>(
  {
    priority: {
      type:      String,
      required:  [true, 'Priority is required'],
      trim:      true,
      lowercase: true,
    },
    category: {
      type:      String,
      trim:      true,
      lowercase: true,
      default:   null,
    },
    resolutionMinutes: {
      type:     Number,
      required: [true, 'Resolution time is required'],
      min:      [1,     'Resolution time must be at least 1 minute'],
      max:      [43_200, 'Resolution time cannot exceed 30 days'],
    },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// One row per (priority, category) pair — category: null is the default for that priority.
SLAPolicySchema.index({ priority: 1, category: 1 }, { unique: true })
SLAPolicySchema.index({ priority: 1, isActive: 1 })

const SLAPolicy: Model<SLAPolicyDocument> =
  models.SLAPolicy ?? model<SLAPolicyDocument>('SLAPolicy', SLAPolicySchema)

export default SLAPolicy
