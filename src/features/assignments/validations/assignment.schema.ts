import { z } from 'zod'

// ── Shared ────────────────────────────────────────────────────────────────────

const objectId = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format')

const reason = z
  .string()
  .max(1000, 'Reason cannot exceed 1000 characters')
  .trim()
  .optional()

// ── Manual assignment ─────────────────────────────────────────────────────────

export const ManualAssignSchema = z.object({
  enquiryId: objectId,
  staffId:   objectId,
  reason:    reason,
})
export type ManualAssignInput = z.infer<typeof ManualAssignSchema>

// ── Reassignment ──────────────────────────────────────────────────────────────

export const ReassignSchema = z.object({
  enquiryId: objectId,
  staffId:   objectId,
  reason:    z
    .string({ required_error: 'Reason is required for reassignment' })
    .min(10, 'Please provide at least 10 characters for the reason')
    .max(1000)
    .trim(),
})
export type ReassignInput = z.infer<typeof ReassignSchema>

// ── Release staff ─────────────────────────────────────────────────────────────

export const ReleaseAssignmentSchema = z.object({
  enquiryId:      objectId,
  releasedReason: z
    .string({ required_error: 'Release reason is required' })
    .min(5, 'Please provide at least 5 characters')
    .max(500)
    .trim(),
})
export type ReleaseAssignmentInput = z.infer<typeof ReleaseAssignmentSchema>

// ── Zone CRUD ─────────────────────────────────────────────────────────────────

export const CreateZoneSchema = z.object({
  name:        z.string().min(2).max(120).trim(),
  code:        z
    .string()
    .min(2)
    .max(30)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, digits, hyphens, or underscores'),
  description: z.string().max(500).trim().optional(),
  pincodes:    z
    .array(z.string().regex(/^\d{5}$/, 'Each pincode must be exactly 5 digits'))
    .default([]),
  districts:   z.array(z.string().min(1).max(100).trim()).default([]),
  cities:      z.array(z.string().min(1).max(100).trim()).default([]),
  maxCapacity: z.number().int().min(1).max(10_000).default(50),
  isActive:    z.boolean().default(true),
  managerId:   objectId.optional(),
})
export type CreateZoneInput = z.infer<typeof CreateZoneSchema>

export const UpdateZoneSchema = CreateZoneSchema.partial().omit({ code: true })
export type UpdateZoneInput = z.infer<typeof UpdateZoneSchema>

// ── Filter / pagination ───────────────────────────────────────────────────────

export const AssignmentFilterSchema = z.object({
  enquiryId: objectId.optional(),
  staffId:   objectId.optional(),
  zoneId:    objectId.optional(),
  status:    z.enum(['active', 'superseded', 'released']).optional(),
  type:      z.enum(['auto', 'manual', 'reassigned']).optional(),
  from:      z.coerce.date().optional(),
  to:        z.coerce.date().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(100).default(20),
})
export type AssignmentFilterInput = z.infer<typeof AssignmentFilterSchema>
