import { z } from 'zod'
import { ComplaintType, ComplaintStatus } from '@/types/enums'

// ── Shared atoms ──────────────────────────────────────────────────────────────

const objectId = z
  .string({ required_error: 'ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format')

const phoneField = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .min(7,  'Phone number must be at least 7 characters')
  .max(20, 'Phone number cannot exceed 20 characters')
  .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format')

// ── Create ────────────────────────────────────────────────────────────────────

export const CreateComplaintSchema = z.object({
  customerName: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(2,   'Name must be at least 2 characters')
    .max(150, 'Name cannot exceed 150 characters'),
  phone: phoneField,

  complaintType: z.nativeEnum(ComplaintType, {
    errorMap: () => ({ message: 'Please select a complaint type' }),
  }),

  complaintDate: z.coerce
    .date({ required_error: 'Complaint date is required' })
    .refine((d) => d.getTime() <= Date.now() + 24 * 60 * 60 * 1000, {
      message: 'Complaint date cannot be more than a day in the future',
    }),

  description: z
    .string({ required_error: 'Complaint details are required' })
    .trim()
    .min(5,    'Description must be at least 5 characters')
    .max(3000, 'Description cannot exceed 3000 characters'),

  enquiryId: objectId.optional().nullable().transform((v) => v || undefined),
})

export type CreateComplaintInput = z.infer<typeof CreateComplaintSchema>

// ── Status update ─────────────────────────────────────────────────────────────

export const UpdateComplaintStatusSchema = z
  .object({
    id:     objectId,
    status: z.nativeEnum(ComplaintStatus, {
      errorMap: () => ({ message: 'Select a valid status' }),
    }),
    resolutionNotes: z
      .string()
      .trim()
      .max(3000, 'Resolution notes cannot exceed 3000 characters')
      .optional()
      .transform((v) => v || undefined),
    assignedTo: objectId.optional().nullable().transform((v) => v || undefined),
  })
  .refine(
    (d) => d.status !== ComplaintStatus.Resolved || !!d.resolutionNotes,
    { path: ['resolutionNotes'], message: 'Resolution notes are required when marking a complaint resolved' }
  )

export type UpdateComplaintStatusInput = z.infer<typeof UpdateComplaintStatusSchema>

// ── Filter / list ─────────────────────────────────────────────────────────────

export const ComplaintFilterSchema = z.object({
  search:        z.string().trim().optional(),
  complaintType: z.nativeEnum(ComplaintType).optional(),
  status:        z.nativeEnum(ComplaintStatus).optional(),
  assignedTo:    objectId.optional(),
  distributorId: objectId.optional(),
  dealerId:      objectId.optional(),
  page:          z.coerce.number().int().min(1).default(1),
  pageSize:      z.coerce.number().int().min(1).max(100).default(20),
})
export type ComplaintFilterInput = z.infer<typeof ComplaintFilterSchema>
