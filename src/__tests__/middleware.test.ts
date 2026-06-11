/**
 * Middleware RBAC unit tests.
 *
 * We test the route-rule logic in isolation without spinning up a Next.js server.
 * The ROLE_ROUTES table is the critical contract being verified.
 */
import { UserRole } from '@/types/enums'

// ── Mirror the ROLE_ROUTES table from middleware.ts ────────────────────────────
// (Kept in sync manually — consider extracting to a shared constant if it drifts)

type RouteRule = { pattern: RegExp; roles: UserRole[] }

const ROLE_ROUTES: RouteRule[] = [
  { pattern: /^\/settings\/roles(\/|$)/,  roles: [UserRole.SuperAdmin] },
  { pattern: /^\/settings\/zones(\/|$)/,  roles: [UserRole.SuperAdmin] },
  { pattern: /^\/staff(\/|$)/,            roles: [UserRole.SuperAdmin, UserRole.Manager] },
  { pattern: /^\/assignments(\/|$)/,      roles: [UserRole.SuperAdmin, UserRole.Manager] },
  { pattern: /^\/reports(\/|$)/,          roles: [UserRole.SuperAdmin, UserRole.Manager] },
  { pattern: /^\/dashboard(\/|$)/,        roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
  { pattern: /^\/enquiries(\/|$)/,        roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
  { pattern: /^\/follow-ups(\/|$)/,       roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
  { pattern: /^\/settings(\/|$)/,         roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
]

function isAllowed(role: UserRole, pathname: string): boolean {
  for (const rule of ROLE_ROUTES) {
    if (rule.pattern.test(pathname)) {
      return rule.roles.includes(role)
    }
  }
  return true // no matching rule → no restriction
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Middleware RBAC — route access', () => {
  describe('SuperAdmin', () => {
    it('can access /settings/roles', () => expect(isAllowed(UserRole.SuperAdmin, '/settings/roles')).toBe(true))
    it('can access /settings/zones', () => expect(isAllowed(UserRole.SuperAdmin, '/settings/zones')).toBe(true))
    it('can access /staff',          () => expect(isAllowed(UserRole.SuperAdmin, '/staff')).toBe(true))
    it('can access /reports',        () => expect(isAllowed(UserRole.SuperAdmin, '/reports')).toBe(true))
  })

  describe('Manager', () => {
    it('can access /staff',              () => expect(isAllowed(UserRole.Manager, '/staff')).toBe(true))
    it('can access /assignments',        () => expect(isAllowed(UserRole.Manager, '/assignments')).toBe(true))
    it('can access /reports',            () => expect(isAllowed(UserRole.Manager, '/reports')).toBe(true))
    it('cannot access /settings/roles',  () => expect(isAllowed(UserRole.Manager, '/settings/roles')).toBe(false))
    it('cannot access /settings/zones',  () => expect(isAllowed(UserRole.Manager, '/settings/zones')).toBe(false))
  })

  describe('Staff', () => {
    it('can access /dashboard',          () => expect(isAllowed(UserRole.Staff, '/dashboard')).toBe(true))
    it('can access /enquiries',          () => expect(isAllowed(UserRole.Staff, '/enquiries')).toBe(true))
    it('can access /follow-ups',         () => expect(isAllowed(UserRole.Staff, '/follow-ups')).toBe(true))
    it('can access /settings',           () => expect(isAllowed(UserRole.Staff, '/settings')).toBe(true))
    it('cannot access /staff',           () => expect(isAllowed(UserRole.Staff, '/staff')).toBe(false))
    it('cannot access /assignments',     () => expect(isAllowed(UserRole.Staff, '/assignments')).toBe(false))
    it('cannot access /reports',         () => expect(isAllowed(UserRole.Staff, '/reports')).toBe(false))
    it('cannot access /settings/roles',  () => expect(isAllowed(UserRole.Staff, '/settings/roles')).toBe(false))
    it('cannot access /settings/zones',  () => expect(isAllowed(UserRole.Staff, '/settings/zones')).toBe(false))
  })

  describe('Nested routes', () => {
    it('blocks /staff/123/edit for Staff',     () => expect(isAllowed(UserRole.Staff, '/staff/123/edit')).toBe(false))
    it('allows /reports/staff-performance for Manager', () =>
      expect(isAllowed(UserRole.Manager, '/reports/staff-performance')).toBe(true))
  })
})
