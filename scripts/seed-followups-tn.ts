/**
 * Seed Tamil Nadu follow-up dummy data.
 * Creates TN-specific enquiries and a rich set of follow-ups covering
 * all types (call, email, visit, chat, meeting) and statuses.
 *
 * Usage: npx tsx scripts/seed-followups-tn.ts
 */
import mongoose from 'mongoose'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enquiry'

// ── Inline schemas ────────────────────────────────────────────────────────────

const ZoneSchema = new mongoose.Schema(
  { name: String, code: String, description: String,
    isActive: { type: Boolean, default: true },
    pincodes: [String], cities: [String], states: [String] },
  { timestamps: true }
)
const Zone = mongoose.models.LocationZone || mongoose.model('LocationZone', ZoneSchema)

const UserSchema = new mongoose.Schema(
  { name: String, email: { type: String, unique: true, lowercase: true },
    passwordHash: String, role: String, status: { type: String, default: 'active' },
    phone: String, locationZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'LocationZone' } },
  { timestamps: true }
)
const User = mongoose.models.User || mongoose.model('User', UserSchema)

const EnquirySchema = new mongoose.Schema(
  { enquiryNo: { type: String, unique: true },
    customerName: String, email: String, phone: String,
    address: String, city: String, district: String, state: String, pincode: String,
    enquirySource: String, product: String, category: String, priority: String, status: String,
    subject: String, description: String, tags: [String],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    locationZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'LocationZone' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date, closedAt: Date, assignedAt: Date },
  { timestamps: true }
)
const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', EnquirySchema)

const FollowUpSchema = new mongoose.Schema(
  { enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry' },
    type: String, status: String, notes: String, internalNotes: String,
    scheduledAt: Date, completedAt: Date, durationMinutes: Number,
    outcome: String, tags: [String],
    nextFollowUpDate: Date, nextFollowUpType: String,
    reminderAt: Date, reminderDismissed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
  { timestamps: true }
)
const FollowUp = mongoose.models.FollowUp || mongoose.model('FollowUp', FollowUpSchema)

// ── Helpers ───────────────────────────────────────────────────────────────────

const d  = (n: number) => new Date(Date.now() - n * 86_400_000)
const h  = (n: number) => new Date(Date.now() - n * 3_600_000)
const fn = (n: number) => new Date(Date.now() + n * 86_400_000)
const fh = (n: number) => new Date(Date.now() + n * 3_600_000)

let enqSeq = 3000
const enqNo = () => `ENQ-TN-${String(enqSeq++).padStart(4, '0')}`

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected:', MONGODB_URI)

  // ── Load existing users ──────────────────────────────────────────────────────
  const superAdmin = await User.findOne({ role: 'super_admin' })
  const managers   = await User.find({ role: 'manager' })
  const staff      = await User.find({ role: 'staff', status: 'active' })
  const zone       = await Zone.findOne()

  if (!superAdmin) throw new Error('Run seed-dummy.ts first — no users found')

  const mgr0  = managers[0]  ?? superAdmin
  const mgr1  = managers[1]  ?? superAdmin
  const stf0  = staff[0]     ?? superAdmin
  const stf1  = staff[1]     ?? superAdmin
  const stf2  = staff[2]     ?? superAdmin
  const stf3  = staff[3]     ?? superAdmin
  const stf4  = staff[4]     ?? superAdmin
  const zoneId = zone?._id

  // ── Clear existing TN follow-ups & enquiries ─────────────────────────────────
  const oldEnqs = await Enquiry.find({ enquiryNo: /^ENQ-TN-/ })
  const oldIds  = oldEnqs.map((e: { _id: mongoose.Types.ObjectId }) => e._id)
  if (oldIds.length) {
    await FollowUp.deleteMany({ enquiryId: { $in: oldIds } })
    await Enquiry.deleteMany({ _id: { $in: oldIds } })
    console.log(`🗑  Removed ${oldIds.length} old TN enquiry/follow-up set(s)`)
  }

  // ── Tamil Nadu enquiries ─────────────────────────────────────────────────────
  console.log('\n📋 Creating Tamil Nadu enquiries…')

  const enquiries = await Enquiry.insertMany([
    // Chennai
    {
      enquiryNo: enqNo(), customerName: 'Arjun Ramasamy',  email: 'arjun.ramasamy@gmail.com',   phone: '+91 98401 11001',
      city: 'Chennai',    district: 'Chennai',     state: 'Tamil Nadu', pincode: '600001',
      enquirySource: 'website',      product: 'solar_panel',     category: 'product_info', priority: 'high',
      status: 'in_progress', subject: 'Solar panel installation for residential complex',
      description: 'Interested in installing 10kW solar system for a 12-flat residential complex in Adyar.',
      tags: ['solar', 'residential', 'adyar'],
      assignedTo: stf0._id, locationZoneId: zoneId, createdBy: mgr0._id,
      assignedAt: d(3), createdAt: d(7),
    },
    // Coimbatore
    {
      enquiryNo: enqNo(), customerName: 'Kavitha Subramanian', email: 'kavitha.sub@yahoo.com', phone: '+91 98402 11002',
      city: 'Coimbatore', district: 'Coimbatore',  state: 'Tamil Nadu', pincode: '641001',
      enquirySource: 'phone',        product: 'water_heater',    category: 'pricing',      priority: 'medium',
      status: 'assigned',  subject: 'Commercial water heater pricing for textile mill',
      description: 'Requires industrial water heating solution for a textile manufacturing unit. Looking for bulk pricing.',
      tags: ['industrial', 'textile', 'bulk'],
      assignedTo: stf1._id, locationZoneId: zoneId, createdBy: mgr0._id,
      assignedAt: d(1), createdAt: d(5),
    },
    // Madurai
    {
      enquiryNo: enqNo(), customerName: 'Murugan Pandian',     email: 'murugan.p@outlook.com',   phone: '+91 98403 11003',
      city: 'Madurai',    district: 'Madurai',      state: 'Tamil Nadu', pincode: '625001',
      enquirySource: 'referral',     product: 'inverter',        category: 'complaint',    priority: 'urgent',
      status: 'open',      subject: 'Inverter failure during monsoon season',
      description: 'Inverter stopped working after heavy rainfall. Business operations affected. Needs immediate replacement.',
      tags: ['urgent', 'monsoon', 'replacement'],
      locationZoneId: zoneId, createdBy: superAdmin._id,
      createdAt: h(4),
    },
    // Salem
    {
      enquiryNo: enqNo(), customerName: 'Priya Krishnamurthy',  email: 'priya.km@gmail.com',      phone: '+91 98404 11004',
      city: 'Salem',      district: 'Salem',         state: 'Tamil Nadu', pincode: '636001',
      enquirySource: 'social_media', product: 'ups_system',      category: 'product_info', priority: 'low',
      status: 'resolved',  subject: 'UPS system for small business',
      description: 'Looking for 5kVA UPS for a small accounting firm. Needs 4-hour backup.',
      tags: ['ups', 'small-business'],
      assignedTo: stf2._id, locationZoneId: zoneId, createdBy: mgr1._id,
      assignedAt: d(10), resolvedAt: d(5), createdAt: d(12),
    },
    // Trichy
    {
      enquiryNo: enqNo(), customerName: 'Senthil Kumar Natarajan', email: 'senthil.n@hotmail.com', phone: '+91 98405 11005',
      city: 'Tiruchirappalli', district: 'Tiruchirappalli', state: 'Tamil Nadu', pincode: '620001',
      enquirySource: 'email',        product: 'solar_panel',     category: 'general',      priority: 'medium',
      status: 'in_progress', subject: 'Rooftop solar feasibility for college campus',
      description: 'Engineering college looking for rooftop solar feasibility study for 200kW capacity.',
      tags: ['solar', 'educational', 'campus'],
      assignedTo: stf3._id, locationZoneId: zoneId, createdBy: mgr1._id,
      assignedAt: d(2), createdAt: d(6),
    },
    // Tirunelveli
    {
      enquiryNo: enqNo(), customerName: 'Deepa Selvam',          email: 'deepa.selvam@gmail.com',  phone: '+91 98406 11006',
      city: 'Tirunelveli', district: 'Tirunelveli',  state: 'Tamil Nadu', pincode: '627001',
      enquirySource: 'walk_in',      product: 'battery',         category: 'support',      priority: 'high',
      status: 'assigned',  subject: 'Battery backup not holding charge',
      description: 'Purchased 150Ah battery 3 months ago. No longer holds charge beyond 2 hours.',
      tags: ['battery', 'warranty', 'support'],
      assignedTo: stf4._id, locationZoneId: zoneId, createdBy: stf4._id,
      assignedAt: d(0), createdAt: d(2),
    },
    // Erode
    {
      enquiryNo: enqNo(), customerName: 'Rajendran Muthusamy',   email: 'raj.muthusamy@gmail.com', phone: '+91 98407 11007',
      city: 'Erode',      district: 'Erode',         state: 'Tamil Nadu', pincode: '638001',
      enquirySource: 'website',      product: 'solar_panel',     category: 'pricing',      priority: 'medium',
      status: 'open',      subject: 'Agricultural solar pump pricing',
      description: 'Farmer requiring solar water pump for 5 acres of farmland. Looking for subsidy-eligible models.',
      tags: ['agriculture', 'solar-pump', 'subsidy'],
      locationZoneId: zoneId, createdBy: superAdmin._id,
      createdAt: h(6),
    },
    // Vellore
    {
      enquiryNo: enqNo(), customerName: 'Anitha Balasubramanian', email: 'anitha.b@yahoo.com',      phone: '+91 98408 11008',
      city: 'Vellore',    district: 'Vellore',        state: 'Tamil Nadu', pincode: '632001',
      enquirySource: 'phone',        product: 'inverter',        category: 'product_info', priority: 'low',
      status: 'closed',    subject: 'Home inverter for 3BHK apartment',
      description: 'Needed inverter recommendation for 3BHK flat with essential load of 1.5kW.',
      tags: ['home', 'residential'],
      assignedTo: stf0._id, locationZoneId: zoneId, createdBy: mgr0._id,
      assignedAt: d(20), closedAt: d(15), createdAt: d(22),
    },
    // Thanjavur
    {
      enquiryNo: enqNo(), customerName: 'Karthikeyan Pillai',    email: 'karthik.p@gmail.com',     phone: '+91 98409 11009',
      city: 'Thanjavur',  district: 'Thanjavur',     state: 'Tamil Nadu', pincode: '613001',
      enquirySource: 'referral',     product: 'ups_system',      category: 'general',      priority: 'medium',
      status: 'in_progress', subject: 'Hospital UPS upgrade proposal',
      description: 'Government hospital requires UPS upgrade for OT and ICU. Critical power backup needed.',
      tags: ['hospital', 'critical', 'ups'],
      assignedTo: stf1._id, locationZoneId: zoneId, createdBy: mgr1._id,
      assignedAt: d(4), createdAt: d(8),
    },
    // Nagercoil
    {
      enquiryNo: enqNo(), customerName: 'Vijayalakshmi Nadar',   email: 'vijaya.nadar@outlook.com', phone: '+91 98410 11010',
      city: 'Nagercoil',  district: 'Kanyakumari',   state: 'Tamil Nadu', pincode: '629001',
      enquirySource: 'social_media', product: 'solar_panel',     category: 'partnership',  priority: 'high',
      status: 'assigned',  subject: 'Dealer partnership for solar products — Kanyakumari region',
      description: 'Established electronics shop in Nagercoil. Interested in becoming authorised dealer for solar products.',
      tags: ['partnership', 'dealer', 'kanyakumari'],
      assignedTo: stf2._id, locationZoneId: zoneId, createdBy: mgr0._id,
      assignedAt: d(1), createdAt: d(3),
    },
  ])
  console.log(`   ✓ ${enquiries.length} TN enquiries created`)

  const [e0, e1, e2, e3, e4, e5, e6, e7, e8, e9] = enquiries

  // ── Follow-ups ───────────────────────────────────────────────────────────────
  console.log('\n📞 Creating follow-ups…')

  const followUps = await FollowUp.insertMany([

    // ── e0: Arjun Ramasamy — Solar panel (in_progress)
    {
      enquiryId: e0._id, type: 'call', status: 'completed',
      notes: 'Initial call with Arjun. Confirmed site visit required for Adyar complex. Discussed 10kW system capacity and approximate cost ₹6.5L.',
      internalNotes: 'Customer seems serious. High-value lead.',
      scheduledAt: d(6), completedAt: d(6), durationMinutes: 25,
      outcome: 'interested', tags: ['site-visit-needed', 'high-value'],
      createdBy: stf0._id,
    },
    {
      enquiryId: e0._id, type: 'visit', status: 'completed',
      notes: 'Site visit done at Adyar complex. Rooftop area measured — 800 sq ft available. Ideal for 8kW system. Shared detailed proposal with Arjun.',
      scheduledAt: d(4), completedAt: d(4), durationMinutes: 90,
      outcome: 'proposal_sent', tags: ['site-visit', 'proposal'],
      createdBy: stf0._id,
    },
    {
      enquiryId: e0._id, type: 'call', status: 'completed',
      notes: 'Follow-up on proposal. Arjun has shared with his builder. Builder raised questions about load-bearing capacity of roof. Need structural engineer sign-off.',
      scheduledAt: d(2), completedAt: d(2), durationMinutes: 15,
      outcome: 'follow_up_required', tags: ['builder', 'structural'],
      createdBy: stf0._id,
    },
    {
      enquiryId: e0._id, type: 'meeting', status: 'scheduled',
      notes: 'Meeting with Arjun and builder to address structural concerns and finalise order. Bring installation team brochure.',
      scheduledAt: fn(2), durationMinutes: 60,
      nextFollowUpDate: fn(5), nextFollowUpType: 'call',
      reminderAt: fn(1), reminderDismissed: false,
      tags: ['meeting', 'builder', 'finalise'],
      createdBy: stf0._id,
    },

    // ── e1: Kavitha Subramanian — Water heater (assigned)
    {
      enquiryId: e1._id, type: 'call', status: 'completed',
      notes: 'Called Kavitha at Coimbatore textile mill. Requirement: 3 units of 50L industrial heaters for dyeing section. Sent product catalogue via WhatsApp.',
      scheduledAt: d(4), completedAt: d(4), durationMinutes: 20,
      outcome: 'interested', tags: ['industrial', 'catalogue-sent'],
      createdBy: stf1._id,
    },
    {
      enquiryId: e1._id, type: 'email', status: 'completed',
      notes: 'Sent detailed quotation for 3×50L industrial water heaters. Total cost ₹1.85L including installation and AMC.',
      scheduledAt: d(3), completedAt: d(3), durationMinutes: 10,
      outcome: 'proposal_sent', tags: ['quotation', 'amc'],
      createdBy: stf1._id,
    },
    {
      enquiryId: e1._id, type: 'call', status: 'scheduled',
      notes: 'Price negotiation call with Kavitha. She indicated competitors quoting ₹1.6L. Prepare counter-offer with extended AMC.',
      scheduledAt: fh(3),
      reminderAt: fh(1), reminderDismissed: false,
      tags: ['negotiation', 'competitor'],
      createdBy: stf1._id,
    },

    // ── e2: Murugan Pandian — Inverter complaint (open / urgent)
    {
      enquiryId: e2._id, type: 'call', status: 'missed',
      notes: 'Tried calling Murugan at Madurai. No answer. Will retry after 1 hour.',
      scheduledAt: h(3),
      outcome: undefined, tags: ['missed-call'],
      createdBy: stf2._id,
    },
    {
      enquiryId: e2._id, type: 'call', status: 'scheduled',
      notes: 'Retry call to Murugan re inverter failure. Check warranty status — purchased approx 8 months ago. If under warranty, arrange same-day replacement.',
      scheduledAt: fh(1),
      reminderAt: fh(0.25), reminderDismissed: false,
      tags: ['warranty', 'urgent', 'replacement'],
      createdBy: stf2._id,
    },

    // ── e3: Priya Krishnamurthy — UPS (resolved)
    {
      enquiryId: e3._id, type: 'call', status: 'completed',
      notes: 'Initial call with Priya. Salem accounting firm needs 5kVA UPS for 8 computers. Confirmed 4-hour backup requirement.',
      scheduledAt: d(11), completedAt: d(11), durationMinutes: 18,
      outcome: 'interested', tags: ['ups', 'accounting'],
      createdBy: stf2._id,
    },
    {
      enquiryId: e3._id, type: 'email', status: 'completed',
      notes: 'Sent quotation for Luminous 5kVA online UPS with 4×150Ah batteries. Total ₹78,500 installed.',
      scheduledAt: d(10), completedAt: d(10), durationMinutes: 8,
      outcome: 'proposal_sent', tags: ['luminous', 'quotation'],
      createdBy: stf2._id,
    },
    {
      enquiryId: e3._id, type: 'call', status: 'completed',
      notes: 'Priya confirmed order. Payment: 50% advance received. Installation scheduled for next week.',
      scheduledAt: d(7), completedAt: d(7), durationMinutes: 12,
      outcome: 'converted', tags: ['order-confirmed', 'advance-received'],
      createdBy: stf2._id,
    },
    {
      enquiryId: e3._id, type: 'visit', status: 'completed',
      notes: 'Installation completed at Salem office. 5kVA UPS running smoothly. Customer satisfied. Handed over AMC documents.',
      scheduledAt: d(5), completedAt: d(5), durationMinutes: 120,
      outcome: 'converted', tags: ['installation-done', 'amc'],
      createdBy: stf2._id,
    },

    // ── e4: Senthil Kumar — Solar college (in_progress)
    {
      enquiryId: e4._id, type: 'email', status: 'completed',
      notes: 'Sent feasibility study request form to college principal at Trichy. Asked for energy audit data and roof layout.',
      scheduledAt: d(5), completedAt: d(5), durationMinutes: 15,
      outcome: 'follow_up_required', tags: ['feasibility', 'education'],
      createdBy: stf3._id,
    },
    {
      enquiryId: e4._id, type: 'meeting', status: 'completed',
      notes: 'Meeting with college principal and electrical department head. Reviewed roof layout — 4500 sq ft usable. Proposed 150kW instead of 200kW due to shading.',
      scheduledAt: d(3), completedAt: d(3), durationMinutes: 75,
      outcome: 'proposal_sent', tags: ['technical', 'shading-analysis'],
      createdBy: stf3._id,
    },
    {
      enquiryId: e4._id, type: 'call', status: 'scheduled',
      notes: 'Follow-up with principal re revised proposal for 150kW. College management committee meeting on Friday — expecting a decision.',
      scheduledAt: fn(1), durationMinutes: 20,
      nextFollowUpDate: fn(4), nextFollowUpType: 'meeting',
      reminderAt: fn(0), reminderDismissed: false,
      tags: ['decision-pending', 'committee'],
      createdBy: stf3._id,
    },

    // ── e5: Deepa Selvam — Battery complaint (assigned)
    {
      enquiryId: e5._id, type: 'call', status: 'completed',
      notes: 'Spoke with Deepa at Tirunelveli. Battery only 3 months old — warranty valid. Scheduled technician visit for tomorrow.',
      scheduledAt: d(1), completedAt: d(1), durationMinutes: 12,
      outcome: 'follow_up_required', tags: ['warranty', 'technician'],
      createdBy: stf4._id,
    },
    {
      enquiryId: e5._id, type: 'visit', status: 'scheduled',
      notes: 'Technician visit to test battery health at Tirunelveli site. Carry multimeter, hydrometer, and spare 150Ah battery unit.',
      scheduledAt: fn(0.5),
      reminderAt: fh(0), reminderDismissed: false,
      tags: ['technician-visit', 'battery-test'],
      createdBy: stf4._id,
    },

    // ── e6: Rajendran Muthusamy — Solar pump (open)
    {
      enquiryId: e6._id, type: 'chat', status: 'completed',
      notes: 'WhatsApp chat with Rajendran from Erode. He has 5 acres of farmland. Recommended PM-KUSUM subsidy scheme for solar pump.',
      scheduledAt: h(5), completedAt: h(5), durationMinutes: 20,
      outcome: 'interested', tags: ['whatsapp', 'pm-kusum', 'subsidy'],
      createdBy: stf0._id,
    },
    {
      enquiryId: e6._id, type: 'call', status: 'scheduled',
      notes: 'Detailed call with Rajendran about 3HP vs 5HP solar pump options. Send PM-KUSUM application guide before the call.',
      scheduledAt: fn(1),
      reminderAt: fh(20), reminderDismissed: false,
      tags: ['pump-sizing', 'subsidy-guide'],
      createdBy: stf0._id,
    },

    // ── e7: Anitha Balasubramanian — Inverter (closed)
    {
      enquiryId: e7._id, type: 'call', status: 'completed',
      notes: 'Initial enquiry from Vellore. 3BHK apartment — essential load: 4 fans, 6 lights, 1 TV. Recommended 1.5kW Luminous inverter with 150Ah battery.',
      scheduledAt: d(21), completedAt: d(21), durationMinutes: 15,
      outcome: 'proposal_sent', tags: ['home', 'luminous'],
      createdBy: stf0._id,
    },
    {
      enquiryId: e7._id, type: 'call', status: 'completed',
      notes: 'Anitha confirmed purchase. Collected from Vellore showroom. Installation done by in-house team. Customer happy.',
      scheduledAt: d(19), completedAt: d(19), durationMinutes: 8,
      outcome: 'converted', tags: ['sold', 'showroom'],
      createdBy: stf0._id,
    },

    // ── e8: Karthikeyan Pillai — Hospital UPS (in_progress)
    {
      enquiryId: e8._id, type: 'call', status: 'completed',
      notes: 'Call with hospital electrical officer at Thanjavur Govt Hospital. OT requires online UPS 10kVA, ICU needs 20kVA. Very critical application.',
      scheduledAt: d(7), completedAt: d(7), durationMinutes: 30,
      outcome: 'interested', tags: ['critical', 'hospital', 'govt'],
      createdBy: stf1._id,
    },
    {
      enquiryId: e8._id, type: 'visit', status: 'completed',
      notes: 'On-site survey at hospital. Inspected OT and ICU power infrastructure. Existing UPS 8 years old — needs full replacement. Load calculations done.',
      scheduledAt: d(5), completedAt: d(5), durationMinutes: 150,
      outcome: 'proposal_sent', tags: ['survey', 'load-calculation'],
      createdBy: stf1._id,
    },
    {
      enquiryId: e8._id, type: 'email', status: 'completed',
      notes: 'Sent technical proposal: 10kVA + 20kVA online UPS with 6-hour battery backup. Total budget ₹8.2L. Govt tender compliance documents included.',
      scheduledAt: d(3), completedAt: d(3), durationMinutes: 20,
      outcome: 'proposal_sent', tags: ['tender', 'govt-compliance'],
      createdBy: stf1._id,
    },
    {
      enquiryId: e8._id, type: 'meeting', status: 'scheduled',
      notes: 'Presentation to hospital committee and district medical officer. Bring all certifications — IEC, ISO, BIS. Decision expected in this meeting.',
      scheduledAt: fn(3), durationMinutes: 90,
      nextFollowUpDate: fn(5), nextFollowUpType: 'call',
      reminderAt: fn(2), reminderDismissed: false,
      tags: ['committee', 'presentation', 'decision'],
      createdBy: mgr1._id,
    },

    // ── e9: Vijayalakshmi Nadar — Dealer partnership (assigned)
    {
      enquiryId: e9._id, type: 'call', status: 'completed',
      notes: 'Initial call with Vijayalakshmi. She runs a 15-year-old electronics shop in Nagercoil. Very interested in solar dealership for Kanyakumari district.',
      scheduledAt: d(2), completedAt: d(2), durationMinutes: 22,
      outcome: 'interested', tags: ['dealer', 'kanyakumari', 'experienced'],
      createdBy: stf2._id,
    },
    {
      enquiryId: e9._id, type: 'email', status: 'completed',
      notes: 'Sent dealer partnership brochure, margin structure, and training schedule. Requested GST registration certificate and shop photos.',
      scheduledAt: d(1), completedAt: d(1), durationMinutes: 10,
      outcome: 'proposal_sent', tags: ['dealer-kit', 'documents-requested'],
      createdBy: stf2._id,
    },
    {
      enquiryId: e9._id, type: 'call', status: 'scheduled',
      notes: 'Call to collect dealer documents. Vijayalakshmi should have GST cert and shop photos ready. If docs complete, initiate onboarding.',
      scheduledAt: fn(1),
      reminderAt: fh(22), reminderDismissed: false,
      tags: ['onboarding', 'documents'],
      createdBy: stf2._id,
    },
  ])

  console.log(`   ✓ ${followUps.length} follow-ups created`)

  // ── Summary ──────────────────────────────────────────────────────────────────
  const counts = {
    scheduled: followUps.filter((f: { status: string }) => f.status === 'scheduled').length,
    completed:  followUps.filter((f: { status: string }) => f.status === 'completed').length,
    missed:     followUps.filter((f: { status: string }) => f.status === 'missed').length,
  }
  console.log(`\n📊 Summary:`)
  console.log(`   Scheduled : ${counts.scheduled}`)
  console.log(`   Completed : ${counts.completed}`)
  console.log(`   Missed    : ${counts.missed}`)
  console.log(`\n✅ Tamil Nadu follow-up seed complete!`)

  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
