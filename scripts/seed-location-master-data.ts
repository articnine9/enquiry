/**
 * One-time migration: moves the static South India state/district/city
 * dataset (src/lib/data/southIndiaDistricts.ts) + its curated pincode map
 * into MasterData rows (types: state, district, city, pincode), so they
 * become admin-editable via Settings › Master Data.
 *
 * Idempotent — safe to re-run (upserts on {type, code}).
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import MasterData from '../src/lib/db/models/MasterData'
import { SOUTH_INDIA_DISTRICTS, getKnownPincode } from '../src/lib/data/southIndiaDistricts'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'x'
}

/** Returns a code unique within `used`, disambiguating collisions with a suffix. */
function uniqueCode(base: string, used: Set<string>, suffix?: string): string {
  let code = base
  if (used.has(code) && suffix) code = `${base}_${suffix}`.slice(0, 40)
  let n = 2
  while (used.has(code)) {
    code = `${base}_${n}`.slice(0, 40)
    n++
  }
  used.add(code)
  return code
}

async function main() {
  await dbConnect()

  type Op = { updateOne: { filter: { type: string; code: string }; update: { $setOnInsert: Record<string, unknown> }; upsert: true } }
  const ops: Op[] = []

  const stateCodes = new Set<string>()
  const districtCodes = new Set<string>()
  const cityCodes = new Set<string>()
  const pincodeCodes = new Set<string>()

  const stateCodeByName = new Map<string, string>()
  const districtCodeByName = new Map<string, string>() // district name -> code
  const cityCodeByDistrictAndName = new Map<string, string>() // `${district}|${city}` -> code

  let stateOrder = 0
  for (const state of [...new Set(SOUTH_INDIA_DISTRICTS.map((d) => d.state))]) {
    const code = uniqueCode(slugify(state), stateCodes)
    stateCodeByName.set(state, code)
    ops.push({
      updateOne: {
        filter: { type: 'state', code },
        update: { $setOnInsert: { type: 'state', code, label: state, sortOrder: stateOrder++, isActive: true, isSystem: false } },
        upsert: true,
      },
    })
  }

  let districtOrder = 0
  for (const d of SOUTH_INDIA_DISTRICTS) {
    const parentCode = stateCodeByName.get(d.state)!
    const code = uniqueCode(slugify(d.district), districtCodes, parentCode)
    districtCodeByName.set(d.district, code)
    ops.push({
      updateOne: {
        filter: { type: 'district', code },
        update: { $setOnInsert: { type: 'district', code, label: d.district, parentCode, sortOrder: districtOrder++, isActive: true, isSystem: false } },
        upsert: true,
      },
    })
  }

  let cityOrder = 0
  for (const d of SOUTH_INDIA_DISTRICTS) {
    const parentCode = districtCodeByName.get(d.district)!
    for (const city of d.cities) {
      const code = uniqueCode(slugify(city), cityCodes, parentCode)
      cityCodeByDistrictAndName.set(`${d.district}|${city}`, code)
      ops.push({
        updateOne: {
          filter: { type: 'city', code },
          update: { $setOnInsert: { type: 'city', code, label: city, parentCode, sortOrder: cityOrder++, isActive: true, isSystem: false } },
          upsert: true,
        },
      })
    }
  }

  let pincodeOrder = 0
  for (const d of SOUTH_INDIA_DISTRICTS) {
    for (const city of d.cities) {
      const known = getKnownPincode(d.district, city)
      if (!known) continue
      const parentCode = cityCodeByDistrictAndName.get(`${d.district}|${city}`)!
      const code = uniqueCode(known, pincodeCodes)
      ops.push({
        updateOne: {
          filter: { type: 'pincode', code },
          update: { $setOnInsert: { type: 'pincode', code, label: known, parentCode, sortOrder: pincodeOrder++, isActive: true, isSystem: false } },
          upsert: true,
        },
      })
    }
  }

  console.log(`Seeding ${ops.length} MasterData rows (states=${stateCodes.size}, districts=${districtCodes.size}, cities=${cityCodes.size}, pincodes=${pincodeCodes.size})…`)

  const result = await MasterData.bulkWrite(ops as never, { ordered: false })
  console.log('upserted:', result.upsertedCount, 'matched:', result.matchedCount)

  await dbDisconnect()
}
main().catch((e) => { console.error('ERROR:', e); process.exit(1) })
