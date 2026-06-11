import { Metadata } from 'next'
import { requireSession } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import UserSession from '@/lib/db/models/UserSession'
import dbConnect from '@/lib/db/connection'
import DashboardClient from './_components/DashboardClient'

export const metadata: Metadata = { title: 'Dashboard' }

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Admin',
  [UserRole.Manager]:    'Manager',
  [UserRole.Staff]:      'Staff',
}

export default async function DashboardPage() {
  const session = await requireSession()
  const userId  = session.user.id
  const role    = session.user.role

  let sessionLoginAt: string | undefined
  try {
    await dbConnect()
    const active = await UserSession.findActiveSession(userId)
    if (active) sessionLoginAt = active.loginAt.toISOString()
  } catch { /* non-fatal */ }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Welcome back,{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {session.user.name}
            </span>
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
          {ROLE_LABEL[role] ?? role}
        </span>
      </div>

      <DashboardClient
        role={role}
        userId={userId}
        sessionLoginAt={sessionLoginAt}
      />
    </div>
  )
}
