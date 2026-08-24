/**
 * Assign a district/taluk coverage area to the dummy staff users so the
 * "Assign Staff" zone-match badge and district/taluk auto-assignment have
 * real data to work with.
 * npx tsx scripts/seed-staff-districts.ts
 */
import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import User from '../src/lib/db/models/User'

const COVERAGE: { email: string; districts: string[] }[] = [
  { email: 'charlie@enquirypro.com', districts: ['Chennai'] },
  { email: 'diana@enquirypro.com',   districts: ['Chennai'] },
  { email: 'edward@enquirypro.com',  districts: ['Chennai'] },
  { email: 'fiona@enquirypro.com',   districts: ['Coimbatore'] },
  { email: 'george@enquirypro.com',  districts: ['Coimbatore'] },
  { email: 'hannah@enquirypro.com',  districts: ['Bengaluru Urban'] },
  { email: 'ivan@enquirypro.com',    districts: ['Ernakulam'] },
  { email: 'jane@enquirypro.com',    districts: ['Madurai'] },
  { email: 'karl@enquirypro.com',    districts: ['Hyderabad'] },
]

async function main() {
  await dbConnect()
  console.log('🌍 Assigning staff coverage areas…')

  for (const c of COVERAGE) {
    const res = await User.findOneAndUpdate(
      { email: c.email },
      { $set: { assignedDistricts: c.districts, assignedTaluks: [] } },
      { new: true }
    )
    if (res) {
      console.log(`✅ ${res.name.padEnd(16)} → ${c.districts.join(', ')}`)
    } else {
      console.log(`⚠️  No user found for ${c.email} — skipped`)
    }
  }

  await dbDisconnect()
  console.log('🌍 Done')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
