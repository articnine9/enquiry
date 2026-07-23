/**
 * middleware.ts  (Next.js Edge Middleware)
 *
 * Two-phase protection:
 *   Phase 1 — authConfig.authorized() callback: unauthenticated → /login
 *   Phase 2 — ROLE_ROUTES table below: wrong role → /dashboard (soft redirect)
 *
 * IMPORTANT: imports ONLY from auth.config.ts — that file has zero Node.js-only
 * dependencies, so it runs safely in the Edge runtime. Never import from auth.ts
 * here (it pulls in Mongoose + bcrypt which require Node streams).
 */
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/auth.config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { UserRole } from '@/types/enums'

// Edge-safe auth instance — uses authConfig only (no Credentials provider, no DB)
const { auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
})

// ── Role-restricted route table ───────────────────────────────────────────────

type RouteRule = {
  pattern:   RegExp
  roles:     UserRole[]
  redirect?: string
}

const ROLE_ROUTES: RouteRule[] = [
  // Super Admin only
  { pattern: /^\/settings\/roles(\/|$)/,  roles: [UserRole.SuperAdmin] },
  { pattern: /^\/settings\/zones(\/|$)/,  roles: [UserRole.SuperAdmin] },
  { pattern: /^\/audit(\/|$)/,            roles: [UserRole.SuperAdmin] },

  // Manager and above
  { pattern: /^\/staff(\/|$)/,       roles: [UserRole.SuperAdmin, UserRole.Manager] },
  { pattern: /^\/assignments(\/|$)/, roles: [UserRole.SuperAdmin, UserRole.Manager] },
  { pattern: /^\/activity(\/|$)/,    roles: [UserRole.SuperAdmin, UserRole.Manager] },

  // All authenticated users
  { pattern: /^\/dashboard(\/|$)/,   roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
  { pattern: /^\/enquiries(\/|$)/,   roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
  { pattern: /^\/follow-ups(\/|$)/,  roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
  { pattern: /^\/settings(\/|$)/,    roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
  // Reports: page-level gate is finer-grained (Staff sees only the Staff tab,
  // scoped to their own data) — see src/app/(dashboard)/reports/page.tsx.
  { pattern: /^\/reports(\/|$)/,     roles: [UserRole.SuperAdmin, UserRole.Manager, UserRole.Staff] },
]

// ── Basic in-memory rate limiter for /login ───────────────────────────────────

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS   = 10
const LOGIN_WINDOW_SECONDS = 60

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_SECONDS * 1000 })
    return false
  }

  entry.count++
  return entry.count > MAX_LOGIN_ATTEMPTS
}

// ── Middleware ────────────────────────────────────────────────────────────────

export default auth((req) => {
  const { pathname } = req.nextUrl
  const role = req.auth?.user?.role as UserRole | undefined

  // Rate-limit login POST
  if (pathname === '/login' && req.method === 'POST') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return new NextResponse('Too many login attempts. Please try again later.', {
        status:  429,
        headers: { 'Retry-After': String(LOGIN_WINDOW_SECONDS) },
      })
    }
  }

  // Phase 2: RBAC (Phase 1 auth guard is in authConfig.authorized())
  if (role) {
    for (const rule of ROLE_ROUTES) {
      if (rule.pattern.test(pathname)) {
        if (!rule.roles.includes(role)) {
          return NextResponse.redirect(new URL(rule.redirect ?? '/dashboard', req.url))
        }
        break
      }
    }
  }

  // Security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)')

  return response
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
}
