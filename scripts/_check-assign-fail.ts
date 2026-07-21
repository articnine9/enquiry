import 'dotenv/config'
import { dbConnect, dbDisconnect } from '../src/lib/db/connection'
import Enquiry from '../src/lib/db/models/Enquiry'
import Assignment from '../src/lib/db/models/Assignment'
import { resolveStaffByArea } from '../src/features/assignments/services/zone-matcher.service'

async function main() {
  await dbConnect()

  const doc = await Enquiry.findOne({ enquiryNo: 'ENQ-26-00013' }).lean()
  console.log('enquiry.assignedTo:', doc?.assignedTo)
  console.log('enquiry.status:', doc?.status)
  console.log('enquiry.district/city:', doc?.district, '/', doc?.city)

  const assignments = await Assignment.find({ enquiryId: doc?._id }).lean()
  console.log('assignment records:', assignments.length, JSON.stringify(assignments, null, 2))

  console.log('\n--- Direct resolveStaffByArea test ---')
  const result = await resolveStaffByArea({ district: doc?.district, city: doc?.city })
  console.log('resolveStaffByArea result:', result)

  await dbDisconnect()
}
main().catch((e) => { console.error('ERROR:', e); process.exit(1) })
