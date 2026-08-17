/**
 * Seed script — run once against a fresh database.
 * npx tsx src/lib/db/seed.ts
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { dbConnect, dbDisconnect } from './connection'
import { User, Role, LocationZone, MasterData, SLAPolicy } from './models'
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
  parentCode?: string
}

// Default resolution-time targets per priority, in minutes.
const SLA_DEFAULTS_MINUTES: Record<string, number> = {
  [EnquiryPriority.Urgent]: 240,    // 4 hours
  [EnquiryPriority.High]:   1440,   // 24 hours
  [EnquiryPriority.Medium]: 4320,   // 3 days
  [EnquiryPriority.Low]:    10080,  // 7 days
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
  // ── Inventory Master Data ──────────────────────────────────────────────────
  { type: 'inventory_product_category', code: 'poultry_feed', label: 'Poultry Feed', sortOrder: 1 },
  { type: 'inventory_product_category', code: 'cattle_feed', label: 'Cattle Feed', sortOrder: 2 },
  { type: 'inventory_product_category', code: 'medicines', label: 'Veterinary Medicines', sortOrder: 3 },
  { type: 'inventory_product_category', code: 'supplements', label: 'Feed Supplements & Premix', sortOrder: 4 },
  { type: 'inventory_product_category', code: 'equipment', label: 'Farm Equipment & Tools', sortOrder: 5 },
  { type: 'inventory_product_category', code: 'biosecurity', label: 'Biosecurity & Sanitizers', sortOrder: 6 },

  // Subcategories
  { type: 'inventory_product_subcategory', code: 'broiler_starter', label: 'Broiler Starter', parentCode: 'poultry_feed', sortOrder: 1 },
  { type: 'inventory_product_subcategory', code: 'broiler_finisher', label: 'Broiler Finisher', parentCode: 'poultry_feed', sortOrder: 2 },
  { type: 'inventory_product_subcategory', code: 'layer_mash', label: 'Layer Mash', parentCode: 'poultry_feed', sortOrder: 3 },
  { type: 'inventory_product_subcategory', code: 'antibiotics', label: 'Antibiotics', parentCode: 'medicines', sortOrder: 1 },
  { type: 'inventory_product_subcategory', code: 'dewormers', label: 'Dewormers', parentCode: 'medicines', sortOrder: 2 },
  { type: 'inventory_product_subcategory', code: 'vitamins', label: 'Vitamins & Minerals', parentCode: 'supplements', sortOrder: 1 },

  // UOMs
  { type: 'inventory_uom', code: 'kg', label: 'Kilograms (kg)', sortOrder: 1 },
  { type: 'inventory_uom', code: 'bags', label: 'Bags (50kg / 25kg)', sortOrder: 2 },
  { type: 'inventory_uom', code: 'litres', label: 'Litres (L)', sortOrder: 3 },
  { type: 'inventory_uom', code: 'bottles', label: 'Bottles', sortOrder: 4 },
  { type: 'inventory_uom', code: 'boxes', label: 'Boxes / Cartons', sortOrder: 5 },
  { type: 'inventory_uom', code: 'units', label: 'Units / Pieces', sortOrder: 6 },
  { type: 'inventory_uom', code: 'tonnes', label: 'Metric Tonnes (MT)', sortOrder: 7 },
  { type: 'inventory_uom', code: 'vials', label: 'Vials / Doses', sortOrder: 8 },

  // Warehouse Types
  { type: 'inventory_warehouse_type', code: 'central', label: 'Central Warehouse (HQ)', sortOrder: 1 },
  { type: 'inventory_warehouse_type', code: 'regional_hub', label: 'Regional Hub / Depot', sortOrder: 2 },
  { type: 'inventory_warehouse_type', code: 'distributor_depot', label: 'Distributor Stock Point', sortOrder: 3 },
  { type: 'inventory_warehouse_type', code: 'cold_storage', label: 'Cold Storage Facility', sortOrder: 4 },
  { type: 'inventory_warehouse_type', code: 'transit', label: 'In-Transit Van / Vehicle Stock', sortOrder: 5 },

  // Stock Adjustment Reasons
  { type: 'inventory_adjustment_reason', code: 'damage_in_transit', label: 'Damage during transport / handling', sortOrder: 1 },
  { type: 'inventory_adjustment_reason', code: 'expired_writeoff', label: 'Expired batch disposal', sortOrder: 2 },
  { type: 'inventory_adjustment_reason', code: 'audit_shortage', label: 'Physical count shortage', sortOrder: 3 },
  { type: 'inventory_adjustment_reason', code: 'audit_surplus', label: 'Physical count surplus (found in count)', sortOrder: 4 },
  { type: 'inventory_adjustment_reason', code: 'qc_rejection', label: 'Quality control / Laboratory rejection', sortOrder: 5 },
  { type: 'inventory_adjustment_reason', code: 'field_sample', label: 'Demonstration & field sample issue', sortOrder: 6 },

  // Tax Rates
  { type: 'inventory_tax_rate', code: 'tax_0', label: '0% (Exempt / Nil Rated)', weight: 0, sortOrder: 1 },
  { type: 'inventory_tax_rate', code: 'tax_5', label: '5% GST', weight: 5, sortOrder: 2 },
  { type: 'inventory_tax_rate', code: 'tax_12', label: '12% GST', weight: 12, sortOrder: 3 },
  { type: 'inventory_tax_rate', code: 'tax_18', label: '18% GST', weight: 18, sortOrder: 4 },
  { type: 'inventory_tax_rate', code: 'tax_28', label: '28% GST', weight: 28, sortOrder: 5 },
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

  // SLA policies — one default (all-categories) row per priority
  for (const [priority, resolutionMinutes] of Object.entries(SLA_DEFAULTS_MINUTES)) {
    await SLAPolicy.findOneAndUpdate(
      { priority, category: null },
      {
        $set: { isSystem: true },
        $setOnInsert: { priority, category: null, resolutionMinutes, isActive: true },
      },
      { upsert: true, new: true }
    )
  }
  console.log('✅ SLA policies seeded')

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
