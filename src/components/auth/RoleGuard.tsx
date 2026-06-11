/**
 * RoleGuard — conditionally renders children based on the current user's role.
 *
 * Use this in Client Components where you want to show/hide UI elements
 * without a full page redirect. For page-level protection, rely on middleware.ts.
 *
 * @example
 * // Only Super Admin and Manager see the Assign button
 * <RoleGuard roles={[UserRole.SuperAdmin, UserRole.Manager]}>
 *   <AssignButton />
 * </RoleGuard>
 *
 * @example
 * // Render a fallback for unauthorised users
 * <RoleGuard roles={[UserRole.SuperAdmin]} fallback={<p>Admins only</p>}>
 *   <DangerZone />
 * </RoleGuard>
 */
'use client'

import { useAuth } from '@/features/auth/hooks/useAuth'
import type { UserRole } from '@/types/enums'

interface RoleGuardProps {
  roles:     UserRole[]
  children:  React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { hasRole, isLoading } = useAuth()

  if (isLoading) return null          // avoid flash of wrong content
  if (!hasRole(...roles)) return <>{fallback}</>

  return <>{children}</>
}
