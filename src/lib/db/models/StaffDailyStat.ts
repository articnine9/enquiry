import { Schema, model, models, type Model, type Document, type Types } from 'mongoose'

// ── Interface ─────────────────────────────────────────────────────────────────

export interface IStaffDailyStat {
  _id:            Types.ObjectId
  staffId:        Types.ObjectId
  date:           Date    // normalised to 00:00:00 UTC

  // ── Session ────────────────────────────────────────────────────────────────
  loginCount:        number
  totalOnlineMinutes: number
  firstLoginAt:      Date | null
  lastLogoutAt:      Date | null

  // ── Enquiry activity ───────────────────────────────────────────────────────
  enquiriesAssigned:  number
  enquiriesResolved:  number
  enquiriesCreated:   number
  statusChanges:      number
  priorityChanges:    number

  // ── Communication ──────────────────────────────────────────────────────────
  callsMade:          number
  callsReceived:      number

  // ── Follow-ups ─────────────────────────────────────────────────────────────
  followUpsCreated:   number
  followUpsCompleted: number
  followUpsMissed:    number

  // ── Notes ──────────────────────────────────────────────────────────────────
  notesAdded:         number

  // ── Computed ───────────────────────────────────────────────────────────────
  productivityScore:  number   // 0–100
  lastComputedAt:     Date

  createdAt:  Date
  updatedAt:  Date
}

export type StaffDailyStatDocument = IStaffDailyStat & Document

// ── Score formula ─────────────────────────────────────────────────────────────
// Exported so UI and tests can use the same weights.

export const SCORE_WEIGHTS = {
  enquiriesResolved:  10,
  callsMade:           3,
  callsReceived:       1,
  followUpsCompleted:  5,
  notesAdded:          2,
  statusChanges:       1,
  fullDayBonus:       10,   // granted if totalOnlineMinutes >= 360
} as const

export function computeProductivityScore(stat: Partial<IStaffDailyStat>): number {
  const raw =
    (stat.enquiriesResolved  ?? 0) * SCORE_WEIGHTS.enquiriesResolved +
    (stat.callsMade          ?? 0) * SCORE_WEIGHTS.callsMade          +
    (stat.callsReceived      ?? 0) * SCORE_WEIGHTS.callsReceived      +
    (stat.followUpsCompleted ?? 0) * SCORE_WEIGHTS.followUpsCompleted +
    (stat.notesAdded         ?? 0) * SCORE_WEIGHTS.notesAdded         +
    (stat.statusChanges      ?? 0) * SCORE_WEIGHTS.statusChanges      +
    ((stat.totalOnlineMinutes ?? 0) >= 360 ? SCORE_WEIGHTS.fullDayBonus : 0)

  return Math.min(100, raw)
}

// ── Schema ────────────────────────────────────────────────────────────────────

const counter = (defaultVal = 0) => ({ type: Number, default: defaultVal, min: 0 })

const StaffDailyStatSchema = new Schema<StaffDailyStatDocument>(
  {
    staffId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    date: {
      type:     Date,
      required: true,
    },

    // Session
    loginCount:         counter(),
    totalOnlineMinutes: counter(),
    firstLoginAt:  { type: Date, default: null },
    lastLogoutAt:  { type: Date, default: null },

    // Enquiry activity
    enquiriesAssigned:  counter(),
    enquiriesResolved:  counter(),
    enquiriesCreated:   counter(),
    statusChanges:      counter(),
    priorityChanges:    counter(),

    // Communication
    callsMade:     counter(),
    callsReceived: counter(),

    // Follow-ups
    followUpsCreated:   counter(),
    followUpsCompleted: counter(),
    followUpsMissed:    counter(),

    // Notes
    notesAdded: counter(),

    // Computed
    productivityScore: { type: Number, default: 0, min: 0, max: 100 },
    lastComputedAt:    { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ── Indexes ───────────────────────────────────────────────────────────────────

// One document per staff per day
StaffDailyStatSchema.index({ staffId: 1, date: 1 }, { unique: true })
// Dashboard queries
StaffDailyStatSchema.index({ date: -1, productivityScore: -1 })
// Leaderboard
StaffDailyStatSchema.index({ productivityScore: -1, date: -1 })

// ── Auto-recompute score before save ─────────────────────────────────────────

StaffDailyStatSchema.pre('save', function (next) {
  this.productivityScore = computeProductivityScore(this)
  this.lastComputedAt    = new Date()
  next()
})

// ── Statics ───────────────────────────────────────────────────────────────────

interface StaffDailyStatModel extends Model<StaffDailyStatDocument> {
  upsertForDay(
    staffId: string,
    date:    Date,
    inc:     Partial<Omit<IStaffDailyStat, '_id' | 'staffId' | 'date' | 'productivityScore' | 'lastComputedAt' | 'createdAt' | 'updatedAt'>>
  ): Promise<StaffDailyStatDocument>
  getForRange(staffId: string, from: Date, to: Date): Promise<StaffDailyStatDocument[]>
}

StaffDailyStatSchema.statics.upsertForDay = async function (
  staffId: string,
  date:    Date,
  inc:     Record<string, number>
) {
  const dayStart = startOfDay(date)

  // $inc all counters, $min firstLoginAt if provided, $max lastLogoutAt if provided
  const setFields: Record<string, unknown> = { lastComputedAt: new Date() }
  const incFields: Record<string, number>  = {}

  for (const [key, val] of Object.entries(inc)) {
    if (typeof val === 'number') incFields[key] = val
  }

  return this.findOneAndUpdate(
    { staffId, date: dayStart },
    {
      $setOnInsert: { staffId, date: dayStart },
      $inc:  incFields,
      $set:  setFields,
    },
    { upsert: true, new: true, runValidators: false }
  )
}

StaffDailyStatSchema.statics.getForRange = function (staffId: string, from: Date, to: Date) {
  return this.find({
    staffId,
    date: { $gte: startOfDay(from), $lte: startOfDay(to) },
  }).sort({ date: 1 }).lean()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setUTCHours(0, 0, 0, 0)
  return out
}

// ── Model ─────────────────────────────────────────────────────────────────────

const StaffDailyStat: StaffDailyStatModel =
  (models.StaffDailyStat as StaffDailyStatModel) ??
  model<StaffDailyStatDocument, StaffDailyStatModel>('StaffDailyStat', StaffDailyStatSchema)

export default StaffDailyStat
export { startOfDay }
