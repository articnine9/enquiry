/**
 * session.ts
 *
 * Server-side session helpers.
 * Import these in Server Components, Server Actions, and Route Handlers.
 * Never import in Client Components — use next-auth/react useSession() instead.
 */
import { auth } from './auth'
import { canPerform } from '@/lib/permissions'
import { UserRole } from '@/types/enums'
import type { Session } from 'next-auth'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuthSession = Session & {
  user: {
    id:             string
    name:           string
    email:          string
    role:           UserRole
    locationZoneId: string | null
  }
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN'
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the current session or null — never throws.
 * Use in Server Components that render differently for guests vs logged-in users.
 */
export async function getSession(): Promise<AuthSession | null> {
  return auth() as Promise<AuthSession | null>
}

/**
 * Returns the session or throws AuthError('UNAUTHORIZED').
 * Use as the first line of every protected Server Action.
 *
 * @example
 * const session = await requireSession()
 * // session.user.id, session.user.role are guaranteed to exist
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await auth() as AuthSession | null
  if (!session?.user?.id) {
    throw new AuthError('You must be logged in to perform this action', 'UNAUTHORIZED')
  }
  return session
}

/**
 * Requires the user to hold one of the listed roles.
 * Throws AuthError('FORBIDDEN') otherwise.
 *
 * @example
 * const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthSession> {
  const session = await requireSession()
  if (!roles.includes(session.user.role)) {
    throw new AuthError(
      `Role "${session.user.role}" is not allowed to perform this action`,
      'FORBIDDEN'
    )
  }
  return session
}

/**
 * Requires the user to have a specific permission string.
 * Uses the permissions matrix in lib/permissions.ts.
 *
 * @example
 * const session = await requirePermission('enquiry:assign')
 */
export async function requirePermission(permission: string): Promise<AuthSession> {
  const session = await requireSession()
  if (!canPerform(session.user.role, permission)) {
    throw new AuthError(
      `Permission "${permission}" denied for role "${session.user.role}"`,
      'FORBIDDEN'
    )
  }
  return session
}

/**
 * Converts an AuthError into a typed ActionResult-style response.
 * Use in Server Actions to avoid unhandled throws reaching the client.
 *
 * @example
 * } catch (err) {
 *   return authErrorToResult(err)
 * }
 */
export function authErrorToResult(err: unknown): { ok: false; error: string } {
  if (err instanceof AuthError) {
    return { ok: false, error: err.message }
  }
  return { ok: false, error: 'An unexpected error occurred' }
}
