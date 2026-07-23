/**
 * Retroactively populate the Customer database from enquiries whose leadStage
 * already reached a converted stage (Order Confirmed / Delivered / Repeat
 * Customer), before the Customer model existed. Idempotent — safe to re-run:
 * skips any enquiry that already has convertedAt set.
 * npx tsx scripts/backfill-customers.ts
 */
import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import Enquiry from '../src/lib/db/models/Enquiry'
import { convertEnquiryToCustomer } from '../src/features/customers/services/customer-conversion.service'
import { LEAD_STAGE_CONVERTED } from '../src/types/enums'

async function main() {
  await dbConnect()
  console.log('🔧 Backfilling customers from already-converted enquiries…')

  const targets = await Enquiry.find({
    leadStage:   { $in: LEAD_STAGE_CONVERTED },
    convertedAt: { $exists: false },
  })
    .select('enquiryNo customerName phone email address city district product category distributorId dealerId createdAt')
    .sort({ createdAt: 1 }) // chronological, so purchase history and firstConvertedAt build up correctly
    .lean()

  console.log(`Found ${targets.length} converted enquiries not yet in the Customer database`)

  // Sequential, not parallel — two enquiries from the same phone processed
  // concurrently could both miss the existing customer and violate the
  // unique index.
  let created = 0
  let skipped = 0
  for (const enquiry of targets) {
    // Legacy/incomplete records (missing phone or product) can't be safely
    // converted — fabricating contact info risks creating bogus or colliding
    // customer records. Skip and flag rather than guess.
    if (!enquiry.phone || !enquiry.product) {
      console.warn(`  ⚠ skipped ${enquiry.enquiryNo ?? enquiry._id} — missing ${!enquiry.phone ? 'phone' : 'product'}`)
      skipped++
      continue
    }
    await convertEnquiryToCustomer(enquiry, new Date(enquiry.createdAt))
    await Enquiry.findByIdAndUpdate(enquiry._id, { $set: { convertedAt: enquiry.createdAt } })
    created++
  }

  console.log(`✅ Processed ${created} enquiries into the Customer database${skipped ? ` (${skipped} skipped — incomplete legacy data)` : ''}`)
  await dbDisconnect()
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
