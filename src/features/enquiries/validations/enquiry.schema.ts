import { z } from 'zod'
import {
  EnquiryStatus,
  EnquiryPriority,
  EnquiryCategory,
} from '@/types/enums'

// ─── Re-usable field definitions ─────────────────────────────────────────────

const phoneField = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .min(7,  'Phone number must be at least 7 characters')
  .max(20, 'Phone number cannot exceed 20 characters')
  .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format')

const emailField = z
  .string()
  .trim()
  .email('Invalid email address')
  .toLowerCase()
  .optional()
  .or(z.literal(''))

const pincodeField = z
  .string({ required_error: 'Pincode is required' })
  .trim()
  .regex(/^\d{5,10}$/, 'Pincode must be 5–10 digits')

// ─── Create ───────────────────────────────────────────────────────────────────

export const CreateEnquirySchema = z.object({
  // Customer
  customerName: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(2,   'Name must be at least 2 characters')
    .max(150, 'Name cannot exceed 150 characters'),
  phone:    phoneField,
  email:    emailField,
  address: z
    .string({ required_error: 'Address is required' })
    .trim()
    .min(5,   'Address must be at least 5 characters')
    .max(300, 'Address cannot exceed 300 characters'),
  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2,   'City must be at least 2 characters')
    .max(100, 'City cannot exceed 100 characters'),
  district: z
    .string({ required_error: 'District is required' })
    .trim()
    .min(2,   'District must be at least 2 characters')
    .max(100, 'District cannot exceed 100 characters'),
  pincode:  pincodeField,
  location: z
    .string({ required_error: 'Location is required' })
    .trim()
    .min(2,   'Location must be at least 2 characters')
    .max(200, 'Location cannot exceed 200 characters'),

  // Enquiry meta — validated as free strings here; the action verifies each
  // value exists and is active in the MasterData collection.
  enquirySource: z
    .string({ required_error: 'Select an enquiry source' })
    .trim()
    .min(1, 'Select an enquiry source'),
  category: z
    .string()
    .trim()
    .min(1, 'Select a category')
    .default(EnquiryCategory.General),
  product: z
    .string({ required_error: 'Select a product' })
    .trim()
    .min(1, 'Select a product'),
  priority: z
    .string()
    .trim()
    .min(1, 'Select a priority')
    .default(EnquiryPriority.Medium),

  // Detail
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(5,   'Subject must be at least 5 characters')
    .max(200, 'Subject cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(5000, 'Description cannot exceed 5000 characters')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string().trim().min(1))
    .max(10, 'Cannot have more than 10 tags')
    .default([]),
})

export type CreateEnquiryInput = z.infer<typeof CreateEnquirySchema>

// ─── Update (all fields optional, plus internalNotes) ────────────────────────

export const UpdateEnquirySchema = CreateEnquirySchema
  .partial()
  .extend({
    internalNotes: z
      .string()
      .max(2000, 'Internal notes cannot exceed 2000 characters')
      .optional()
      .or(z.literal('')),
  })

export type UpdateEnquiryInput = z.infer<typeof UpdateEnquirySchema>

// ─── Status update ────────────────────────────────────────────────────────────

export const UpdateStatusSchema = z.object({
  id:     z.string().min(1, 'Enquiry ID is required'),
  status: z.nativeEnum(EnquiryStatus, {
    errorMap: () => ({ message: 'Select a valid status' }),
  }),
  note: z
    .string()
    .max(500, 'Status note cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
})

export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>

// ─── Search / filter params ───────────────────────────────────────────────────

export const EnquiryFilterSchema = z.object({
  search:        z.string().trim().optional(),
  status:        z.nativeEnum(EnquiryStatus).optional(),
  priority:      z.string().trim().optional(),
  enquirySource: z.string().trim().optional(),
  product:       z.string().trim().optional(),
  category:      z.string().trim().optional(),
  assignedTo:    z.string().optional(),
  city:          z.string().trim().optional(),
  district:      z.string().trim().optional(),
  dateFrom:      z.string().optional(),   // ISO date string
  dateTo:        z.string().optional(),
  page:          z.coerce.number().int().min(1).default(1),
  pageSize:      z.coerce.number().int().min(1).max(100).default(20),
  sortBy:        z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'customerName']).default('createdAt'),
  sortOrder:     z.enum(['asc', 'desc']).default('desc'),
})

export type EnquiryFilterInput = z.infer<typeof EnquiryFilterSchema>

// ─── Assign ───────────────────────────────────────────────────────────────────

export const AssignEnquirySchema = z.object({
  enquiryId: z.string().min(1, 'Enquiry ID is required'),
  staffId:   z.string().min(1, 'Staff member is required'),
  reason:    z.string().max(500).optional().or(z.literal('')),
})

export type AssignEnquiryInput = z.infer<typeof AssignEnquirySchema>
