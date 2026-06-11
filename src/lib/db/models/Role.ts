import { Schema, model, models, type Model } from 'mongoose'
import { UserRole } from '@/types/enums'
import type { RoleDocument } from '@/types'

// ─── Sub-schema ──────────────────────────────────────────────────────────────

const PermissionSchema = new Schema(
  {
    resource: {
      type:     String,
      required: [true, 'Permission resource is required'],
      trim:     true,
    },
    actions: {
      type:     [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message:   'At least one action is required per permission',
      },
    },
  },
  { _id: false }
)

// ─── Main schema ─────────────────────────────────────────────────────────────

const RoleSchema = new Schema<RoleDocument>(
  {
    name: {
      type:      String,
      required:  [true, 'Role name is required'],
      trim:      true,
      maxlength: [50, 'Role name cannot exceed 50 characters'],
    },
    slug: {
      type:     String,
      required: [true, 'Role slug is required'],
      unique:   true,
      enum: {
        values:  Object.values(UserRole),
        message: 'Invalid role slug: {VALUE}',
      },
    },
    description: {
      type:      String,
      required:  [true, 'Role description is required'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    permissions: {
      type:    [PermissionSchema],
      default: [],
    },
    isSystem: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ─── Indexes ─────────────────────────────────────────────────────────────────

RoleSchema.index({ slug: 1 }, { unique: true })

// ─── Virtuals ────────────────────────────────────────────────────────────────

RoleSchema.virtual('permissionCount').get(function (this: RoleDocument) {
  return this.permissions.length
})

// ─── Methods ─────────────────────────────────────────────────────────────────

RoleSchema.methods.can = function (resource: string, action: string): boolean {
  return this.permissions.some(
    (p: { resource: string; actions: string[] }) =>
      p.resource === resource &&
      (p.actions.includes(action) || p.actions.includes('*'))
  )
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// Prevent deletion of system roles
RoleSchema.pre('deleteOne', { document: true }, function () {
  if ((this as RoleDocument).isSystem) {
    throw new Error('System roles cannot be deleted')
  }
})

// ─── Model ───────────────────────────────────────────────────────────────────

const Role: Model<RoleDocument> =
  models.Role ?? model<RoleDocument>('Role', RoleSchema)

export default Role
