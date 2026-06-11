'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { logoutAction } from '../actions/auth.actions'
import { canPerform } from '@/lib/permissions'
import type { UserRole } from '@/types/enums'

/**
 * Primary auth hook for Client Components.
 *
 * Returns the current session user, loading state, and auth helpers.
 * Wraps next-auth/react useSession() with project-specific utilities.
 */
export function useAuth() {
  const { data: session, status } = useSession()
  const router                    = useRouter()
  const [isLoggingOut, startTransition] = useTransition()

  const isLoading       = status === 'loading'
  const isAuthenticated = status === 'authenticated'
  const user            = session?.user

  function logout() {
    startTransition(async () => {
      await logoutAction()
      router.push('/login')
    })
  }

  function can(permission: string): boolean {
    if (!user?.role) return false
    return canPerform(user.role as UserRole, permission)
  }

  function hasRole(...roles: UserRole[]): boolean {
    if (!user?.role) return false
    return roles.includes(user.role as UserRole)
  }

  return {
    user,
    role:            user?.role as UserRole | undefined,
    isLoading,
    isAuthenticated,
    isLoggingOut,
    logout,
    can,
    hasRole,
  }
}
