import { Schema, model, models, type Model } from 'mongoose'
import { UserRole, UserStatus } from '@/types/enums'
import type { UserDocument } from '@/types'

// ─── Main schema ─────────────────────────────────────────────────────────────

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Invalid email address',
      ],
    },
    passwordHash: {
      type:     String,
      required: [true, 'Password hash is required'],
      select:   false, // never returned in queries unless explicitly selected
    },
    role: {
      type:     String,
      required: [true, 'Role is required'],
      enum: {
        values:  Object.values(UserRole),
        message: 'Invalid role: {VALUE}',
      },
      default: UserRole.Staff,
    },
    status: {
      type:    String,
      enum: {
        values:  Object.values(UserStatus),
        message: 'Invalid status: {VALUE}',
      },
      default: UserStatus.Active,
    },
    locationZoneId: {
      type: Schema.Types.ObjectId,
      ref:  'LocationZone',
    },
    avatar: {
      type:  String,
      match: [/^https?:\/\/.+/, 'Avatar must be a valid URL'],
    },
    phone: {
      type:  String,
      trim:  true,
      match: [/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number format'],
    },
    maxLoad: {
      type:    Number,
      default: 15,
      min:     [1,  'maxLoad must be at least 1'],
      max:     [100, 'maxLoad cannot exceed 100'],
    },
    currentLoad: {
      type:    Number,
      default: 0,
      min:     [0, 'currentLoad cannot be negative'],
    },
    isAvailable: {
      type:    Boolean,
      default: true,
    },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash // never leak hash in serialised output
        return ret
      },
    },
    toObject: { virtuals: true },
  }
)

// ─── Indexes ─────────────────────────────────────────────────────────────────

UserSchema.index({ email: 1 },                         { unique: true })
UserSchema.index({ role: 1 })
UserSchema.index({ status: 1 })
UserSchema.index({ locationZoneId: 1, role: 1 })
UserSchema.index({ locationZoneId: 1, isAvailable: 1, role: 1 }) // auto-assign query
UserSchema.index({ currentLoad: 1, isAvailable: 1 })             // workload sort
UserSchema.index({ createdAt: -1 })

// ─── Virtuals ────────────────────────────────────────────────────────────────

UserSchema.virtual('loadPercentage').get(function (this: UserDocument) {
  if (this.maxLoad === 0) return 0
  return Math.round((this.currentLoad / this.maxLoad) * 100)
})

UserSchema.virtual('isOverloaded').get(function (this: UserDocument) {
  return this.currentLoad >= this.maxLoad
})

UserSchema.virtual('displayRole').get(function (this: UserDocument) {
  const labels: Record<UserRole, string> = {
    [UserRole.SuperAdmin]: 'Super Admin',
    [UserRole.Manager]:    'Manager',
    [UserRole.Staff]:      'Staff',
  }
  return labels[this.role] ?? this.role
})

// Populate role permissions object
UserSchema.virtual('roleDetails', {
  ref:          'Role',
  localField:   'role',
  foreignField: 'slug',
  justOne:      true,
})

// ─── Instance methods ─────────────────────────────────────────────────────────

UserSchema.methods.isActive = function (): boolean {
  return this.status === UserStatus.Active
}

UserSchema.methods.canAcceptEnquiry = function (): boolean {
  return (
    this.status === UserStatus.Active &&
    this.isAvailable &&
    this.currentLoad < this.maxLoad
  )
}

// ─── Static methods ───────────────────────────────────────────────────────────

UserSchema.statics.findAvailableInZone = function (
  locationZoneId: string
) {
  return this.find({
    locationZoneId,
    role:        UserRole.Staff,
    status:      UserStatus.Active,
    isAvailable: true,
    $expr:       { $lt: ['$currentLoad', '$maxLoad'] },
  }).sort({ currentLoad: 1 })
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// Keep currentLoad from going below 0 on save
UserSchema.pre('save', function (next) {
  if (this.currentLoad < 0) this.currentLoad = 0
  next()
})

// ─── Model ───────────────────────────────────────────────────────────────────

const User: Model<UserDocument> =
  models.User ?? model<UserDocument>('User', UserSchema)

export default User
