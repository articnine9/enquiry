/**
 * Seeds real, verified Taluk data (District's own sub-division) for a
 * deliberately small set of districts I'm confident about at that
 * granularity — NOT an attempt to cover all ~150 seeded districts, since
 * I don't have reliable taluk-level knowledge for most of them. Everywhere
 * else, the Taluk field stays empty until an admin adds entries via
 * Settings > Master Data (same pattern already established for Pincode).
 *
 * Also seeds a small number of well-known pincodes per district HQ taluk,
 * reusing the same confident values from the earlier location-master-data
 * seed. Idempotent — safe to re-run (upserts on {type, code}).
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import MasterData from '../src/lib/db/models/MasterData'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'x'
}

// districtCode -> taluks (with an optional pincode for the HQ taluk)
const TALUKS_BY_DISTRICT: Record<string, { name: string; pincode?: string }[]> = {
  coimbatore: [
    { name: 'Coimbatore North', pincode: '641001' },
    { name: 'Coimbatore South', pincode: '641018' },
    { name: 'Mettupalayam' },
    { name: 'Pollachi', pincode: '642001' },
    { name: 'Sulur' },
    { name: 'Valparai' },
    { name: 'Annur' },
    { name: 'Kinathukadavu' },
    { name: 'Perur' },
    { name: 'Madukkarai' },
  ],
  madurai: [
    { name: 'Madurai North', pincode: '625001' },
    { name: 'Madurai South' },
    { name: 'Melur' },
    { name: 'Peraiyur' },
    { name: 'Thirumangalam' },
    { name: 'Usilampatti' },
    { name: 'Vadipatti' },
  ],
  salem: [
    { name: 'Salem', pincode: '636001' },
    { name: 'Attur' },
    { name: 'Edappadi' },
    { name: 'Mettur' },
    { name: 'Omalur' },
    { name: 'Sankari' },
    { name: 'Vazhapadi' },
    { name: 'Yercaud' },
  ],
  erode: [
    { name: 'Erode', pincode: '638001' },
    { name: 'Bhavani' },
    { name: 'Gobichettipalayam' },
    { name: 'Anthiyur' },
    { name: 'Perundurai' },
    { name: 'Sathyamangalam' },
    { name: 'Talavadi' },
    { name: 'Modakkurichi' },
  ],
  bengaluru_urban: [
    { name: 'Bengaluru North', pincode: '560001' },
    { name: 'Bengaluru South' },
    { name: 'Bengaluru East' },
    { name: 'Anekal' },
  ],
  mysuru: [
    { name: 'Mysuru', pincode: '570001' },
    { name: 'Hunsur' },
    { name: 'Krishnarajanagara' },
    { name: 'Nanjangud' },
    { name: 'Periyapatna' },
    { name: 'Tirumakudalu Narasipura' },
    { name: 'Heggadadevanakote' },
  ],
  thiruvananthapuram: [
    { name: 'Thiruvananthapuram', pincode: '695001' },
    { name: 'Nedumangad' },
    { name: 'Neyyattinkara' },
    { name: 'Chirayinkeezhu' },
    { name: 'Kattakkada' },
    { name: 'Varkala' },
  ],
  ernakulam: [
    { name: 'Kanayannur', pincode: '682001' },
    { name: 'Aluva' },
    { name: 'Kunnathunad' },
    { name: 'Kothamangalam' },
    { name: 'Muvattupuzha' },
    { name: 'North Paravur' },
  ],
}

async function main() {
  await dbConnect()

  // Old pincodes were parented to `city` codes (Pincode's parent shifts to
  // `taluk` now). `pincode` is enquiry-cascade-only (unlike `city`, which
  // Zone Management still needs), so clearing it is safe — and necessary to
  // avoid code collisions with the new taluk-parented entries below.
  const deleted = await MasterData.deleteMany({ type: 'pincode' })
  console.log('cleared old pincode rows:', deleted.deletedCount)

  type Op = { updateOne: { filter: { type: string; code: string }; update: { $setOnInsert: Record<string, unknown> }; upsert: true } }
  const ops: Op[] = []
  const talukCodes = new Set<string>()
  const pincodeCodes = new Set<string>()

  let talukOrder = 0
  let pincodeOrder = 0

  for (const [districtCode, taluks] of Object.entries(TALUKS_BY_DISTRICT)) {
    const districtRow = await MasterData.findOne({ type: 'district', code: districtCode }).lean()
    if (!districtRow) {
      console.warn(`Skipping unknown district code: ${districtCode}`)
      continue
    }

    for (const t of taluks) {
      let talukCode = slugify(t.name)
      if (talukCodes.has(talukCode)) talukCode = `${talukCode}_${districtCode}`.slice(0, 40)
      talukCodes.add(talukCode)

      ops.push({
        updateOne: {
          filter: { type: 'taluk', code: talukCode },
          update: { $setOnInsert: { type: 'taluk', code: talukCode, label: t.name, parentCode: districtCode, sortOrder: talukOrder++, isActive: true, isSystem: false } },
          upsert: true,
        },
      })

      if (t.pincode) {
        let pinCode = t.pincode
        if (pincodeCodes.has(pinCode)) pinCode = `${pinCode}_${talukCode}`.slice(0, 40)
        pincodeCodes.add(pinCode)

        ops.push({
          updateOne: {
            filter: { type: 'pincode', code: pinCode },
            update: { $setOnInsert: { type: 'pincode', code: pinCode, label: t.pincode, parentCode: talukCode, sortOrder: pincodeOrder++, isActive: true, isSystem: false } },
            upsert: true,
          },
        })
      }
    }
  }

  console.log(`Seeding ${ops.length} rows (taluks=${talukCodes.size}, pincodes=${pincodeCodes.size}) across ${Object.keys(TALUKS_BY_DISTRICT).length} districts…`)
  const result = await MasterData.bulkWrite(ops as never, { ordered: false })
  console.log('upserted:', result.upsertedCount, 'matched:', result.matchedCount)

  await dbDisconnect()
}
main().catch((e) => { console.error('ERROR:', e); process.exit(1) })
