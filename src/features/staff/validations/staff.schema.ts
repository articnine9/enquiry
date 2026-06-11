import { z } from 'zod'
import { UserRole } from '@/types/enums'

export const CreateStaffSchema = z.object({
  name:           z.string().min(2).max(100).trim(),
  email:          z.string().email().toLowerCase(),
  password:       z.string().min(8, 'Password must be at least 8 characters'),
  role:           z.nativeEnum(UserRole),
  locationZoneId: z.string().min(1, 'Location zone is required'),
  phone:          z.string().regex(/^\+?[\d\s\-()]{7,20}$/).optional().or(z.literal('')),
  maxLoad:        z.number().int().min(1).max(100).default(15),
})

export const UpdateStaffSchema = CreateStaffSchema
  .omit({ password: true })
  .partial()
  .extend({
    isAvailable: z.boolean().optional(),
  })

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>
