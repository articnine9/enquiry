import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import AppShell from '@/components/layout/AppShell'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | EnquiryPro' },
}

/**
 * Dashboard route group layout.
 *
 * Double-checks authentication at the RSC layer (middleware is the first line
 * of defence but Server Components should never trust it as their only guard).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // Guard: should never reach here due to middleware, but belt-and-braces
  if (!session?.user) redirect('/login')

  return (
    <AppShell
      user={{
        id:    session.user.id,
        name:  session.user.name ?? '',
        email: session.user.email ?? '',
        role:  session.user.role,
        image: session.user.image ?? undefined,
      }}
    >
      {children}
    </AppShell>
  )
}
