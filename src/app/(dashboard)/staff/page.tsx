import dynamic from 'next/dynamic'
import Link from 'next/link'
import { UserPlus, Users } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
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
      <PageHeader
        icon={Users}
        title="Staff"
        subtitle="Manage users, permissions, and coverage areas"
        actions={
          session.user.role === UserRole.SuperAdmin && (
            <Link
              href="/staff/new"
              className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-white text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add staff
            </Link>
          )
        }
      />

      <StaffListClient
        currentUserId={session.user.id}
        currentRole={session.user.role}
      />
    </div>
  )
}
