/**
 * auth.config.ts
 *
 * Pure NextAuth configuration object — no Mongoose imports so it can run
 * safely in the Edge runtime (used by middleware.ts).
 *
 * The actual credential verification (bcrypt, DB lookup) happens in auth.ts
 * which runs only in the Node.js runtime.
 */
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  // ── Pages ─────────────────────────────────────────────────────────────────
  pages: {
    signIn:  '/login',
    signOut: '/login',
    error:   '/login',     // error query param appended automatically
  },

  // ── Session ───────────────────────────────────────────────────────────────
  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 hours
  },

  // ── JWT ───────────────────────────────────────────────────────────────────
  jwt: {
    maxAge: 8 * 60 * 60,
  },

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    /**
     * jwt() — called whenever a JWT is created or updated.
     * We embed custom claims on first sign-in so the session callback can read them.
     */
    jwt({ token, user }) {
      if (user) {
        // user is only populated on the initial sign-in
        token.id             = user.id as string
        token.role           = user.role
        token.locationZoneId = user.locationZoneId ?? null
        token.name           = user.name ?? ''
        token.email          = user.email ?? ''
      }
      return token
    },

    /**
     * session() — shapes the client-facing session object.
     * Only expose what the UI needs — never forward passwordHash or internal fields.
     */
    session({ session, token }) {
      if (token) {
        session.user.id             = token.id as string
        session.user.role           = token.role as import('@/types/enums').UserRole
        session.user.locationZoneId = token.locationZoneId as string | null
        session.user.name           = token.name as string
        session.user.email          = token.email as string
      }
      return session
    },

    /**
     * authorized() — called by middleware on every request.
     * Returning false triggers a redirect to the signIn page.
     * Returning true allows the request to proceed; the middleware then
     * performs the more granular RBAC checks.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user

      const publicPaths = [
        '/login',
        '/forgot-password',
        '/reset-password',
        '/api/enquiries/public',
        '/api/auth',
        '/api/webhooks',
      ]

      const isPublic = publicPaths.some((p) => nextUrl.pathname.startsWith(p))
      if (isPublic) return true

      return isLoggedIn
    },
  },

  // ── Providers ─────────────────────────────────────────────────────────────
  // Providers that require only Edge-compatible code go here.
  // The Credentials provider is added in auth.ts (Node.js only).
  providers: [],
}
