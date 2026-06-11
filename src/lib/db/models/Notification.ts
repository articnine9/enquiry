import { Schema, model, models, type Model } from 'mongoose'
import { NotificationType, NotificationChannel, EntityType } from '@/types/enums'
import type { NotificationDocument } from '@/types'

// ─── Main schema ─────────────────────────────────────────────────────────────

const NotificationSchema = new Schema<NotificationDocument>(
  {
    recipientId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Recipient is required'],
    },
    type: {
      type:     String,
      required: [true, 'Notification type is required'],
      enum: {
        values:  Object.values(NotificationType),
        message: 'Invalid notification type: {VALUE}',
      },
    },
    channel: {
      type:    String,
      enum: {
        values:  Object.values(NotificationChannel),
        message: 'Invalid channel: {VALUE}',
      },
      default: NotificationChannel.InApp,
    },
    title: {
      type:      String,
      required:  [true, 'Title is required'],
      trim:      true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    body: {
      type:      String,
      required:  [true, 'Body is required'],
      trim:      true,
      maxlength: [1000, 'Body cannot exceed 1000 characters'],
    },
    entityType: {
      type: String,
      enum: {
        values:  Object.values(EntityType),
        message: 'Invalid entity type: {VALUE}',
      },
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    isRead:  { type: Boolean, default: false },
    readAt:  { type: Date },
    sentAt:  { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ─── Indexes ─────────────────────────────────────────────────────────────────

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 })
NotificationSchema.index({ recipientId: 1, createdAt: -1 })
NotificationSchema.index({ entityId: 1, entityType: 1 })
// TTL: remove read notifications after 30 days
NotificationSchema.index(
  { readAt: 1 },
  {
    expireAfterSeconds: 2_592_000, // 30 days
    partialFilterExpression: { isRead: true },
    name: 'notification_read_ttl',
  }
)
// TTL: remove unread notifications after 90 days
NotificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 7_776_000, // 90 days
    partialFilterExpression: { isRead: false },
    name: 'notification_unread_ttl',
  }
)

// ─── Virtuals ─────────────────────────────────────────────────────────────────

NotificationSchema.virtual('recipient', {
  ref:        'User',
  localField: 'recipientId',
  foreignField: '_id',
  justOne:    true,
})

// ─── Middleware ───────────────────────────────────────────────────────────────

NotificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date()
  }
  next()
})

// ─── Static helpers ───────────────────────────────────────────────────────────

NotificationSchema.statics.markAllRead = async function (recipientId: string) {
  return this.updateMany(
    { recipientId, isRead: false },
    { isRead: true, readAt: new Date() }
  )
}

NotificationSchema.statics.unreadCount = async function (recipientId: string): Promise<number> {
  return this.countDocuments({ recipientId, isRead: false })
}

// ─── Model ───────────────────────────────────────────────────────────────────

const Notification: Model<NotificationDocument> =
  models.Notification ?? model<NotificationDocument>('Notification', NotificationSchema)

export default Notification
