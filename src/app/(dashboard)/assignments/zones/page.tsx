import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, MapPin } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Zone Management' }

const ZoneManager = dynamic(
  () => import('@/features/assignments/components/ZoneManager')
)

export default async function ZonesPage() {
  await requireRole(UserRole.SuperAdmin)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Link
        href="/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to assignments
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Zone Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure location zones and coverage areas</p>
        </div>
      </div>

      <ZoneManager />
    </div>
  )
}
