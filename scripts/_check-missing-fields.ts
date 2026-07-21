import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import User from '../src/lib/db/models/User'

async function main() {
  await dbConnect()
  const staff = await User.find({ role: 'staff' }).lean()
  console.log(staff.map(s => ({
    name: s.name,
    status: s.status,
    hasIsAvailable: s.isAvailable !== undefined,
    hasCurrentLoad: s.currentLoad !== undefined,
    hasMaxLoad: s.maxLoad !== undefined,
  })))
  await dbDisconnect()
}
main()
