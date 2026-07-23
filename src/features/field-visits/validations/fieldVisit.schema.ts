import { z } from 'zod'
import { VisitType } from '@/types/enums'

// ── Shared atoms ──────────────────────────────────────────────────────────────

const objectId = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format')

const optObjectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format')
  .optional()
  .nullable()
  .transform((v) => v || undefined)

// ── Create ────────────────────────────────────────────────────────────────────

export const CreateFieldVisitSchema = z.object({
  visitDate: z.coerce
    .date({ required_error: 'Visit date is required' })
    .refine((d) => d.getTime() <= Date.now() + 24 * 60 * 60 * 1000, {
      message: 'Visit date cannot be more than a day in the future',
    }),

  visitType: z.nativeEnum(VisitType, {
    errorMap: () => ({ message: 'Please select a visit type' }),
  }),

  customerName: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(150, 'Customer name cannot exceed 150 characters'),

  notes: z
    .string()
    .trim()
    .max(3000, 'Notes cannot exceed 3000 characters')
    .optional()
    .transform((v) => v || undefined),

  enquiryId:     optObjectId,
  distributorId: optObjectId,
  dealerId:      optObjectId,

  gpsLat: z.coerce.number().min(-90).max(90).optional().nullable(),
  gpsLng: z.coerce.number().min(-180).max(180).optional().nullable(),
})

export type CreateFieldVisitInput = z.infer<typeof CreateFieldVisitSchema>

// ── Filter / list ─────────────────────────────────────────────────────────────

export const FieldVisitFilterSchema = z.object({
  staffId:       objectId.optional(),
  visitType:     z.nativeEnum(VisitType).optional(),
  distributorId: objectId.optional(),
  dealerId:      objectId.optional(),
  search:        z.string().optional(),
  from:          z.coerce.date().optional(),
  to:            z.coerce.date().optional(),
  page:          z.coerce.number().int().min(1).default(1),
  pageSize:      z.coerce.number().int().min(1).max(100).default(20),
})
export type FieldVisitFilterInput = z.infer<typeof FieldVisitFilterSchema>
