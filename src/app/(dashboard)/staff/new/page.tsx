import { UserPlus } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { UserRole } from '@/types/enums'
import UserForm from '@/features/users/components/UserForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add Staff' }

export default async function NewStaffPage() {
  const session = await requireRole(UserRole.SuperAdmin)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        icon={UserPlus}
        title="Add staff member"
        subtitle="Create a new account"
        backHref="/staff"
        backLabel="Back to staff"
      />

      <UserForm mode="create" currentRole={session.user.role} />
    </div>
  )
}
