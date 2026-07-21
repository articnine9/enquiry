/**
 * Assign a district/city coverage area to the dummy staff users so the
 * "Assign Staff" zone-match badge and district/city auto-assignment have
 * real data to work with.
 * npx tsx scripts/seed-staff-districts.ts
 */
import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import User from '../src/lib/db/models/User'

const COVERAGE: { email: string; district: string; city: string }[] = [
  { email: 'charlie@enquirypro.com', district: 'Chennai',         city: 'Chennai' },
  { email: 'diana@enquirypro.com',   district: 'Chennai',         city: 'Adyar' },
  { email: 'edward@enquirypro.com',  district: 'Chennai',         city: 'T. Nagar' },
  { email: 'fiona@enquirypro.com',   district: 'Coimbatore',      city: 'Coimbatore' },
  { email: 'george@enquirypro.com',  district: 'Coimbatore',      city: 'Pollachi' },
  { email: 'hannah@enquirypro.com',  district: 'Bengaluru Urban', city: 'Bengaluru' },
  { email: 'ivan@enquirypro.com',    district: 'Ernakulam',       city: 'Kochi' },
  { email: 'jane@enquirypro.com',    district: 'Madurai',         city: 'Madurai' },
  { email: 'karl@enquirypro.com',    district: 'Hyderabad',       city: 'Hyderabad' },
]

async function main() {
  await dbConnect()
  console.log('🌍 Assigning staff coverage areas…')

  for (const c of COVERAGE) {
    const res = await User.findOneAndUpdate(
      { email: c.email },
      { $set: { district: c.district, city: c.city } },
      { new: true }
    )
    if (res) {
      console.log(`✅ ${res.name.padEnd(16)} → ${c.district} / ${c.city}`)
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
