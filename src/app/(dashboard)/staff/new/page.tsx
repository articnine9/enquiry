import { ArrowLeft, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import UserForm from '@/features/users/components/UserForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add Staff' }

export default async function NewStaffPage() {
  const session = await requireRole(UserRole.SuperAdmin)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Back */}
      <Link
        href="/staff"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to staff
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add staff member</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create a new account</p>
        </div>
      </div>

      <UserForm mode="create" currentRole={session.user.role} />
    </div>
  )
}
