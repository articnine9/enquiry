import { UserRole } from '@/types/enums'

// ─── Permission matrix ────────────────────────────────────────────────────────
// Defines what each role can do. Used in Server Actions and middleware.
// Format: 'resource:action'

const PERMISSIONS: Record<UserRole, Set<string>> = {
  [UserRole.SuperAdmin]: new Set(['*']),

  [UserRole.Manager]: new Set([
    'enquiry:read',
    'enquiry:create',
    'enquiry:update',
    'enquiry:assign',
    'enquiry:reassign',
    'enquiry:close',
    'enquiry:cancel',
    'followup:read',
    'followup:create',
    'followup:update',
    'assignment:read',
    'assignment:create',
    'assignment:update',
    'user:read',
    'report:read',
    'report:export',
    'notification:read',
    'notification:update',
    'visit:read',
    'visit:create',
  ]),

  [UserRole.Staff]: new Set([
    'enquiry:read',
    'enquiry:update_status',
    'followup:read',
    'followup:create',
    'followup:update',
    'assignment:read',
    'report:read',
    'notification:read',
    'notification:update',
    'visit:read',
    'visit:create',
  ]),
}

/**
 * Returns true if `role` is allowed to perform `permission`.
 *
 * @example
 * canPerform(UserRole.Manager, 'enquiry:assign') // true
 * canPerform(UserRole.Staff,   'enquiry:assign') // false
 */
export function canPerform(role: UserRole, permission: string): boolean {
  const perms = PERMISSIONS[role]
  if (!perms) return false
  if (perms.has('*')) return true
  if (perms.has(permission)) return true

  // Wildcard resource check: 'enquiry:*' covers 'enquiry:read'
  const [resource] = permission.split(':')
  return perms.has(`${resource}:*`)
}

/**
 * Throws a typed error if the role does not have the permission.
 * Use in Server Actions for a fail-fast guard.
 */
export function assertPermission(role: UserRole, permission: string): void {
  if (!canPerform(role, permission)) {
    throw new Error(`Forbidden: role "${role}" cannot perform "${permission}"`)
  }
}

/**
 * Returns all permissions granted to a role.
 */
export function getPermissions(role: UserRole): string[] {
  return [...(PERMISSIONS[role] ?? [])]
}
