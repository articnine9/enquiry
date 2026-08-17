import { cache } from 'react'
import dbConnect from '@/lib/db/connection'
import MasterData, { type MasterDataType } from '@/lib/db/models/MasterData'

// ─── Shapes ───────────────────────────────────────────────────────────────────

export interface MasterOption {
  value:  string
  label:  string
  color?: string
  weight?: number
}

export interface MasterSubOption extends MasterOption {
  parentCode: string
}

interface MasterRow extends MasterOption {
  isActive:    boolean
  parentCode?: string
}

// ─── Per-request fetch of every row for a type (active + inactive) ────────────
// Display code→label resolution needs inactive rows too (an old enquiry may
// reference a value an admin has since disabled), so we load the full set once
// per type and derive both the option list and the label map from it.

const allCached = cache(async (type: MasterDataType): Promise<MasterRow[]> => {
  await dbConnect()
  const rows = await MasterData.find({ type })
    .sort({ sortOrder: 1, label: 1 })
    .lean()
  return rows.map((r) => ({
    value:      r.code,
    label:      r.label,
    color:      r.color,
    weight:     r.weight,
    isActive:   r.isActive,
    parentCode: r.parentCode,
  }))
})

// ─── Public helpers ───────────────────────────────────────────────────────────

/** Active options for a type, ordered — used to build dropdowns. */
export async function getMasterOptions(type: MasterDataType): Promise<MasterOption[]> {
  const rows = await allCached(type)
  return rows
    .filter((r) => r.isActive)
    .map(({ value, label, color, weight }) => ({ value, label, color, weight }))
}

/** Active sub-options for a type, each tagged with its parent's code. */
export async function getMasterSubOptions(type: MasterDataType): Promise<MasterSubOption[]> {
  const rows = await allCached(type)
  return rows
    .filter((r) => r.isActive && r.parentCode)
    .map(({ value, label, color, weight, parentCode }) => ({ value, label, color, weight, parentCode: parentCode! }))
}

/** All active option sets for the enquiry form, in one round of caching. */
export async function getEnquiryFormOptions(): Promise<{
  sources:            MasterOption[]
  categories:         MasterSubOption[]
  products:           MasterSubOption[]
  priorities:         MasterOption[]
  businessCategories: MasterOption[]
  businessSubCategories: MasterSubOption[]
  states:    MasterOption[]
  districts: MasterSubOption[]
  taluks:    MasterSubOption[]
  pincodes:  MasterSubOption[]
}> {
  const [
    sources, categories, products, priorities, businessCategories, businessSubCategories,
    states, districts, taluks, pincodes,
  ] = await Promise.all([
    getMasterOptions('enquiry_source'),
    getMasterSubOptions('enquiry_category'),
    getMasterSubOptions('enquiry_product'),
    getMasterOptions('enquiry_priority'),
    getMasterOptions('business_category'),
    getMasterSubOptions('business_subcategory'),
    getMasterOptions('state'),
    getMasterSubOptions('district'),
    getMasterSubOptions('taluk'),
    getMasterSubOptions('pincode'),
  ])
  return {
    sources, categories, products, priorities, businessCategories, businessSubCategories,
    states, districts, taluks, pincodes,
  }
}

/** All active option sets for the inventory forms and dropdowns. */
export async function getInventoryFormOptions(): Promise<{
  categories:         MasterOption[]
  subCategories:      MasterSubOption[]
  uoms:               MasterOption[]
  warehouseTypes:     MasterOption[]
  adjustmentReasons:  MasterOption[]
  taxRates:           MasterOption[]
}> {
  const [
    categories, subCategories, uoms, warehouseTypes, adjustmentReasons, taxRates,
  ] = await Promise.all([
    getMasterOptions('inventory_product_category'),
    getMasterSubOptions('inventory_product_subcategory'),
    getMasterOptions('inventory_uom'),
    getMasterOptions('inventory_warehouse_type'),
    getMasterOptions('inventory_adjustment_reason'),
    getMasterOptions('inventory_tax_rate'),
  ])
  return {
    categories,
    subCategories,
    uoms,
    warehouseTypes,
    adjustmentReasons,
    taxRates,
  }
}

/** code → label map (includes inactive) for rendering stored enquiry/inventory values. */
export async function getMasterLabelMap(
  type: MasterDataType
): Promise<Record<string, string>> {
  const rows = await allCached(type)
  const map: Record<string, string> = {}
  for (const r of rows) map[r.value] = r.label
  return map
}

/** Look up a single row by code (active or not). */
export async function resolveMasterValue(
  type: MasterDataType,
  code: string
): Promise<MasterRow | null> {
  const rows = await allCached(type)
  return rows.find((r) => r.value === code) ?? null
}

/** Humanise a raw code as a display fallback, e.g. `service_plan` → `Service Plan`. */
export function humanizeCode(code?: string | null): string {
  if (!code) return '—'
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Resolve a stored code to its label, falling back to a humanised form. */
export async function labelFor(
  type: MasterDataType,
  code?: string | null
): Promise<string> {
  if (!code) return '—'
  const map = await getMasterLabelMap(type)
  return map[code] ?? humanizeCode(code)
}
