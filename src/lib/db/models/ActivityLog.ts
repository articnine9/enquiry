import { Schema, model, models, type Model } from 'mongoose'
import { UserRole, ActivityAction, EntityType } from '@/types/enums'
import type { ActivityLogDocument } from '@/types'

// ─── Main schema ─────────────────────────────────────────────────────────────

const ActivityLogSchema = new Schema<ActivityLogDocument>(
  {
    actorId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Actor reference is required'],
    },
    actorRole: {
      type:     String,
      required: [true, 'Actor role is required'],
      enum: {
        values:  Object.values(UserRole),
        message: 'Invalid actor role: {VALUE}',
      },
    },
    action: {
      type:     String,
      required: [true, 'Action is required'],
      enum: {
        values:  Object.values(ActivityAction),
        message: 'Invalid action: {VALUE}',
      },
    },
    entityType: {
      type:     String,
      required: [true, 'Entity type is required'],
      enum: {
        values:  Object.values(EntityType),
        message: 'Invalid entity type: {VALUE}',
      },
    },
    entityId: {
      type:     Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
    },
    changes: {
      before: { type: Schema.Types.Mixed },
      after:  { type: Schema.Types.Mixed },
    },
    metadata: { type: Schema.Types.Mixed },
    ip: {
      type:  String,
      match: [
        /^(\d{1,3}\.){3}\d{1,3}$|^[\da-f:]+$/i,
        'Invalid IP address format',
      ],
    },
    userAgent: {
      type:      String,
      maxlength: [500, 'User-agent cannot exceed 500 characters'],
    },
  },
  {
    // Only createdAt — logs are immutable, no updatedAt
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ─── Indexes ─────────────────────────────────────────────────────────────────

ActivityLogSchema.index({ actorId: 1, createdAt: -1 })
ActivityLogSchema.index({ entityId: 1, entityType: 1, createdAt: -1 })
ActivityLogSchema.index({ action: 1, createdAt: -1 })
ActivityLogSchema.index({ createdAt: -1 })
// TTL: logs expire after 2 years for compliance-safe cleanup
ActivityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 63_072_000, name: 'activity_log_ttl' }
)

// ─── Virtuals ─────────────────────────────────────────────────────────────────

ActivityLogSchema.virtual('actor', {
  ref:        'User',
  localField: 'actorId',
  foreignField: '_id',
  justOne:    true,
})

ActivityLogSchema.virtual('actionLabel').get(function (this: ActivityLogDocument) {
  return this.action.replace(/\./g, ' › ')
})

// ─── Immutability guard ───────────────────────────────────────────────────────

// Logs must never be updated — only read or created
ActivityLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function () {
  throw new Error('ActivityLog records are immutable and cannot be updated')
})

// ─── Static factory ───────────────────────────────────────────────────────────

ActivityLogSchema.statics.record = async function (params: {
  actorId:    string
  actorRole:  UserRole
  action:     ActivityAction
  entityType: EntityType
  entityId:   string
  changes?:   { before: Record<string, unknown>; after: Record<string, unknown> }
  metadata?:  Record<string, unknown>
  ip?:        string
  userAgent?: string
}) {
  return this.create(params)
}

// ─── Model ───────────────────────────────────────────────────────────────────

const ActivityLog: Model<ActivityLogDocument> =
  models.ActivityLog ?? model<ActivityLogDocument>('ActivityLog', ActivityLogSchema)

export default ActivityLog
