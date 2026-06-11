import { canPerform, assertPermission } from '@/lib/permissions'
import { UserRole } from '@/types/enums'

describe('canPerform', () => {
  it('super_admin can do anything', () => {
    expect(canPerform(UserRole.SuperAdmin, 'enquiry:delete')).toBe(true)
    expect(canPerform(UserRole.SuperAdmin, 'user:create')).toBe(true)
  })

  it('manager can assign enquiries', () => {
    expect(canPerform(UserRole.Manager, 'enquiry:assign')).toBe(true)
  })

  it('staff cannot assign enquiries', () => {
    expect(canPerform(UserRole.Staff, 'enquiry:assign')).toBe(false)
  })

  it('staff can update status', () => {
    expect(canPerform(UserRole.Staff, 'enquiry:update_status')).toBe(true)
  })
})

describe('assertPermission', () => {
  it('does not throw when allowed', () => {
    expect(() =>
      assertPermission(UserRole.Manager, 'enquiry:read')
    ).not.toThrow()
  })

  it('throws when denied', () => {
    expect(() =>
      assertPermission(UserRole.Staff, 'enquiry:assign')
    ).toThrow('Forbidden')
  })
})
