import { z } from 'zod'

const phoneField = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .min(7, 'Phone number must be at least 7 characters')
  .max(20, 'Phone number cannot exceed 20 characters')
  .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format')

const emailField = z
  .string()
  .trim()
  .email('Invalid email address')
  .toLowerCase()
  .optional()
  .or(z.literal(''))

// ─── Distributor ──────────────────────────────────────────────────────────────

export const DistributorInputSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2).max(150),
  code: z.string({ required_error: 'Code is required' })
    .trim().toUpperCase()
    .regex(/^[A-Z0-9_-]{2,30}$/, 'Code must be 2–30 uppercase alphanumeric characters'),
  territory:    z.string({ required_error: 'Territory is required' }).trim().min(2).max(150),
  contactName:  z.string({ required_error: 'Contact name is required' }).trim().min(2).max(150),
  contactPhone: phoneField,
  contactEmail: emailField,
  address:      z.string().trim().max(300).optional().or(z.literal('')),
  assignedDistricts: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
})

export type DistributorInput = z.infer<typeof DistributorInputSchema>

// ─── Dealer ───────────────────────────────────────────────────────────────────

const ServiceLocationSchema = z.object({
  district: z.string().trim().min(1, 'District is required'),
  city:     z.string().trim().optional().or(z.literal('')),
})

export const DealerInputSchema = z.object({
  name:          z.string({ required_error: 'Name is required' }).trim().min(2).max(150),
  distributorId: z.string({ required_error: 'Distributor is required' }).min(1),
  contactName:   z.string({ required_error: 'Contact name is required' }).trim().min(2).max(150),
  contactPhone:  phoneField,
  contactEmail:  emailField,
  address:       z.string().trim().max(300).optional().or(z.literal('')),
  serviceLocations: z.array(ServiceLocationSchema).default([]),
  isActive: z.boolean().default(true),
})

export type DealerInput = z.infer<typeof DealerInputSchema>
