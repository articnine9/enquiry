import dynamic from 'next/dynamic'
import { CalendarClock } from 'lucide-react'
import { requireSession } from '@/lib/auth/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Follow-ups' }

const FollowUpsClient = dynamic(
  () => import('./_components/FollowUpsClient')
)

export default async function FollowUpsPage() {
  const session = await requireSession()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <CalendarClock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Follow-ups</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage all scheduled follow-ups</p>
        </div>
      </div>

      <FollowUpsClient userId={session.user.id} role={session.user.role} />
    </div>
  )
}
