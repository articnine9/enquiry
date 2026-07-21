/**
 * Backfill isAvailable/currentLoad/maxLoad on User documents created before
 * these fields existed on the schema (MongoDB doesn't retroactively apply new
 * schema defaults to existing documents). Without these fields, auto-assignment
 * queries (which require isAvailable: true and currentLoad < maxLoad) silently
 * match nothing for affected staff.
 * npx tsx scripts/backfill-staff-workload-fields.ts
 */
import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import User from '../src/lib/db/models/User'

async function main() {
  await dbConnect()
  console.log('🔧 Backfilling missing workload fields…')

  // Each field is set independently — a doc missing only one of the three
  // never has its other, already-correct fields overwritten.
  const r1 = await User.updateMany({ isAvailable: { $exists: false } }, { $set: { isAvailable: true } })
  const r2 = await User.updateMany({ currentLoad: { $exists: false } }, { $set: { currentLoad: 0 } })
  const r3 = await User.updateMany({ maxLoad:     { $exists: false } }, { $set: { maxLoad: 15 } })

  console.log(`✅ isAvailable backfilled: ${r1.modifiedCount}`)
  console.log(`✅ currentLoad backfilled: ${r2.modifiedCount}`)
  console.log(`✅ maxLoad backfilled:     ${r3.modifiedCount}`)
  await dbDisconnect()
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
