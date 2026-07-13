'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import dbConnect from '@/lib/db/connection'
import MasterData, {
  MASTER_DATA_TYPES,
  type MasterDataType,
} from '@/lib/db/models/MasterData'
import Enquiry from '@/lib/db/models/Enquiry'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import { CACHE_TAGS } from '@/lib/cache'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Which Enquiry field each type maps to (used for the in-use guard) ──────────

const TYPE_TO_ENQUIRY_FIELD: Record<MasterDataType, string> = {
  enquiry_source:   'enquirySource',
  enquiry_category: 'category',
  enquiry_product:  'product',
  enquiry_priority: 'priority',
}

// ── Row shape returned to the admin UI ─────────────────────────────────────────

export interface MasterDataRow {
  _id:       string
  type:      MasterDataType
  code:      string
  label:     string
  color?:    string
  weight?:   number
  sortOrder: number
  isActive:  boolean
  isSystem:  boolean
}

// ── Validation ─────────────────────────────────────────────────────────────────

const MasterDataInput = z.object({
  type:      z.enum(MASTER_DATA_TYPES),
  code:      z.string().trim().toLowerCase().regex(/^[a-z0-9_]{2,40}$/, 'Code must be 2–40 lowercase letters, digits, or underscores'),
  label:     z.string().trim().min(1, 'Label is required').max(80, 'Label cannot exceed 80 characters'),
  color:     z.string().trim().optional(),
  weight:    z.coerce.number().optional(),
  sortOrder: z.coerce.number().default(0),
  isActive:  z.boolean().default(true),
})

// ── List (admin) ────────────────────────────────────────────────────────────────

export async function getMasterDataAction(
  type: MasterDataType
): Promise<ActionResult<MasterDataRow[]>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const rows = await MasterData.find({ type }).sort({ sortOrder: 1, label: 1 }).lean()

    return {
      ok: true,
      data: toPlain(rows.map((r) => ({
        _id:       String(r._id),
        type:      r.type,
        code:      r.code,
        label:     r.label,
        color:     r.color,
        weight:    r.weight,
        sortOrder: r.sortOrder ?? 0,
        isActive:  r.isActive,
        isSystem:  r.isSystem,
      }))),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load master data' }
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createMasterDataAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = MasterDataInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const exists = await MasterData.findOne({ type: parsed.data.type, code: parsed.data.code })
    if (exists) return { ok: false, error: 'An option with this code already exists' }

    const row = await MasterData.create(parsed.data)
    revalidateTag(CACHE_TAGS.masterData)
    return { ok: true, data: { id: String(row._id) } }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create option' }
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateMasterDataAction(
  id:    string,
  input: unknown
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const existing = await MasterData.findById(id)
    if (!existing) return { ok: false, error: 'Option not found' }

    // System rows keep their code (it may be referenced by existing enquiries);
    // only the presentation fields can change.
    const schema = existing.isSystem ? MasterDataInput.omit({ code: true, type: true }) : MasterDataInput.partial()
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    await MasterData.findByIdAndUpdate(id, { $set: parsed.data })
    revalidateTag(CACHE_TAGS.masterData)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update option' }
  }
}

// ── Toggle active ───────────────────────────────────────────────────────────────

export async function toggleMasterDataActiveAction(
  id:       string,
  isActive: boolean
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    await MasterData.findByIdAndUpdate(id, { isActive })
    revalidateTag(CACHE_TAGS.masterData)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update option' }
  }
}

// ── Delete ──────────────────────────────────────────────────────────────────────

export async function deleteMasterDataAction(
  id: string
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const row = await MasterData.findById(id)
    if (!row) return { ok: false, error: 'Option not found' }
    if (row.isSystem) {
      return { ok: false, error: 'System default options cannot be deleted — deactivate it instead' }
    }

    // Block deletion when enquiries still reference this value.
    const field = TYPE_TO_ENQUIRY_FIELD[row.type]
    const inUse = await Enquiry.countDocuments({ [field]: row.code })
    if (inUse > 0) {
      return { ok: false, error: `In use by ${inUse} enquir${inUse === 1 ? 'y' : 'ies'} — deactivate it instead` }
    }

    await MasterData.findByIdAndDelete(id)
    revalidateTag(CACHE_TAGS.masterData)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete option' }
  }
}
