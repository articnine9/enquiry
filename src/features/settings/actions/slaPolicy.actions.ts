'use server'

import { z } from 'zod'
import dbConnect from '@/lib/db/connection'
import SLAPolicy from '@/lib/db/models/SLAPolicy'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Row shape returned to the admin UI ──────────────────────────────────────────

export interface SLAPolicyRow {
  _id:                string
  priority:           string
  category:           string | null
  resolutionMinutes:  number
  isActive:           boolean
  isSystem:           boolean
}

// ── Validation ─────────────────────────────────────────────────────────────────

const SLAPolicyInput = z.object({
  priority:           z.string().trim().toLowerCase().min(1, 'Priority is required'),
  category:           z.string().trim().toLowerCase().min(1).optional().nullable(),
  resolutionMinutes:  z.coerce.number().int().min(1, 'Must be at least 1 minute').max(43_200, 'Cannot exceed 30 days'),
  isActive:           z.boolean().default(true),
})

// ── List ───────────────────────────────────────────────────────────────────────

export async function getSlaPoliciesAction(): Promise<ActionResult<SLAPolicyRow[]>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const rows = await SLAPolicy.find({}).sort({ priority: 1, category: 1 }).lean()

    return {
      ok: true,
      data: toPlain(rows.map((r) => ({
        _id:               String(r._id),
        priority:          r.priority,
        category:          r.category,
        resolutionMinutes: r.resolutionMinutes,
        isActive:          r.isActive,
        isSystem:          r.isSystem,
      }))),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load SLA policies' }
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createSlaPolicyAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = SLAPolicyInput.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const category = parsed.data.category || null
    const exists = await SLAPolicy.findOne({ priority: parsed.data.priority, category })
    if (exists) {
      return { ok: false, error: category ? 'A policy for this priority + category already exists' : 'A default policy for this priority already exists' }
    }

    const row = await SLAPolicy.create({ ...parsed.data, category })
    return { ok: true, data: { id: String(row._id) } }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create SLA policy' }
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateSlaPolicyAction(
  id:    string,
  input: unknown
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const existing = await SLAPolicy.findById(id)
    if (!existing) return { ok: false, error: 'SLA policy not found' }

    // System rows keep their priority/category scope; only the target time & active flag can change.
    const schema = existing.isSystem
      ? SLAPolicyInput.omit({ priority: true, category: true })
      : SLAPolicyInput.partial()
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const update: Record<string, unknown> = { ...parsed.data }
    if ('category' in update) update.category = update.category || null

    await SLAPolicy.findByIdAndUpdate(id, { $set: update })
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update SLA policy' }
  }
}

// ── Toggle active ────────────────────────────────────────────────────────────

export async function toggleSlaPolicyActiveAction(
  id:       string,
  isActive: boolean
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    await SLAPolicy.findByIdAndUpdate(id, { isActive })
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update SLA policy' }
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteSlaPolicyAction(id: string): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const row = await SLAPolicy.findById(id)
    if (!row) return { ok: false, error: 'SLA policy not found' }
    if (row.isSystem) {
      return { ok: false, error: 'System default policies cannot be deleted — deactivate it instead' }
    }

    await SLAPolicy.findByIdAndDelete(id)
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to delete SLA policy' }
  }
}
