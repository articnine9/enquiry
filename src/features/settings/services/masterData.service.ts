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

interface MasterRow extends MasterOption {
  isActive: boolean
}

// ─── Per-request fetch of every row for a type (active + inactive) ────────────
// Display code→label resolution needs inactive rows too (an old enquiry may
// reference a value an admin has since disabled), so we load the full set once
// per type and derive both the option list and the label map from it.
//
// React `cache()` dedupes calls within a single request/render but re-queries on
// the next request, so admin edits (and direct DB seeds) show up immediately —
// no cross-request cache to go stale.

const allCached = cache(async (type: MasterDataType): Promise<MasterRow[]> => {
  await dbConnect()
  const rows = await MasterData.find({ type })
    .sort({ sortOrder: 1, label: 1 })
    .lean()
  return rows.map((r) => ({
    value:    r.code,
    label:    r.label,
    color:    r.color,
    weight:   r.weight,
    isActive: r.isActive,
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

/** All active option sets for the enquiry form, in one round of caching. */
export async function getEnquiryFormOptions(): Promise<{
  sources:    MasterOption[]
  categories: MasterOption[]
  products:   MasterOption[]
  priorities: MasterOption[]
}> {
  const [sources, categories, products, priorities] = await Promise.all([
    getMasterOptions('enquiry_source'),
    getMasterOptions('enquiry_category'),
    getMasterOptions('enquiry_product'),
    getMasterOptions('enquiry_priority'),
  ])
  return { sources, categories, products, priorities }
}

/** code → label map (includes inactive) for rendering stored enquiry values. */
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
