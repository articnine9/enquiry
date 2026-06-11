import dynamic from 'next/dynamic'
import Link from 'next/link'
import { UserPlus, Users } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Staff' }

const StaffListClient = dynamic(
  () => import('@/features/users/components/StaffListClient')
)

export default async function StaffPage() {
  const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage users and permissions</p>
          </div>
        </div>
        {session.user.role === UserRole.SuperAdmin && (
          <Link
            href="/staff/new"
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add staff
          </Link>
        )}
      </div>

      <StaffListClient
        currentUserId={session.user.id}
        currentRole={session.user.role}
      />
    </div>
  )
}
