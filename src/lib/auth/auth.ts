/**
 * auth.ts
 *
 * Full NextAuth initialisation — runs in the Node.js runtime only.
 * Imports Mongoose models and bcrypt (not Edge-compatible).
 *
 * Export { auth, signIn, signOut, handlers } and use throughout the app.
 */
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import dbConnect from '@/lib/db/connection'
import { User } from '@/lib/db/models'
import { UserStatus } from '@/types/enums'
import { LoginSchema } from '@/features/auth/validations/auth.schema'

export const { auth, signIn, signOut, handlers, unstable_update } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      name: 'credentials',

      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        // ── 1. Validate shape ────────────────────────────────────────────────
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        // ── 2. Find user ─────────────────────────────────────────────────────
        await dbConnect()
        const user = await User
          .findOne({ email: parsed.data.email.toLowerCase() })
          .select('+passwordHash') // passwordHash is excluded by default
          .lean()

        if (!user) {
          // Constant-time dummy compare prevents user enumeration
          await bcrypt.compare(parsed.data.password, '$2b$12$placeholder.hash.for.timing')
          return null
        }

        // ── 3. Check account status ──────────────────────────────────────────
        if (user.status !== UserStatus.Active) return null

        // ── 4. Verify password ───────────────────────────────────────────────
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        // ── 5. Update last login timestamp (fire and forget) ─────────────────
        User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec()

        // ── 6. Return user object (mapped to NextAuth User shape) ─────────────
        return {
          id:             String(user._id),
          name:           user.name,
          email:          user.email,
          role:           user.role,
          locationZoneId: user.locationZoneId ? String(user.locationZoneId) : null,
          image:          user.avatar ?? null,
        }
      },
    }),
  ],
})
