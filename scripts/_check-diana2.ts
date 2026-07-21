import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import User from '../src/lib/db/models/User'

async function main() {
  await dbConnect()
  const diana = await User.findOne({ name: 'Diana Staff' }).lean()
  console.log('full raw doc:', JSON.stringify(diana, null, 2))

  // Test the exact query resolveStaffByArea builds
  const q1 = await User.findOne({
    role: 'staff', status: 'active', isAvailable: true,
    $expr: { $lt: ['$currentLoad', '$maxLoad'] },
    district: /^chennai$/i,
  }).lean()
  console.log('\nquery WITH isAvailable+$expr filter:', q1 ? q1.name : 'NO MATCH')

  const q2 = await User.findOne({ role: 'staff', status: 'active', district: /^chennai$/i }).lean()
  console.log('query WITHOUT isAvailable+$expr filter:', q2 ? q2.name : 'NO MATCH')

  await dbDisconnect()
}
main()
