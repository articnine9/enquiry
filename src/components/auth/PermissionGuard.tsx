/**
 * PermissionGuard — renders children only when the current user has the
 * specified permission string (checked via the permissions matrix).
 *
 * @example
 * <PermissionGuard permission="enquiry:assign">
 *   <AssignDropdown />
 * </PermissionGuard>
 */
'use client'

import { useAuth } from '@/features/auth/hooks/useAuth'

interface PermissionGuardProps {
  permission: string
  children:   React.ReactNode
  fallback?:  React.ReactNode
}

export default function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { can, isLoading } = useAuth()

  if (isLoading) return null
  if (!can(permission)) return <>{fallback}</>

  return <>{children}</>
}
