import { z } from 'zod'
import { UserRole, UserStatus } from '@/types/enums'

export const CreateUserSchema = z.object({
  name:           z.string().min(2).max(100).trim(),
  email:          z.string().email().toLowerCase().trim(),
  password:       z.string().min(8).max(100),
  role:           z.nativeEnum(UserRole),
  status:         z.nativeEnum(UserStatus).default(UserStatus.Active),
  phone:          z.string().max(20).optional(),
  locationZoneId: z.string().optional(),
  assignedDistricts: z.array(z.string().trim().min(1)).default([]),
  assignedTaluks:    z.array(z.string().trim().min(1)).default([]),
})

export const UpdateUserSchema = z.object({
  name:           z.string().min(2).max(100).trim().optional(),
  email:          z.string().email().toLowerCase().trim().optional(),
  role:           z.nativeEnum(UserRole).optional(),
  status:         z.nativeEnum(UserStatus).optional(),
  phone:          z.string().max(20).optional(),
  locationZoneId: z.string().optional().nullable(),
  assignedDistricts: z.array(z.string().trim().min(1)).optional(),
  assignedTaluks:    z.array(z.string().trim().min(1)).optional(),
})

// Self-service — deliberately excludes role/status/locationZoneId, which are
// admin-only concerns set via UpdateUserSchema on the Staff management page.
export const UpdateOwnProfileSchema = z.object({
  name:  z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().max(20).trim().optional().or(z.literal('')).transform((v) => v || undefined),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(100),
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must differ from current password',
  path:    ['newPassword'],
})

export const AdminResetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100),
})

export type CreateUserInput  = z.infer<typeof CreateUserSchema>
export type UpdateUserInput  = z.infer<typeof UpdateUserSchema>
export type UpdateOwnProfileInput = z.infer<typeof UpdateOwnProfileSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
