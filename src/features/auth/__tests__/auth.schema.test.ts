import { LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '../validations/auth.schema'

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'admin@test.com', password: 'Secret@123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('admin@test.com') // lowercased
    }
  })

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'Secret@123' })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: 'short' })
    expect(result.success).toBe(false)
  })
})

describe('ResetPasswordSchema', () => {
  it('accepts a strong matching password', () => {
    const result = ResetPasswordSchema.safeParse({
      token:           'abc123',
      password:        'NewPass@1',
      confirmPassword: 'NewPass@1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = ResetPasswordSchema.safeParse({
      token:           'abc123',
      password:        'NewPass@1',
      confirmPassword: 'Different@1',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors
      expect(fields.confirmPassword).toBeDefined()
    }
  })

  it('rejects weak password (no special char)', () => {
    const result = ResetPasswordSchema.safeParse({
      token:           'abc123',
      password:        'WeakPass1',
      confirmPassword: 'WeakPass1',
    })
    expect(result.success).toBe(false)
  })
})
