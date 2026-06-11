/**
 * Reset zones — drops all existing LocationZone documents and inserts
 * the 4 standard zones. Run with:
 *   npx tsx scripts/reset-zones.ts
 */
import mongoose from 'mongoose'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const ZoneSchema = new mongoose.Schema(
  {
    name:        String,
    code:        String,
    description: String,
    isActive:    { type: Boolean, default: true },
    pincodes:    [String],
    cities:      [String],
    states:      [String],
  },
  { timestamps: true }
)

const Zone =
  mongoose.models.LocationZone ||
  mongoose.model('LocationZone', ZoneSchema)

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set in .env.local')

  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')

  const deleted = await Zone.deleteMany({})
  console.log(`🗑  Removed ${deleted.deletedCount} existing zone(s)`)

  const zones = await Zone.insertMany([
    {
      name:        'North Zone',
      code:        'NORTH',
      description: 'Northern region',
      cities:      ['Manchester', 'Leeds', 'Sheffield'],
      pincodes:    ['M1', 'LS1', 'S1'],
      states:      ['Greater Manchester', 'West Yorkshire', 'South Yorkshire'],
      isActive:    true,
    },
    {
      name:        'South Zone',
      code:        'SOUTH',
      description: 'Southern region',
      cities:      ['London', 'Brighton', 'Southampton'],
      pincodes:    ['SE1', 'BN1', 'SO1'],
      states:      ['Greater London', 'East Sussex', 'Hampshire'],
      isActive:    true,
    },
    {
      name:        'East Zone',
      code:        'EAST',
      description: 'Eastern region',
      cities:      ['Norwich', 'Ipswich', 'Cambridge'],
      pincodes:    ['NR1', 'IP1', 'CB1'],
      states:      ['Norfolk', 'Suffolk', 'Cambridgeshire'],
      isActive:    true,
    },
    {
      name:        'West Zone',
      code:        'WEST',
      description: 'Western region',
      cities:      ['Bristol', 'Cardiff', 'Exeter'],
      pincodes:    ['BS1', 'CF1', 'EX1'],
      states:      ['Bristol', 'South Wales', 'Devon'],
      isActive:    true,
    },
  ])

  console.log(`✅ Inserted ${zones.length} zones:`)
  zones.forEach((z) => console.log(`   • ${z.name} (${z.code})`))

  await mongoose.disconnect()
  console.log('✅ Done')
}

main().catch((err) => { console.error(err); process.exit(1) })
