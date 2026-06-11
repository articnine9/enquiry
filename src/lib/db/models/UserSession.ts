import { Schema, model, models, type Model, type Document, type Types } from 'mongoose'

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IUserSession {
  _id:         Types.ObjectId
  userId:      Types.ObjectId
  loginAt:     Date
  logoutAt:    Date | null
  ipAddress:   string | null
  userAgent:   string | null
  // Virtuals
  durationMinutes: number
  isActive:        boolean
  createdAt:  Date
  updatedAt:  Date
}

export type UserSessionDocument = IUserSession & Document

// ── Schema ────────────────────────────────────────────────────────────────────

const UserSessionSchema = new Schema<UserSessionDocument>(
  {
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'User reference is required'],
      index:    true,
    },
    loginAt: {
      type:     Date,
      required: true,
      default:  () => new Date(),
    },
    logoutAt:   { type: Date,   default: null },
    ipAddress:  { type: String, default: null, maxlength: 45 },
    userAgent:  { type: String, default: null, maxlength: 512 },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Indexes ───────────────────────────────────────────────────────────────────

UserSessionSchema.index({ userId: 1, loginAt: -1 })
UserSessionSchema.index({ userId: 1, logoutAt: 1 })
// Partial index for active sessions (logoutAt is null)
UserSessionSchema.index(
  { userId: 1, loginAt: -1 },
  { partialFilterExpression: { logoutAt: null }, name: 'active_sessions' }
)
// TTL — sessions older than 1 year are purged
UserSessionSchema.index(
  { loginAt: 1 },
  { expireAfterSeconds: 31_536_000, name: 'session_ttl' }
)

// ── Virtuals ──────────────────────────────────────────────────────────────────

UserSessionSchema.virtual('durationMinutes').get(function () {
  const end = this.logoutAt ?? new Date()
  return Math.round((end.getTime() - this.loginAt.getTime()) / 60_000)
})

UserSessionSchema.virtual('isActive').get(function () {
  return this.logoutAt === null
})

UserSessionSchema.virtual('user', {
  ref: 'User', localField: 'userId', foreignField: '_id', justOne: true,
})

// ── Statics ───────────────────────────────────────────────────────────────────

interface UserSessionModel extends Model<UserSessionDocument> {
  findActiveSession(userId: string): Promise<UserSessionDocument | null>
  endAllActiveSessions(userId: string): Promise<void>
}

UserSessionSchema.statics.findActiveSession = function (userId: string) {
  return this.findOne({ userId, logoutAt: null }).sort({ loginAt: -1 })
}

UserSessionSchema.statics.endAllActiveSessions = async function (userId: string) {
  await this.updateMany(
    { userId, logoutAt: null },
    { $set: { logoutAt: new Date() } }
  )
}

// ── Model ─────────────────────────────────────────────────────────────────────

const UserSession: UserSessionModel =
  (models.UserSession as UserSessionModel) ??
  model<UserSessionDocument, UserSessionModel>('UserSession', UserSessionSchema)

export default UserSession
