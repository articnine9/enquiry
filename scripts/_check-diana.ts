import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import User from '../src/lib/db/models/User'

async function main() {
  await dbConnect()
  const chennaiStaff = await User.find({ district: /^chennai$/i }).lean()
  console.log(JSON.stringify(chennaiStaff.map(s => ({
    name: s.name, role: s.role, status: s.status, isAvailable: s.isAvailable,
    currentLoad: s.currentLoad, maxLoad: s.maxLoad, district: s.district, city: s.city,
  })), null, 2))
  await dbDisconnect()
}
main()
