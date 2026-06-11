/**
 * NextAuth catch-all route handler.
 * Handles GET /api/auth/session, /api/auth/csrf, /api/auth/providers
 * and POST /api/auth/callback/credentials, /api/auth/signout etc.
 */
import { handlers } from '@/lib/auth/auth'

export const { GET, POST } = handlers

// Opt out of static generation — auth routes are always dynamic
export const dynamic = 'force-dynamic'
