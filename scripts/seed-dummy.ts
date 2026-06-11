/**
 * Seed dummy data for all roles + related records.
 * Usage: npx tsx scripts/seed-dummy.ts
 */
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enquiry'

// ── Inline schemas ────────────────────────────────────────────────────────────

const ZoneSchema = new mongoose.Schema(
  { name: String, code: String, description: String, isActive: { type: Boolean, default: true },
    pincodes: [String], cities: [String], states: [String] },
  { timestamps: true }
)
const Zone = mongoose.models.LocationZone || mongoose.model('LocationZone', ZoneSchema)

const UserSchema = new mongoose.Schema(
  { name: String, email: { type: String, unique: true, lowercase: true },
    passwordHash: String, role: String, status: { type: String, default: 'active' },
    phone: String, locationZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'LocationZone' },
    lastLoginAt: Date },
  { timestamps: true }
)
const User = mongoose.models.User || mongoose.model('User', UserSchema)

const EnquirySchema = new mongoose.Schema(
  { enquiryNo: { type: String, unique: true },
    customerName: String, customerEmail: String, customerPhone: String,
    source: String, category: String, priority: String, status: String,
    subject: String, description: String,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    locationZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'LocationZone' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date, closedAt: Date },
  { timestamps: true }
)
const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', EnquirySchema)

const FollowUpSchema = new mongoose.Schema(
  { enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' },
    type: String, status: String, notes: String,
    scheduledAt: Date, completedAt: Date,
    outcome: String, durationMinutes: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
  { timestamps: true }
)
const FollowUp = mongoose.models.FollowUp || mongoose.model('FollowUp', FollowUpSchema)

const ActivityLogSchema = new mongoose.Schema(
  { actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: String, action: String, entityType: String,
    entityId: mongoose.Schema.Types.ObjectId, description: String, metadata: Object },
  { timestamps: true }
)
const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema)

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number) { return new Date(Date.now() - n * 86_400_000) }
function hoursAgo(n: number) { return new Date(Date.now() - n * 3_600_000) }
function daysFromNow(n: number) { return new Date(Date.now() + n * 86_400_000) }
let enqCounter = 1
function nextEnqNo() { return `ENQ-2025-${String(enqCounter++).padStart(4, '0')}` }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to', MONGODB_URI)

  const hash = (p: string) => bcrypt.hash(p, 10)

  // ── 1. Zones ────────────────────────────────────────────────────────────────
  console.log('\n📍 Seeding zones…')

  const zones = await Zone.insertMany([
    { name: 'North Zone',  code: 'NORTH', description: 'Northern region',  cities: ['Manchester', 'Leeds', 'Sheffield'],  pincodes: ['M1','LS1','S1'],  states: ['Greater Manchester','West Yorkshire','South Yorkshire'] },
    { name: 'South Zone',  code: 'SOUTH', description: 'Southern region',  cities: ['London', 'Brighton', 'Southampton'], pincodes: ['SE1','BN1','SO1'], states: ['Greater London','East Sussex','Hampshire'] },
    { name: 'East Zone',   code: 'EAST',  description: 'Eastern region',   cities: ['Norwich', 'Ipswich', 'Cambridge'],   pincodes: ['NR1','IP1','CB1'], states: ['Norfolk','Suffolk','Cambridgeshire'] },
    { name: 'West Zone',   code: 'WEST',  description: 'Western region',   cities: ['Bristol', 'Cardiff', 'Exeter'],      pincodes: ['BS1','CF1','EX1'], states: ['Bristol','South Wales','Devon'] },
  ])
  console.log(`   ✓ ${zones.length} zones`)

  // ── 2. Users ────────────────────────────────────────────────────────────────
  console.log('👤 Seeding users…')

  const users = await User.insertMany([
    // SuperAdmin
    { name: 'Super Admin',    email: 'admin@enquirypro.com',   passwordHash: await hash('Admin@1234'),   role: 'super_admin', status: 'active' },

    // Managers (one per zone)
    { name: 'Alice Manager',  email: 'alice@enquirypro.com',   passwordHash: await hash('Manager@1234'), role: 'manager', status: 'active', phone: '+44 7700 100001', locationZoneId: zones[0]._id },
    { name: 'Bob Manager',    email: 'bob@enquirypro.com',     passwordHash: await hash('Manager@1234'), role: 'manager', status: 'active', phone: '+44 7700 100002', locationZoneId: zones[1]._id },

    // Staff — North Zone
    { name: 'Charlie Staff',  email: 'charlie@enquirypro.com', passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'active', phone: '+44 7700 200001', locationZoneId: zones[0]._id },
    { name: 'Diana Staff',    email: 'diana@enquirypro.com',   passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'active', phone: '+44 7700 200002', locationZoneId: zones[0]._id },
    { name: 'Edward Staff',   email: 'edward@enquirypro.com',  passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'active', phone: '+44 7700 200003', locationZoneId: zones[0]._id },

    // Staff — South Zone
    { name: 'Fiona Staff',    email: 'fiona@enquirypro.com',   passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'active', phone: '+44 7700 200004', locationZoneId: zones[1]._id },
    { name: 'George Staff',   email: 'george@enquirypro.com',  passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'active', phone: '+44 7700 200005', locationZoneId: zones[1]._id },

    // Staff — East Zone
    { name: 'Hannah Staff',   email: 'hannah@enquirypro.com',  passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'active', phone: '+44 7700 200006', locationZoneId: zones[2]._id },

    // Staff — West Zone
    { name: 'Ivan Staff',     email: 'ivan@enquirypro.com',    passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'active', phone: '+44 7700 200007', locationZoneId: zones[3]._id },

    // Inactive / suspended
    { name: 'Jane Inactive',  email: 'jane@enquirypro.com',    passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'inactive', locationZoneId: zones[0]._id },
    { name: 'Karl Suspended', email: 'karl@enquirypro.com',    passwordHash: await hash('Staff@1234'),   role: 'staff',   status: 'suspended', locationZoneId: zones[1]._id },
  ])

  const [superAdmin, aliceMgr, bobMgr, charlie, diana, edward, fiona, george, hannah, ivan] =
    users as (typeof users[0] & { _id: mongoose.Types.ObjectId })[]

  console.log(`   ✓ ${users.length} users`)

  // ── 3. Enquiries ────────────────────────────────────────────────────────────
  console.log('📋 Seeding enquiries…')

  const sources    = ['website', 'phone', 'email', 'walk_in', 'referral', 'social_media']
  const categories = ['product_info', 'pricing', 'support', 'complaint', 'general', 'partnership']
  const priorities = ['low', 'medium', 'high', 'urgent']

  const enquiries = await Enquiry.insertMany([
    // ── Resolved
    { enquiryNo: nextEnqNo(), customerName: 'Liam Brown',    customerEmail: 'liam@example.com',   customerPhone: '+44 7800 001001', source: 'website',      category: 'pricing',      priority: 'medium', status: 'resolved',   subject: 'Pricing for enterprise plan', description: 'Requesting enterprise pricing details', assignedTo: charlie._id,  locationZoneId: zones[0]._id, createdBy: superAdmin._id, createdAt: daysAgo(30), resolvedAt: daysAgo(25) },
    { enquiryNo: nextEnqNo(), customerName: 'Emma Wilson',   customerEmail: 'emma@example.com',   customerPhone: '+44 7800 001002', source: 'phone',        category: 'support',      priority: 'high',   status: 'resolved',   subject: 'Account login issue',         description: 'Unable to login to account',            assignedTo: diana._id,    locationZoneId: zones[0]._id, createdBy: aliceMgr._id,   createdAt: daysAgo(28), resolvedAt: daysAgo(22) },
    { enquiryNo: nextEnqNo(), customerName: 'Noah Davies',   customerEmail: 'noah@example.com',   customerPhone: '+44 7800 001003', source: 'email',        category: 'complaint',    priority: 'urgent', status: 'resolved',   subject: 'Service disruption complaint',description: 'Experienced service outage for 2 hours', assignedTo: fiona._id,    locationZoneId: zones[1]._id, createdBy: bobMgr._id,     createdAt: daysAgo(25), resolvedAt: daysAgo(18) },
    { enquiryNo: nextEnqNo(), customerName: 'Olivia Taylor', customerEmail: 'olivia@example.com', customerPhone: '+44 7800 001004', source: 'referral',     category: 'product_info', priority: 'low',    status: 'resolved',   subject: 'Product feature enquiry',     description: 'Asking about new features in Q4',       assignedTo: george._id,   locationZoneId: zones[1]._id, createdBy: bobMgr._id,     createdAt: daysAgo(20), resolvedAt: daysAgo(15) },
    { enquiryNo: nextEnqNo(), customerName: 'William Martin',customerEmail: 'will@example.com',   customerPhone: '+44 7800 001005', source: 'social_media', category: 'general',      priority: 'medium', status: 'resolved',   subject: 'General business enquiry',    description: 'Interested in partnership opportunities',assignedTo: hannah._id,   locationZoneId: zones[2]._id, createdBy: superAdmin._id, createdAt: daysAgo(18), resolvedAt: daysAgo(10) },

    // ── Closed
    { enquiryNo: nextEnqNo(), customerName: 'Sophia Jackson',customerEmail: 'sophia@example.com', customerPhone: '+44 7800 002001', source: 'walk_in',      category: 'pricing',      priority: 'low',    status: 'closed',     subject: 'Walk-in pricing request',     description: 'Visited office for pricing',            assignedTo: charlie._id,  locationZoneId: zones[0]._id, createdBy: aliceMgr._id,   createdAt: daysAgo(45), closedAt: daysAgo(40) },
    { enquiryNo: nextEnqNo(), customerName: 'James Harris',  customerEmail: 'james@example.com',  customerPhone: '+44 7800 002002', source: 'website',      category: 'support',      priority: 'medium', status: 'closed',     subject: 'Technical support request',   description: 'Needed help with API integration',      assignedTo: ivan._id,     locationZoneId: zones[3]._id, createdBy: superAdmin._id, createdAt: daysAgo(35), closedAt: daysAgo(30) },

    // ── In Progress
    { enquiryNo: nextEnqNo(), customerName: 'Isabella Clark',customerEmail: 'bella@example.com',  customerPhone: '+44 7800 003001', source: 'email',        category: 'product_info', priority: 'medium', status: 'in_progress',subject: 'Product demo request',        description: 'Requesting a live product demonstration',assignedTo: charlie._id,  locationZoneId: zones[0]._id, createdBy: aliceMgr._id,   createdAt: daysAgo(5) },
    { enquiryNo: nextEnqNo(), customerName: 'Mason Lewis',   customerEmail: 'mason@example.com',  customerPhone: '+44 7800 003002', source: 'phone',        category: 'complaint',    priority: 'high',   status: 'in_progress',subject: 'Billing dispute',             description: 'Charged incorrectly on last invoice',   assignedTo: diana._id,    locationZoneId: zones[0]._id, createdBy: aliceMgr._id,   createdAt: daysAgo(3) },
    { enquiryNo: nextEnqNo(), customerName: 'Ava Robinson',  customerEmail: 'ava@example.com',    customerPhone: '+44 7800 003003', source: 'website',      category: 'partnership',  priority: 'high',   status: 'in_progress',subject: 'Partnership proposal',        description: 'Interested in co-marketing partnership', assignedTo: fiona._id,    locationZoneId: zones[1]._id, createdBy: bobMgr._id,     createdAt: daysAgo(4) },
    { enquiryNo: nextEnqNo(), customerName: 'Ethan Walker',  customerEmail: 'ethan@example.com',  customerPhone: '+44 7800 003004', source: 'referral',     category: 'pricing',      priority: 'urgent', status: 'in_progress',subject: 'Urgent pricing negotiation',  description: 'Large volume discount required ASAP',   assignedTo: george._id,   locationZoneId: zones[1]._id, createdBy: bobMgr._id,     createdAt: daysAgo(1) },
    { enquiryNo: nextEnqNo(), customerName: 'Mia Young',     customerEmail: 'mia@example.com',    customerPhone: '+44 7800 003005', source: 'social_media', category: 'support',      priority: 'medium', status: 'in_progress',subject: 'Instagram support query',     description: 'Reached out via Instagram DM for help', assignedTo: hannah._id,   locationZoneId: zones[2]._id, createdBy: superAdmin._id, createdAt: daysAgo(2) },

    // ── Open (unassigned)
    { enquiryNo: nextEnqNo(), customerName: 'Lucas Hall',    customerEmail: 'lucas@example.com',  customerPhone: '+44 7800 004001', source: 'website',      category: 'general',      priority: 'low',    status: 'open',       subject: 'General question about service',description: 'How does the onboarding process work?', locationZoneId: zones[0]._id, createdBy: superAdmin._id, createdAt: hoursAgo(6) },
    { enquiryNo: nextEnqNo(), customerName: 'Amelia Allen',  customerEmail: 'amelia@example.com', customerPhone: '+44 7800 004002', source: 'phone',        category: 'support',      priority: 'high',   status: 'open',       subject: 'Urgent technical issue',      description: 'System throwing 500 errors on checkout',locationZoneId: zones[1]._id, createdBy: superAdmin._id, createdAt: hoursAgo(2) },
    { enquiryNo: nextEnqNo(), customerName: 'Henry Scott',   customerEmail: 'henry@example.com',  customerPhone: '+44 7800 004003', source: 'email',        category: 'pricing',      priority: 'medium', status: 'open',       subject: 'SME pricing options',         description: 'Looking for pricing suitable for SME',  locationZoneId: zones[2]._id, createdBy: aliceMgr._id,   createdAt: hoursAgo(8) },
    { enquiryNo: nextEnqNo(), customerName: 'Evelyn Green',  customerEmail: 'evelyn@example.com', customerPhone: '+44 7800 004004', source: 'walk_in',      category: 'product_info', priority: 'low',    status: 'open',       subject: 'Walk-in product query',       description: 'Wants to see feature comparison chart',  locationZoneId: zones[3]._id, createdBy: superAdmin._id, createdAt: hoursAgo(1) },

    // ── Assigned (today)
    { enquiryNo: nextEnqNo(), customerName: 'Alexander King',customerEmail: 'alex@example.com',   customerPhone: '+44 7800 005001', source: 'website',      category: 'complaint',    priority: 'urgent', status: 'assigned',   subject: 'Escalated complaint',         description: 'Service has been down for 5 hours',     assignedTo: edward._id,   locationZoneId: zones[0]._id, createdBy: aliceMgr._id,   createdAt: hoursAgo(3) },
    { enquiryNo: nextEnqNo(), customerName: 'Victoria Adams',customerEmail: 'vicky@example.com',  customerPhone: '+44 7800 005002', source: 'referral',     category: 'partnership',  priority: 'high',   status: 'assigned',   subject: 'Reseller partnership',        description: 'Wants to become an authorised reseller', assignedTo: ivan._id,     locationZoneId: zones[3]._id, createdBy: superAdmin._id, createdAt: hoursAgo(5) },
  ])
  console.log(`   ✓ ${enquiries.length} enquiries`)

  // ── 4. Follow-ups ───────────────────────────────────────────────────────────
  console.log('📞 Seeding follow-ups…')

  const inProgressEnqs = enquiries.filter((e) => e.status === 'in_progress')
  const resolvedEnqs   = enquiries.filter((e) => e.status === 'resolved')

  const followUps = await FollowUp.insertMany([
    // Completed follow-ups on resolved enquiries
    { enquiryId: resolvedEnqs[0]._id, type: 'call',  status: 'completed', notes: 'Explained pricing structure, customer happy', scheduledAt: daysAgo(27), completedAt: daysAgo(27), outcome: 'positive',  durationMinutes: 15, createdBy: charlie._id },
    { enquiryId: resolvedEnqs[1]._id, type: 'email', status: 'completed', notes: 'Sent password reset link, issue resolved',    scheduledAt: daysAgo(24), completedAt: daysAgo(24), outcome: 'resolved',  durationMinutes: 5,  createdBy: diana._id  },
    { enquiryId: resolvedEnqs[2]._id, type: 'call',  status: 'completed', notes: 'Apologised and offered 1 month credit',       scheduledAt: daysAgo(20), completedAt: daysAgo(20), outcome: 'positive',  durationMinutes: 25, createdBy: fiona._id  },
    { enquiryId: resolvedEnqs[3]._id, type: 'meeting',status:'completed', notes: 'Conducted product walkthrough via Zoom',       scheduledAt: daysAgo(17), completedAt: daysAgo(17), outcome: 'positive',  durationMinutes: 45, createdBy: george._id },
    { enquiryId: resolvedEnqs[4]._id, type: 'email', status: 'completed', notes: 'Sent partnership deck, awaiting response',     scheduledAt: daysAgo(12), completedAt: daysAgo(12), outcome: 'pending',   durationMinutes: 10, createdBy: hannah._id },

    // Overdue follow-ups
    { enquiryId: inProgressEnqs[0]._id, type: 'call',  status: 'scheduled', notes: 'Scheduled demo call — needs confirmation', scheduledAt: daysAgo(2), createdBy: charlie._id },
    { enquiryId: inProgressEnqs[1]._id, type: 'email', status: 'scheduled', notes: 'Send invoice correction details',           scheduledAt: daysAgo(1), createdBy: diana._id  },

    // Today's follow-ups
    { enquiryId: inProgressEnqs[2]._id, type: 'call',    status: 'scheduled', notes: 'Discuss partnership terms', scheduledAt: new Date(new Date().setHours(10, 0, 0, 0)), createdBy: fiona._id  },
    { enquiryId: inProgressEnqs[3]._id, type: 'meeting', status: 'scheduled', notes: 'Price negotiation meeting',  scheduledAt: new Date(new Date().setHours(14, 0, 0, 0)), createdBy: george._id },
    { enquiryId: inProgressEnqs[4]._id, type: 'email',   status: 'scheduled', notes: 'Send troubleshooting guide', scheduledAt: new Date(new Date().setHours(16, 0, 0, 0)), createdBy: hannah._id },

    // Upcoming
    { enquiryId: inProgressEnqs[0]._id, type: 'call',  status: 'scheduled', notes: 'Post-demo follow-up call',    scheduledAt: daysFromNow(1), createdBy: charlie._id },
    { enquiryId: inProgressEnqs[1]._id, type: 'email', status: 'scheduled', notes: 'Confirm billing correction',  scheduledAt: daysFromNow(2), createdBy: diana._id  },
    { enquiryId: inProgressEnqs[3]._id, type: 'call',  status: 'scheduled', notes: 'Final pricing decision call', scheduledAt: daysFromNow(3), createdBy: george._id },

    // Missed
    { enquiryId: resolvedEnqs[0]._id, type: 'call', status: 'missed', notes: 'Customer did not answer', scheduledAt: daysAgo(26), createdBy: charlie._id },
    { enquiryId: resolvedEnqs[2]._id, type: 'call', status: 'missed', notes: 'No response on first attempt', scheduledAt: daysAgo(22), createdBy: fiona._id },
  ])
  console.log(`   ✓ ${followUps.length} follow-ups`)

  // ── 5. Activity logs ─────────────────────────────────────────────────────────
  console.log('📊 Seeding activity logs…')

  const activityLogs = []
  const staffMembers = [charlie, diana, edward, fiona, george, hannah, ivan]

  for (const staff of staffMembers) {
    activityLogs.push(
      { actorId: staff._id, actorRole: 'staff', action: 'login',           entityType: 'user',    entityId: staff._id,         description: 'User logged in',          metadata: {}, createdAt: daysAgo(1) },
      { actorId: staff._id, actorRole: 'staff', action: 'enquiry_viewed',  entityType: 'enquiry', entityId: enquiries[0]._id,  description: 'Viewed enquiry',          metadata: {}, createdAt: daysAgo(1) },
      { actorId: staff._id, actorRole: 'staff', action: 'follow_up_added', entityType: 'enquiry', entityId: enquiries[0]._id,  description: 'Added follow-up',         metadata: {}, createdAt: daysAgo(1) },
      { actorId: staff._id, actorRole: 'staff', action: 'logout',          entityType: 'user',    entityId: staff._id,         description: 'User logged out',         metadata: {}, createdAt: daysAgo(1) },
    )
  }

  for (const mgr of [aliceMgr, bobMgr]) {
    activityLogs.push(
      { actorId: mgr._id, actorRole: 'manager', action: 'login',           entityType: 'user',    entityId: mgr._id,           description: 'Manager logged in',       metadata: {}, createdAt: daysAgo(1) },
      { actorId: mgr._id, actorRole: 'manager', action: 'enquiry_assigned',entityType: 'enquiry', entityId: enquiries[0]._id,  description: 'Assigned enquiry',        metadata: {}, createdAt: daysAgo(1) },
      { actorId: mgr._id, actorRole: 'manager', action: 'status_changed',  entityType: 'enquiry', entityId: enquiries[0]._id,  description: 'Changed status',          metadata: {}, createdAt: daysAgo(1) },
    )
  }

  activityLogs.push(
    { actorId: superAdmin._id, actorRole: 'super_admin', action: 'login',       entityType: 'user', entityId: superAdmin._id, description: 'SuperAdmin logged in',  metadata: {}, createdAt: hoursAgo(2) },
    { actorId: superAdmin._id, actorRole: 'super_admin', action: 'user_created',entityType: 'user', entityId: charlie._id,    description: 'Created user Charlie',  metadata: {}, createdAt: daysAgo(5) },
    { actorId: superAdmin._id, actorRole: 'super_admin', action: 'zone_created',entityType: 'zone', entityId: zones[0]._id,   description: 'Created North Zone',    metadata: {}, createdAt: daysAgo(10) },
  )

  await ActivityLog.insertMany(activityLogs)
  console.log(`   ✓ ${activityLogs.length} activity logs`)

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n✅ Dummy data seeded successfully!')
  console.log('══════════════════════════════════════════════════')
  console.log('  ROLE          EMAIL                     PASSWORD')
  console.log('──────────────────────────────────────────────────')
  console.log('  Super Admin   admin@enquirypro.com      Admin@1234')
  console.log('  Manager       alice@enquirypro.com      Manager@1234')
  console.log('  Manager       bob@enquirypro.com        Manager@1234')
  console.log('  Staff         charlie@enquirypro.com    Staff@1234')
  console.log('  Staff         diana@enquirypro.com      Staff@1234')
  console.log('  Staff         fiona@enquirypro.com      Staff@1234')
  console.log('  Staff         george@enquirypro.com     Staff@1234')
  console.log('══════════════════════════════════════════════════\n')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
