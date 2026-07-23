/**
 * Backfill leadStage on enquiries created before this field existed.
 * Best-effort mapping from the operational `status` field — the two are
 * independent axes going forward, so this is a reasonable starting point for
 * existing data, not a strict rule. New enquiries get `leadStage: 'new_lead'`
 * automatically via the schema default; this script only touches existing docs.
 * npx tsx scripts/backfill-lead-stage.ts
 */
import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import Enquiry from '../src/lib/db/models/Enquiry'
import { EnquiryStatus, LeadStage } from '../src/types/enums'

const STATUS_TO_STAGE: Record<EnquiryStatus, LeadStage> = {
  [EnquiryStatus.New]:        LeadStage.NewLead,
  [EnquiryStatus.Assigned]:   LeadStage.Assigned,
  [EnquiryStatus.InProgress]: LeadStage.Contacted,
  [EnquiryStatus.Paused]:     LeadStage.Contacted,
  [EnquiryStatus.FollowUp]:   LeadStage.Interested,
  [EnquiryStatus.Resolved]:   LeadStage.OrderConfirmed,
  [EnquiryStatus.Closed]:     LeadStage.Delivered,
  [EnquiryStatus.Cancelled]:  LeadStage.Lost,
}

async function main() {
  await dbConnect()
  console.log('🔧 Backfilling leadStage from status…')

  const targets = await Enquiry.find({ leadStage: { $exists: false } }).select('status').lean()
  console.log(`Found ${targets.length} enquiries missing leadStage`)

  let updated = 0
  for (const [status, stage] of Object.entries(STATUS_TO_STAGE)) {
    const result = await Enquiry.updateMany(
      { leadStage: { $exists: false }, status },
      { $set: { leadStage: stage } }
    )
    if (result.modifiedCount > 0) {
      console.log(`  ${status} → ${stage}: ${result.modifiedCount}`)
      updated += result.modifiedCount
    }
  }

  // Catch-all: any enquiry with a status value outside the current EnquiryStatus
  // enum (legacy/pre-migration data) falls back to the default starting stage.
  const fallback = await Enquiry.updateMany(
    { leadStage: { $exists: false } },
    { $set: { leadStage: LeadStage.NewLead } }
  )
  if (fallback.modifiedCount > 0) {
    console.log(`  (legacy/unrecognised status) → new_lead: ${fallback.modifiedCount}`)
    updated += fallback.modifiedCount
  }

  console.log(`✅ Backfilled ${updated} enquiries`)
  await dbDisconnect()
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
