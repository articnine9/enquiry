import { z } from 'zod'

// ── Login ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .min(1, 'Email is required')
    .email('Enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof LoginSchema>

// ── Forgot password ───────────────────────────────────────────────────────────

export const ForgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Enter a valid email address')
    .toLowerCase()
    .trim(),
})

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>

// ── Reset password ────────────────────────────────────────────────────────────

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  })

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
