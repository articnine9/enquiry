/**
 * Seeds the Business Category Classification master data (Poultry / HoReCa /
 * Export and their sub-categories). Idempotent — safe to re-run, skips rows
 * that already exist by (type, code).
 * npx tsx scripts/seed-business-categories.ts
 */
import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import MasterData from '../src/lib/db/models/MasterData'

const CATEGORIES = [
  { code: 'poultry', label: 'Poultry', sortOrder: 1 },
  { code: 'horeca',  label: 'HoReCa',  sortOrder: 2 },
  { code: 'export',  label: 'Export',  sortOrder: 3 },
]

const SUBCATEGORIES = [
  { code: 'brooder_charcoal',   label: 'Brooder Charcoal',   parentCode: 'poultry', sortOrder: 1 },
  { code: 'brooders',           label: 'Brooders',           parentCode: 'poultry', sortOrder: 2 },
  { code: 'organic_fertilizer', label: 'Organic Fertilizer', parentCode: 'poultry', sortOrder: 3 },

  { code: 'hotels',      label: 'Hotels',      parentCode: 'horeca', sortOrder: 1 },
  { code: 'restaurants', label: 'Restaurants', parentCode: 'horeca', sortOrder: 2 },
  { code: 'resorts',     label: 'Resorts',     parentCode: 'horeca', sortOrder: 3 },
  { code: 'bbq_outlets', label: 'BBQ Outlets', parentCode: 'horeca', sortOrder: 4 },

  { code: 'export_buyers',      label: 'Export Buyers', parentCode: 'export', sortOrder: 1 },
  { code: 'traders',            label: 'Traders',       parentCode: 'export', sortOrder: 2 },
  { code: 'importers',          label: 'Importers',     parentCode: 'export', sortOrder: 3 },
  { code: 'export_distributors',label: 'Distributors',  parentCode: 'export', sortOrder: 4 },
]

async function main() {
  await dbConnect()
  console.log('🔧 Seeding business category classification…')

  let created = 0, skipped = 0

  for (const c of CATEGORIES) {
    const exists = await MasterData.findOne({ type: 'business_category', code: c.code })
    if (exists) { skipped++; continue }
    await MasterData.create({ type: 'business_category', isSystem: true, isActive: true, ...c })
    created++
  }

  for (const s of SUBCATEGORIES) {
    const exists = await MasterData.findOne({ type: 'business_subcategory', code: s.code })
    if (exists) { skipped++; continue }
    await MasterData.create({ type: 'business_subcategory', isSystem: true, isActive: true, ...s })
    created++
  }

  console.log(`✅ Created ${created} rows (${skipped} already existed)`)
  await dbDisconnect()
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
