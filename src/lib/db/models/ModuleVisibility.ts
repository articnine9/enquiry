import { Schema, model, models, type Model, type Types } from 'mongoose'

// ─── ModuleVisibility ─────────────────────────────────────────────────────────
// One row per toggleable module — controls whether Staff can see/access it.
// Absence of a row for a given moduleKey means "enabled" (safe default so a
// newly-added toggleable module doesn't silently disappear for Staff until
// an admin explicitly turns it off).

export interface IModuleVisibility {
  _id:             Types.ObjectId
  moduleKey:       string
  enabledForStaff: boolean
  updatedAt:       Date
  createdAt:       Date
}

export type ModuleVisibilityDocument = IModuleVisibility

const ModuleVisibilitySchema = new Schema<ModuleVisibilityDocument>(
  {
    moduleKey: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    enabledForStaff: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

const ModuleVisibility: Model<ModuleVisibilityDocument> =
  models.ModuleVisibility ?? model<ModuleVisibilityDocument>('ModuleVisibility', ModuleVisibilitySchema)

export default ModuleVisibility
