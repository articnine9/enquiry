import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserCog } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
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
      {/* Back */}
      <Link
        href={`/staff/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to profile
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit {u.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{u.email}</p>
        </div>
      </div>

      <UserForm mode="edit" user={u} currentRole={session.user.role} />
    </div>
  )
}
