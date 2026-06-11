/**
 * Run once to create the initial SuperAdmin account.
 * Usage: npx tsx scripts/seed-admin.ts
 */
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enquiry'

// ── Inline User schema (avoid circular imports) ───────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    passwordHash:  { type: String, required: true },
    role:          { type: String, enum: ['super_admin', 'manager', 'staff'], default: 'staff' },
    status:        { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    phone:         { type: String },
    locationZoneId:{ type: mongoose.Schema.Types.ObjectId, ref: 'LocationZone' },
    lastLoginAt:   { type: Date },
  },
  { timestamps: true }
)

const User = mongoose.models.User || mongoose.model('User', UserSchema)

// ── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB:', MONGODB_URI)

  const email    = 'admin@enquirypro.com'
  const password = 'Admin@1234'

  const existing = await User.findOne({ email })
  if (existing) {
    console.log(`\n⚠  User already exists: ${email}`)
    console.log('   To reset the password, delete the user in MongoDB and re-run.')
    await mongoose.disconnect()
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await User.create({
    name:         'Super Admin',
    email,
    passwordHash,
    role:         'super_admin',
    status:       'active',
  })

  console.log('\n✅ SuperAdmin created successfully!')
  console.log('─────────────────────────────────')
  console.log(`   Email    : ${email}`)
  console.log(`   Password : ${password}`)
  console.log('─────────────────────────────────')
  console.log('   ⚠  Change the password after first login.\n')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
