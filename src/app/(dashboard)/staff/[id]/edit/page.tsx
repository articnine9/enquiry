import { notFound } from 'next/navigation'
import { UserCog } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { UserRole } from '@/types/enums'
import { getUserAction } from '@/features/users/actions/user.actions'
import UserForm from '@/features/users/components/UserForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Edit Staff' }

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)
  const userRes = await getUserAction(id)

  if (!userRes.ok) notFound()

  const u = userRes.data

  // Managers can only edit their zone's staff
  if (
    session.user.role === UserRole.Manager &&
    u.role !== UserRole.Staff
  ) {
    notFound()
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        icon={UserCog}
        title={`Edit ${u.name}`}
        subtitle={u.email}
        backHref={`/staff/${id}`}
        backLabel="Back to profile"
      />

      <UserForm mode="edit" user={u} currentRole={session.user.role} />
    </div>
  )
}
