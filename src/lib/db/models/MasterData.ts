import { Schema, model, models, type Model, type Types } from 'mongoose'
import {
  MASTER_DATA_TYPES,
  type MasterDataType,
} from '@/features/settings/masterData.constants'

// One generic lookup collection backs several enquiry dropdowns. `type` is the
// discriminator; `code` is the stable machine value stored on the Enquiry doc.
// Constants/types live in ./masterData.constants so client components can import
// them without pulling mongoose into the browser bundle.
export {
  MASTER_DATA_TYPES,
  MASTER_DATA_TYPE_LABELS,
  type MasterDataType,
} from '@/features/settings/masterData.constants'

// ─── TypeScript interface ─────────────────────────────────────────────────────

export interface IMasterData {
  _id:       Types.ObjectId
  type:      MasterDataType
  code:      string        // stable value stored on Enquiry, e.g. 'product_a'
  label:     string        // display text, e.g. 'Product A'
  color?:    string        // badge colour token (priority only), e.g. 'amber'
  weight?:   number        // semantic rank for sorting (priority only)
  sortOrder: number        // display order within its type
  isActive:  boolean       // hidden from new-enquiry dropdowns when false
  isSystem:  boolean        // seeded default — protected from deletion
  createdAt: Date
  updatedAt: Date
}

export type MasterDataDocument = IMasterData

// ─── Schema ───────────────────────────────────────────────────────────────────

const MasterDataSchema = new Schema<MasterDataDocument>(
  {
    type: {
      type:     String,
      required: [true, 'Type is required'],
      enum: {
        values:  [...MASTER_DATA_TYPES],
        message: 'Invalid master-data type: {VALUE}',
      },
      index: true,
    },
    code: {
      type:      String,
      required:  [true, 'Code is required'],
      trim:      true,
      lowercase: true,
      match:     [/^[a-z0-9_]{2,40}$/, 'Code must be 2–40 lowercase letters, digits, or underscores'],
    },
    label: {
      type:      String,
      required:  [true, 'Label is required'],
      trim:      true,
      maxlength: [80, 'Label cannot exceed 80 characters'],
    },
    color:  { type: String, trim: true },
    weight: { type: Number },
    sortOrder: { type: Number, default: 0 },
    isActive:  { type: Boolean, default: true },
    isSystem:  { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

MasterDataSchema.index({ type: 1, code: 1 }, { unique: true })
MasterDataSchema.index({ type: 1, isActive: 1, sortOrder: 1 })

// ─── Model ────────────────────────────────────────────────────────────────────

const MasterData: Model<MasterDataDocument> =
  models.MasterData ?? model<MasterDataDocument>('MasterData', MasterDataSchema)

export default MasterData
