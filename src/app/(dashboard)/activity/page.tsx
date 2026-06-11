import dynamic from 'next/dynamic'
import { Activity } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Activity' }

const ActivityDashboard = dynamic(
  () => import('@/features/activity/components/ActivityDashboard')
)

export default async function ActivityPage() {
  const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Activity</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track team productivity and engagement</p>
        </div>
      </div>

      <ActivityDashboard
        userId={session.user.id}
        role={session.user.role}
      />
    </div>
  )
}
