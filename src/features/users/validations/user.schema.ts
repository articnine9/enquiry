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
})

export const UpdateUserSchema = z.object({
  name:           z.string().min(2).max(100).trim().optional(),
  email:          z.string().email().toLowerCase().trim().optional(),
  role:           z.nativeEnum(UserRole).optional(),
  status:         z.nativeEnum(UserStatus).optional(),
  phone:          z.string().max(20).optional(),
  locationZoneId: z.string().optional().nullable(),
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
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
