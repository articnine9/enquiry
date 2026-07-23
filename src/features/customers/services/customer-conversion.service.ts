import dbConnect from '@/lib/db/connection'
import Customer from '@/lib/db/models/Customer'
import Distributor from '@/lib/db/models/Distributor'
import type { Types } from 'mongoose'

export interface ConvertibleEnquiry {
  _id:            Types.ObjectId | string
  customerName:   string
  phone:          string
  email?:         string
  address:        string
  city:           string
  district:       string
  product:        string
  category:       string
  distributorId?: Types.ObjectId | string | null
  dealerId?:      Types.ObjectId | string | null
  dealValue?:     number | null
}

/**
 * Upsert the Customer record for a newly-converted enquiry. Deduplicated by
 * phone — a repeat customer gets a new purchaseHistory entry appended and
 * their latest contact/territory info refreshed; a first-time customer gets
 * a new record. Call this exactly once per enquiry (guarded by
 * Enquiry.convertedAt at the call site) — calling it twice for the same
 * enquiry would double-count the purchase.
 */
export async function convertEnquiryToCustomer(
  enquiry: ConvertibleEnquiry,
  convertedAt: Date = new Date()
): Promise<void> {
  await dbConnect()

  const distributorId = enquiry.distributorId ?? null
  const dealerId       = enquiry.dealerId ?? null

  const territory = distributorId
    ? (await Distributor.findById(distributorId).select('territory').lean())?.territory
    : undefined

  const dealValue = enquiry.dealValue ?? null

  const purchaseEntry = {
    enquiryId:    enquiry._id,
    product:      enquiry.product,
    category:     enquiry.category,
    distributorId,
    dealerId,
    dealValue,
    convertedAt,
  }

  const existing = await Customer.findOne({ phone: enquiry.phone })

  if (existing) {
    const categories = new Set(existing.productCategories)
    categories.add(enquiry.category)

    await Customer.findByIdAndUpdate(existing._id, {
      $push: { purchaseHistory: purchaseEntry },
      $inc:  { totalPurchases: 1, totalRevenue: dealValue ?? 0 },
      $set: {
        name:              enquiry.customerName,
        email:             enquiry.email || existing.email,
        address:           enquiry.address,
        city:              enquiry.city,
        district:          enquiry.district,
        territory:         territory ?? existing.territory,
        distributorId:     distributorId ?? existing.distributorId,
        dealerId:          dealerId ?? existing.dealerId,
        productCategories: [...categories],
        lastPurchaseAt:    convertedAt,
      },
    })
    return
  }

  await Customer.create({
    name:              enquiry.customerName,
    phone:             enquiry.phone,
    email:             enquiry.email || undefined,
    address:           enquiry.address,
    city:              enquiry.city,
    district:          enquiry.district,
    territory:         territory ?? undefined,
    distributorId,
    dealerId,
    productCategories: [enquiry.category],
    totalPurchases:    1,
    totalRevenue:      dealValue ?? 0,
    firstConvertedAt:  convertedAt,
    lastPurchaseAt:    convertedAt,
    purchaseHistory:   [purchaseEntry],
  })
}
