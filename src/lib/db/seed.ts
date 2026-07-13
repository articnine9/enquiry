/**
 * Seed script — run once against a fresh database.
 * npx tsx src/lib/db/seed.ts
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { dbConnect, dbDisconnect } from './connection'
import { User, Role, LocationZone, MasterData } from './models'
import {
  UserRole, UserStatus,
  EnquirySource, EnquiryCategory, EnquiryProduct, EnquiryPriority,
  ENQUIRY_SOURCE_LABELS, ENQUIRY_PRODUCT_LABELS, ENQUIRY_PRIORITY_LABELS,
} from '@/types/enums'
import type { MasterDataType } from './models/MasterData'

// ── Master-data defaults (mirror the original enums, marked isSystem) ──────────

function humanize(code: string): string {
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const PRIORITY_META: Record<string, { color: string; weight: number }> = {
  [EnquiryPriority.Low]:    { color: 'slate', weight: 1 },
  [EnquiryPriority.Medium]: { color: 'blue',  weight: 2 },
  [EnquiryPriority.High]:   { color: 'amber', weight: 3 },
  [EnquiryPriority.Urgent]: { color: 'red',   weight: 4 },
}

interface SeedMaster {
  type: MasterDataType; code: string; label: string
  sortOrder: number; color?: string; weight?: number
}

const SEED_MASTER_DATA: SeedMaster[] = [
  ...Object.values(EnquirySource).map((v, i) => ({
    type: 'enquiry_source' as const, code: v, label: ENQUIRY_SOURCE_LABELS[v], sortOrder: i,
  })),
  ...Object.values(EnquiryCategory).map((v, i) => ({
    type: 'enquiry_category' as const, code: v, label: humanize(v), sortOrder: i,
  })),
  ...Object.values(EnquiryProduct).map((v, i) => ({
    type: 'enquiry_product' as const, code: v, label: ENQUIRY_PRODUCT_LABELS[v], sortOrder: i,
  })),
  ...Object.values(EnquiryPriority).map((v, i) => ({
    type: 'enquiry_priority' as const, code: v, label: ENQUIRY_PRIORITY_LABELS[v],
    sortOrder: i, color: PRIORITY_META[v].color, weight: PRIORITY_META[v].weight,
  })),
]

const SEED_ROLES = [
  {
    name:        'Super Admin',
    slug:        UserRole.SuperAdmin,
    description: 'Full system access with user management and configuration',
    isSystem:    true,
    permissions: [
      { resource: '*', actions: ['*'] },
    ],
  },
  {
    name:        'Manager',
    slug:        UserRole.Manager,
    description: 'Manage team assignments, view all enquiries in their zone, run reports',
    isSystem:    true,
    permissions: [
      { resource: 'enquiry',    actions: ['read', 'create', 'update', 'assign', 'reassign'] },
      { resource: 'followup',   actions: ['read', 'create', 'update'] },
      { resource: 'user',       actions: ['read'] },
      { resource: 'report',     actions: ['read', 'export'] },
      { resource: 'assignment', actions: ['read', 'create', 'update'] },
    ],
  },
  {
    name:        'Staff',
    slug:        UserRole.Staff,
    description: 'Handle assigned enquiries and follow-ups',
    isSystem:    true,
    permissions: [
      { resource: 'enquiry',  actions: ['read', 'update_status'] },
      { resource: 'followup', actions: ['read', 'create', 'update'] },
      { resource: 'report',   actions: ['read'] },
    ],
  },
]

async function seed() {
  await dbConnect()
  console.log('🌱 Starting seed…')

  // Roles
  for (const r of SEED_ROLES) {
    await Role.findOneAndUpdate({ slug: r.slug }, r, { upsert: true, new: true })
  }
  console.log('✅ Roles seeded')

  // Default location zone
  const zone = await LocationZone.findOneAndUpdate(
    { code: 'KL-CENTRAL' },
    {
      name:        'Kuala Lumpur Central',
      code:        'KL-CENTRAL',
      zones:       ['KL', 'Selangor', 'Putrajaya'],
      address:     { line1: 'KLCC', city: 'Kuala Lumpur', state: 'WP', country: 'Malaysia', postcode: '50088' },
      coordinates: { type: 'Point', coordinates: [101.7101, 3.1570] },
      isActive:    true,
    },
    { upsert: true, new: true }
  )
  console.log('✅ Location zone seeded')

  // Master data (enquiry dropdown options) — upsert without clobbering admin edits
  for (const m of SEED_MASTER_DATA) {
    await MasterData.findOneAndUpdate(
      { type: m.type, code: m.code },
      {
        $set: { isSystem: true },
        $setOnInsert: {
          type: m.type, code: m.code, label: m.label,
          sortOrder: m.sortOrder, isActive: true,
          ...(m.color  !== undefined ? { color:  m.color }  : {}),
          ...(m.weight !== undefined ? { weight: m.weight } : {}),
        },
      },
      { upsert: true, new: true }
    )
  }
  console.log('✅ Master data seeded')

  // Super admin user
  const hash = await bcrypt.hash('Admin@123!', 12)
  await User.findOneAndUpdate(
    { email: 'admin@enquiry.app' },
    {
      name:         'System Admin',
      email:        'admin@enquiry.app',
      passwordHash: hash,
      role:         UserRole.SuperAdmin,
      status:       UserStatus.Active,
      locationZoneId: zone._id,
      maxLoad:      999,
      isAvailable:  true,
    },
    { upsert: true, new: true }
  )
  console.log('✅ Super admin user seeded (admin@enquiry.app / Admin@123!)')

  await dbDisconnect()
  console.log('🌱 Seed complete')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
