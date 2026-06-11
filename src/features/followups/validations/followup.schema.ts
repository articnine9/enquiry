import { z } from 'zod'
import { FollowUpType, FollowUpOutcome, FollowUpStatus } from '@/types/enums'

// ── Shared atoms ──────────────────────────────────────────────────────────────

const objectId = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format')

const futureDate = z.coerce
  .date()
  .refine((d) => d > new Date(), { message: 'Date must be in the future' })

const optFutureDate = z.coerce
  .date()
  .refine((d) => d > new Date(), { message: 'Date must be in the future' })
  .optional()
  .nullable()

// ── Create ────────────────────────────────────────────────────────────────────

export const CreateFollowUpSchema = z
  .object({
    enquiryId: objectId,

    type: z.nativeEnum(FollowUpType, {
      errorMap: () => ({ message: 'Please select a follow-up type' }),
    }),

    notes: z
      .string({ required_error: 'Notes are required' })
      .min(5,    'Notes must be at least 5 characters')
      .max(5000, 'Notes cannot exceed 5000 characters')
      .trim(),

    internalNotes: z
      .string()
      .max(2000)
      .trim()
      .optional()
      .nullable()
      .transform((v) => v || undefined),

    scheduledAt: z.coerce
      .date({ required_error: 'Scheduled date is required' })
      .refine((d) => d >= new Date(Date.now() - 60_000), {
        message: 'Scheduled date cannot be in the past',
      }),

    durationMinutes: z.coerce
      .number()
      .int()
      .min(1, 'Minimum 1 minute')
      .max(480, 'Maximum 8 hours')
      .optional()
      .nullable(),

    nextFollowUpDate: optFutureDate,

    nextFollowUpType: z.nativeEnum(FollowUpType).optional().nullable(),

    // Reminder: offset in minutes before scheduledAt (30, 60, 120, 1440, etc.)
    reminderOffsetMinutes: z.coerce
      .number()
      .int()
      .min(5,     'Minimum 5 minutes before')
      .max(10080, 'Maximum 7 days before')
      .optional()
      .nullable(),

    tags: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10)
          : []
      ),
  })
  .refine(
    (d) => !(d.nextFollowUpDate && !d.nextFollowUpType),
    {
      path:    ['nextFollowUpType'],
      message: 'Please select a type for the next follow-up',
    }
  )

export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>

// ── Update ────────────────────────────────────────────────────────────────────

export const UpdateFollowUpSchema = z.object({
  type:                  z.nativeEnum(FollowUpType).optional(),
  notes:                 z.string().min(5).max(5000).trim().optional(),
  internalNotes:         z.string().max(2000).trim().optional().nullable(),
  scheduledAt:           z.coerce.date().optional(),
  durationMinutes:       z.coerce.number().int().min(1).max(480).optional().nullable(),
  nextFollowUpDate:      optFutureDate,
  nextFollowUpType:      z.nativeEnum(FollowUpType).optional().nullable(),
  reminderOffsetMinutes: z.coerce.number().int().min(5).max(10080).optional().nullable(),
  tags:                  z.string().optional().transform((v) =>
    v ? v.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10) : []
  ),
})

export type UpdateFollowUpInput = z.infer<typeof UpdateFollowUpSchema>

// ── Close (complete / cancel) ─────────────────────────────────────────────────

export const CloseFollowUpSchema = z.object({
  id: objectId,

  status: z.enum(
    [FollowUpStatus.Completed, FollowUpStatus.Cancelled, FollowUpStatus.Missed],
    { errorMap: () => ({ message: 'Status must be completed, cancelled, or missed' }) }
  ),

  outcome: z.nativeEnum(FollowUpOutcome, {
    errorMap: () => ({ message: 'Please select an outcome' }),
  }).optional(),

  completedAt: z.coerce.date().optional(),

  durationMinutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(480)
    .optional()
    .nullable(),

  notes: z
    .string()
    .max(5000)
    .trim()
    .optional(),

  // Auto-schedule next follow-up on close
  nextFollowUpDate: optFutureDate,
  nextFollowUpType: z.nativeEnum(FollowUpType).optional().nullable(),
})
  .refine(
    (d) => d.status !== FollowUpStatus.Completed || !!d.outcome,
    {
      path:    ['outcome'],
      message: 'Outcome is required when completing a follow-up',
    }
  )
  .refine(
    (d) => !(d.nextFollowUpDate && !d.nextFollowUpType),
    {
      path:    ['nextFollowUpType'],
      message: 'Please select a type for the next follow-up',
    }
  )

export type CloseFollowUpInput = z.infer<typeof CloseFollowUpSchema>

// ── Reminder dismiss ──────────────────────────────────────────────────────────

export const DismissReminderSchema = z.object({
  id: objectId,
})
export type DismissReminderInput = z.infer<typeof DismissReminderSchema>

// ── Filter / list ─────────────────────────────────────────────────────────────

export const FollowUpFilterSchema = z.object({
  enquiryId: objectId.optional(),
  createdBy: objectId.optional(),
  status:    z.nativeEnum(FollowUpStatus).optional(),
  type:      z.nativeEnum(FollowUpType).optional(),
  from:      z.coerce.date().optional(),
  to:        z.coerce.date().optional(),
  overdue:   z.coerce.boolean().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(100).default(20),
})
export type FollowUpFilterInput = z.infer<typeof FollowUpFilterSchema>
