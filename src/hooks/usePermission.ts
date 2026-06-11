'use client'

import { useSession } from 'next-auth/react'
import { canPerform } from '@/lib/permissions'

// Returns true if the current user can perform the given permission string
export function usePermission(permission: string): boolean {
  const { data: session } = useSession()
  if (!session?.user?.role) return false
  return canPerform(session.user.role, permission)
}

// Returns a guard function for imperative checks
export function usePermissions() {
  const { data: session } = useSession()
  return {
    can: (permission: string) =>
      session?.user?.role ? canPerform(session.user.role, permission) : false,
    role: session?.user?.role ?? null,
  }
}
