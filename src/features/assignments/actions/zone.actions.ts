'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import dbConnect from '@/lib/db/connection'
import LocationZone from '@/lib/db/models/LocationZone'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { ActionResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZoneRow {
  _id:          string
  name:         string
  code:         string
  description?: string
  isActive:     boolean
  pincodes:     string[]
  cities:       string[]
  states:       string[]
  staffCount?:  number
  createdAt:    string
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const ZoneSchema = z.object({
  name:        z.string().min(2).max(120).trim(),
  code:        z.string().min(2).max(30).regex(/^[A-Z0-9_-]+$/, 'Uppercase alphanumeric only').trim(),
  description: z.string().max(500).optional(),
  isActive:    z.boolean().default(true),
  pincodes:    z.array(z.string()).default([]),
  cities:      z.array(z.string()).default([]),
  states:      z.array(z.string()).default([]),
})

// ── List zones ────────────────────────────────────────────────────────────────

export async function getZonesAction(): Promise<ActionResult<ZoneRow[]>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const User = (await import('@/lib/db/models/User')).default

    const [zones, staffCounts] = await Promise.all([
      LocationZone.find({}).sort({ name: 1 }).lean(),
      User.aggregate([
        { $match: { locationZoneId: { $exists: true, $ne: null } } },
        { $group: { _id: '$locationZoneId', count: { $sum: 1 } } },
      ]),
    ])

    const countMap = new Map(staffCounts.map((s: { _id: unknown; count: number }) => [String(s._id), s.count]))

    return {
      ok: true,
      data: toPlain(zones.map((z) => ({
        _id:         String(z._id),
        name:        z.name,
        code:        z.code,
        description: z.description,
        isActive:    z.isActive,
        pincodes:    z.pincodes ?? [],
        cities:      z.cities   ?? [],
        // `states` is stored on seeded docs but not declared on the schema
        states:      (z as { states?: string[] }).states ?? [],
        staffCount:  countMap.get(String(z._id)) ?? 0,
        createdAt:   String(z.createdAt),
      }))),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Create zone ───────────────────────────────────────────────────────────────

export async function createZoneAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = ZoneSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const exists = await LocationZone.findOne({ code: parsed.data.code.toUpperCase() })
    if (exists) return { ok: false, error: 'Zone with this code already exists' }

    const zone = await LocationZone.create(parsed.data)
    revalidateTag('zones')
    return { ok: true, data: { id: String(zone._id) } }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create zone' }
  }
}

// ── Update zone ───────────────────────────────────────────────────────────────

export async function updateZoneAction(
  id:    string,
  input: unknown
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = ZoneSchema.partial().safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const z = await LocationZone.findByIdAndUpdate(id, { $set: parsed.data })
    if (!z) return { ok: false, error: 'Zone not found' }

    revalidateTag('zones')
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Toggle active ─────────────────────────────────────────────────────────────

export async function toggleZoneActiveAction(
  id:       string,
  isActive: boolean
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    await LocationZone.findByIdAndUpdate(id, { isActive })
    revalidateTag('zones')
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}
