'use server'

import { signIn, signOut } from '@/lib/auth/auth'
import { AuthError as NextAuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import dbConnect from '@/lib/db/connection'
import { User, ActivityLog } from '@/lib/db/models'
import { getSession } from '@/lib/auth/session'
import { LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '../validations/auth.schema'
import { ActivityAction, EntityType } from '@/types/enums'
import type { ActionResult } from '@/types/api'
import type { LoginInput } from '../validations/auth.schema'
import crypto from 'crypto'

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginAction(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  // Parse and validate form input
  const raw = {
    email:    formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok:          false,
      error:       'Please correct the errors below',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    await signIn('credentials', {
      email:    parsed.data.email,
      password: parsed.data.password,
      redirect: false, // we handle redirect manually below
    })
  } catch (err) {
    if (err instanceof NextAuthError) {
      // Map NextAuth error codes to user-friendly messages
      switch (err.type) {
        case 'CredentialsSignin':
          return { ok: false, error: 'Invalid email or password' }
        case 'CallbackRouteError':
          return { ok: false, error: 'Authentication failed. Please try again.' }
        default:
          return { ok: false, error: 'Something went wrong. Please try again.' }
      }
    }
    throw err // re-throw unexpected errors
  }

  // Track login session (best-effort — don't block redirect on failure)
  try {
    const { getSession: getNewSession } = await import('@/lib/auth/session')
    const newSession = await getNewSession()
    if (newSession?.user?.id) {
      const { trackLoginAction } = await import('@/features/activity/actions/activity.actions')
      await trackLoginAction({ userId: newSession.user.id })
    }
  } catch { /* non-fatal */ }

  redirect('/dashboard')
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const session = await getSession()

  if (session?.user?.id) {
    // Track session end + record logout activity
    try {
      const { trackLogoutAction } = await import('@/features/activity/actions/activity.actions')
      await trackLogoutAction(session.user.id)
    } catch {
      // Fallback: at minimum log the logout action
      try {
        await dbConnect()
        await ActivityLog.create({
          actorId:    session.user.id,
          actorRole:  session.user.role,
          action:     ActivityAction.Logout,
          entityType: EntityType.User,
          entityId:   session.user.id,
        })
      } catch { /* non-fatal */ }
    }
  }

  await signOut({ redirectTo: '/login' })
}

// ── Forgot password ───────────────────────────────────────────────────────────

export async function forgotPasswordAction(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { ok: false, error: 'Enter a valid email address' }
  }

  try {
    await dbConnect()
    const user = await User.findOne({ email: parsed.data.email })

    // Always return success to prevent user enumeration attacks
    if (!user) {
      return { ok: true, data: null }
    }

    // Generate a secure token
    const token     = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken:   token,
      passwordResetExpires: expiresAt,
    })

    // TODO: send reset email via mailer.ts
    // await sendPasswordResetEmail(user.email, token)

    return { ok: true, data: null }
  } catch {
    return { ok: false, error: 'Failed to process request. Please try again.' }
  }
}

// ── Reset password ────────────────────────────────────────────────────────────

export async function resetPasswordAction(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const parsed = ResetPasswordSchema.safeParse({
    token:           formData.get('token'),
    password:        formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return {
      ok:          false,
      error:       'Please correct the errors below',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    await dbConnect()
    const user = await User.findOne({
      passwordResetToken:   parsed.data.token,
      passwordResetExpires: { $gt: new Date() }, // token not expired
    })

    if (!user) {
      return { ok: false, error: 'Reset link is invalid or has expired' }
    }

    const bcrypt = await import('bcryptjs')
    const hash   = await bcrypt.hash(parsed.data.password, 12)

    await User.findByIdAndUpdate(user._id, {
      passwordHash:          hash,
      passwordResetToken:    undefined,
      passwordResetExpires:  undefined,
    })

    return { ok: true, data: null }
  } catch {
    return { ok: false, error: 'Failed to reset password. Please try again.' }
  }
}
