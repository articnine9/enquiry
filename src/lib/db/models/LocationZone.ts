import { Schema, model, models, type Model, type Document, type Types } from 'mongoose'
import type { ILocationZone } from '@/types/assignment.types'

// ── Document type ─────────────────────────────────────────────────────────────

export type LocationZoneDocument = ILocationZone & Document

// ── Schema ────────────────────────────────────────────────────────────────────

const LocationZoneSchema = new Schema<LocationZoneDocument>(
  {
    name: {
      type:      String,
      required:  [true, 'Zone name is required'],
      trim:      true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    code: {
      type:      String,
      required:  [true, 'Zone code is required'],
      unique:    true,
      uppercase: true,
      trim:      true,
      match:     [/^[A-Z0-9_-]{2,30}$/, 'Code must be 2–30 uppercase alphanumeric chars'],
    },
    description: {
      type:      String,
      trim:      true,
      maxlength: 500,
    },

    // ── Coverage arrays (all stored normalised lowercase) ──────────────────
    pincodes: {
      type:     [String],
      default:  [],
      validate: {
        validator: (v: string[]) => v.every((p) => /^\d{5}$/.test(p)),
        message:   'Every pincode must be exactly 5 digits',
      },
    },
    districts: {
      type:    [String],
      default: [],
      set:     (v: string[]) => v.map((s) => s.trim().toLowerCase()),
    },
    cities: {
      type:    [String],
      default: [],
      set:     (v: string[]) => v.map((s) => s.trim().toLowerCase()),
    },

    maxCapacity: {
      type:    Number,
      default: 50,
      min:     [1, 'maxCapacity must be at least 1'],
    },
    isActive:  { type: Boolean, default: true, index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Indexes ───────────────────────────────────────────────────────────────────

LocationZoneSchema.index({ code:      1 }, { unique: true })
LocationZoneSchema.index({ pincodes:  1 })          // for O(1) pincode lookup
LocationZoneSchema.index({ districts: 1 })
LocationZoneSchema.index({ cities:    1 })
LocationZoneSchema.index({ isActive:  1, code: 1 })
LocationZoneSchema.index({ managerId: 1 })

// ── Virtuals ──────────────────────────────────────────────────────────────────

/** Total coverage area count */
LocationZoneSchema.virtual('coverageCount').get(function () {
  return (this.pincodes?.length ?? 0) +
         (this.districts?.length ?? 0) +
         (this.cities?.length ?? 0)
})

// ── Statics ───────────────────────────────────────────────────────────────────

interface LocationZoneModel extends Model<LocationZoneDocument> {
  findByPincode(pincode: string): Promise<LocationZoneDocument | null>
  findByDistrict(district: string): Promise<LocationZoneDocument | null>
  findByCity(city: string): Promise<LocationZoneDocument | null>
}

LocationZoneSchema.statics.findByPincode = function (pincode: string) {
  return this.findOne({ isActive: true, pincodes: pincode.trim() })
}

LocationZoneSchema.statics.findByDistrict = function (district: string) {
  return this.findOne({ isActive: true, districts: district.trim().toLowerCase() })
}

LocationZoneSchema.statics.findByCity = function (city: string) {
  return this.findOne({ isActive: true, cities: city.trim().toLowerCase() })
}

// ── Model ─────────────────────────────────────────────────────────────────────

const LocationZone: LocationZoneModel =
  (models.LocationZone as LocationZoneModel) ??
  model<LocationZoneDocument, LocationZoneModel>('LocationZone', LocationZoneSchema)

export default LocationZone
