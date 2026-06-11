'use server'

import bcrypt from 'bcryptjs'
import { revalidateTag } from 'next/cache'
import dbConnect from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import LocationZone from '@/lib/db/models/LocationZone'
import { requireRole, requireSession } from '@/lib/auth/session'
import { UserRole, UserStatus } from '@/types/enums'
import {
  CreateUserSchema, UpdateUserSchema,
  ChangePasswordSchema, AdminResetPasswordSchema,
  type CreateUserInput, type UpdateUserInput,
} from '../validations/user.schema'
import type { ActionResult, PaginatedResult } from '@/types/api'

function toPlain<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserRow {
  _id:            string
  name:           string
  email:          string
  role:           UserRole
  status:         UserStatus
  phone?:         string
  locationZoneId: string | null
  zoneName?:      string
  lastLoginAt?:   string
  createdAt:      string
}

export interface UserFilters {
  search?:        string
  role?:          UserRole
  status?:        UserStatus
  locationZoneId?: string
  page?:          number
  pageSize?:      number
}

// ── List users ────────────────────────────────────────────────────────────────

export async function getUsersAction(
  filters: UserFilters = {}
): Promise<ActionResult<PaginatedResult<UserRow>>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const page     = Math.max(filters.page ?? 1, 1)
    const pageSize = Math.min(filters.pageSize ?? 20, 100)
    const skip     = (page - 1) * pageSize

    const query: Record<string, unknown> = {}

    if (filters.search) {
      const rx = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query['$or'] = [{ name: rx }, { email: rx }]
    }
    if (filters.role)           query['role']           = filters.role
    if (filters.status)         query['status']         = filters.status
    if (filters.locationZoneId) query['locationZoneId'] = filters.locationZoneId

    const [docs, total] = await Promise.all([
      User.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(pageSize)
        .populate<{ locationZoneId: { name: string } | null }>('locationZoneId', 'name')
        .lean(),
      User.countDocuments(query),
    ])

    const data: UserRow[] = docs.map((u) => ({
      _id:            String(u._id),
      name:           u.name,
      email:          u.email,
      role:           u.role,
      status:         u.status,
      phone:          u.phone,
      locationZoneId: u.locationZoneId ? String((u.locationZoneId as unknown as { _id: unknown })._id) : null,
      zoneName:       (u.locationZoneId as unknown as { name?: string } | null)?.name,
      lastLoginAt:    u.lastLoginAt ? String(u.lastLoginAt) : undefined,
      createdAt:      String(u.createdAt),
    }))

    return {
      ok: true,
      data: toPlain({
        data, total, page, pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext:    page < Math.ceil(total / pageSize),
        hasPrev:    page > 1,
      }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to load users' }
  }
}

// ── Get single user ───────────────────────────────────────────────────────────

export async function getUserAction(id: string): Promise<ActionResult<UserRow>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const u = await User.findById(id)
      .populate<{ locationZoneId: { name: string } | null }>('locationZoneId', 'name')
      .lean()

    if (!u) return { ok: false, error: 'User not found' }

    return {
      ok: true,
      data: toPlain({
        _id:            String(u._id),
        name:           u.name,
        email:          u.email,
        role:           u.role,
        status:         u.status,
        phone:          u.phone,
        locationZoneId: u.locationZoneId ? String((u.locationZoneId as unknown as { _id: unknown })._id) : null,
        zoneName:       (u.locationZoneId as unknown as { name?: string } | null)?.name,
        lastLoginAt:    u.lastLoginAt ? String(u.lastLoginAt) : undefined,
        createdAt:      String(u.createdAt),
      }),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Create user ───────────────────────────────────────────────────────────────

export async function createUserAction(
  input: CreateUserInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = CreateUserSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const exists = await User.findOne({ email: parsed.data.email })
    if (exists) return { ok: false, error: 'A user with this email already exists' }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12)

    const user = await User.create({
      name:           parsed.data.name,
      email:          parsed.data.email,
      passwordHash,
      role:           parsed.data.role,
      status:         parsed.data.status,
      phone:          parsed.data.phone,
      locationZoneId: parsed.data.locationZoneId || undefined,
    })

    revalidateTag('users')
    return { ok: true, data: { id: String(user._id) } }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to create user' }
  }
}

// ── Update user ───────────────────────────────────────────────────────────────

export async function updateUserAction(
  id:    string,
  input: UpdateUserInput
): Promise<ActionResult<null>> {
  try {
    const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    // Managers can only update Staff users in their zone
    if (session.user.role === UserRole.Manager) {
      const target = await User.findById(id).lean()
      if (!target) return { ok: false, error: 'User not found' }
      if (target.role !== UserRole.Staff) return { ok: false, error: 'Forbidden' }
      if (input.role && input.role !== UserRole.Staff) {
        return { ok: false, error: 'Managers cannot change role to non-staff' }
      }
    }

    const parsed = UpdateUserSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const update: Record<string, unknown> = {}
    if (parsed.data.name  != null) update['name']  = parsed.data.name
    if (parsed.data.email != null) {
      const clash = await User.findOne({ email: parsed.data.email, _id: { $ne: id } })
      if (clash) return { ok: false, error: 'Email already in use' }
      update['email'] = parsed.data.email
    }
    if (parsed.data.role           != null) update['role']           = parsed.data.role
    if (parsed.data.status         != null) update['status']         = parsed.data.status
    if (parsed.data.phone          != null) update['phone']          = parsed.data.phone
    if ('locationZoneId' in parsed.data)    update['locationZoneId'] = parsed.data.locationZoneId || null

    await User.findByIdAndUpdate(id, { $set: update })

    revalidateTag('users')
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to update user' }
  }
}

// ── Delete user ───────────────────────────────────────────────────────────────

export async function deleteUserAction(id: string): Promise<ActionResult<null>> {
  try {
    const session = await requireRole(UserRole.SuperAdmin)

    // Prevent self-deletion
    if (id === session.user.id) return { ok: false, error: 'Cannot delete your own account' }

    await dbConnect()
    const u = await User.findByIdAndUpdate(id, { status: UserStatus.Inactive })
    if (!u) return { ok: false, error: 'User not found' }

    revalidateTag('users')
    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Change own password ───────────────────────────────────────────────────────

export async function changePasswordAction(
  input: unknown
): Promise<ActionResult<null>> {
  try {
    const session = await requireSession()
    await dbConnect()

    const parsed = ChangePasswordSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const user = await User.findById(session.user.id).select('+passwordHash').lean()
    if (!user) return { ok: false, error: 'User not found' }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
    if (!valid) return { ok: false, error: 'Current password is incorrect' }

    const hash = await bcrypt.hash(parsed.data.newPassword, 12)
    await User.findByIdAndUpdate(session.user.id, { passwordHash: hash })

    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Admin reset password ──────────────────────────────────────────────────────

export async function adminResetPasswordAction(
  userId: string,
  input:  unknown
): Promise<ActionResult<null>> {
  try {
    await requireRole(UserRole.SuperAdmin)
    await dbConnect()

    const parsed = AdminResetPasswordSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' }
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, 12)
    const u = await User.findByIdAndUpdate(userId, { passwordHash: hash })
    if (!u) return { ok: false, error: 'User not found' }

    return { ok: true, data: null }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ── Get zones for dropdown ────────────────────────────────────────────────────

export async function getZonesForSelectAction(): Promise<ActionResult<{ _id: string; name: string }[]>> {
  try {
    await requireRole(UserRole.SuperAdmin, UserRole.Manager)
    await dbConnect()

    const zones = await LocationZone.find({ isActive: true }, { name: 1 }).sort({ name: 1 }).lean()
    return {
      ok: true,
      data: toPlain(zones.map((z) => ({ _id: String(z._id), name: z.name }))),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}
