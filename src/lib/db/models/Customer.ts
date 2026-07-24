import { Schema, model, models, type Model, type Types } from 'mongoose'

// ─── Customer ─────────────────────────────────────────────────────────────────
// Auto-populated when an enquiry's leadStage first crosses into a converted
// stage (see LEAD_STAGE_CONVERTED). Deduplicated by phone number — a customer
// accumulates one purchaseHistory entry per converted enquiry, not per stage
// change (see Enquiry.convertedAt, which guards against double-counting).

export interface IPurchaseHistoryEntry {
  enquiryId:     Types.ObjectId
  product:       string
  category:      string
  distributorId?: Types.ObjectId | null
  dealerId?:      Types.ObjectId | null
  dealValue?:    number | null
  businessCategory?:    string | null
  businessSubCategory?: string | null
  convertedAt:   Date
}

export interface ICustomer {
  _id:               Types.ObjectId
  name:              string
  phone:             string          // dedup key
  email?:            string
  address?:          string
  city?:             string
  district?:         string
  // Latest known servicing relationship — "who should follow up next"
  territory?:        string
  distributorId?:    Types.ObjectId | null
  dealerId?:         Types.ObjectId | null
  productCategories: string[]        // union across all purchases
  businessCategories: string[]       // union of business_category codes across all purchases
  totalPurchases:    number
  totalRevenue:      number          // sum of purchaseHistory[].dealValue
  firstConvertedAt:  Date
  lastPurchaseAt:    Date
  purchaseHistory:   IPurchaseHistoryEntry[]
  createdAt:         Date
  updatedAt:         Date
}

export type CustomerDocument = ICustomer

const PurchaseHistoryEntrySchema = new Schema<IPurchaseHistoryEntry>(
  {
    enquiryId:     { type: Schema.Types.ObjectId, ref: 'Enquiry', required: true },
    product:       { type: String, required: true, trim: true },
    category:      { type: String, required: true, trim: true },
    distributorId: { type: Schema.Types.ObjectId, ref: 'Distributor', default: null },
    dealerId:      { type: Schema.Types.ObjectId, ref: 'Dealer',       default: null },
    dealValue:     { type: Number, min: 0, default: null },
    businessCategory:    { type: String, trim: true, default: null },
    businessSubCategory: { type: String, trim: true, default: null },
    convertedAt:   { type: Date, required: true },
  },
  { _id: false }
)

const CustomerSchema = new Schema<CustomerDocument>(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    phone: {
      type:     String,
      required: [true, 'Phone number is required'],
      unique:   true,
      trim:     true,
      match:    [/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format'],
    },
    email: {
      type:      String,
      lowercase: true,
      trim:      true,
      match:     [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    address:  { type: String, trim: true, maxlength: 300 },
    city:     { type: String, trim: true, maxlength: 100 },
    district: { type: String, trim: true, maxlength: 100 },

    territory:     { type: String, trim: true },
    distributorId: { type: Schema.Types.ObjectId, ref: 'Distributor', default: null },
    dealerId:      { type: Schema.Types.ObjectId, ref: 'Dealer',       default: null },

    productCategories:  { type: [String], default: [] },
    businessCategories: { type: [String], default: [] },
    totalPurchases:    { type: Number, default: 0, min: 0 },
    totalRevenue:      { type: Number, default: 0, min: 0 },
    firstConvertedAt:  { type: Date, required: true },
    lastPurchaseAt:    { type: Date, required: true },
    purchaseHistory:   { type: [PurchaseHistoryEntrySchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
)

// ─── Indexes ──────────────────────────────────────────────────────────────────

CustomerSchema.index({ phone: 1 }, { unique: true })
CustomerSchema.index({ name: 1 })
CustomerSchema.index({ distributorId: 1 })
CustomerSchema.index({ dealerId: 1 })
CustomerSchema.index({ district: 1, city: 1 })
CustomerSchema.index({ lastPurchaseAt: -1 })
CustomerSchema.index({ totalPurchases: -1 })

// ─── Model ────────────────────────────────────────────────────────────────────

const Customer: Model<CustomerDocument> =
  models.Customer ?? model<CustomerDocument>('Customer', CustomerSchema)

export default Customer
