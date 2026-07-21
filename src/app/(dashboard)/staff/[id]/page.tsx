import { notFound } from 'next/navigation'
import Link from 'next/link'
import { User, Edit2, MapPin } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { UserRole, UserStatus } from '@/types/enums'
import { getUserAction } from '@/features/users/actions/user.actions'
import { getEntityAuditLogsAction } from '@/features/audit/actions/audit.actions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Staff Profile' }

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Admin',
  [UserRole.Manager]:    'Manager',
  [UserRole.Staff]:      'Staff',
}

const STATUS_COLOR: Record<UserStatus, string> = {
  [UserStatus.Active]:    'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  [UserStatus.Inactive]:  'text-slate-500 bg-slate-100 dark:bg-slate-800',
  [UserStatus.Suspended]: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  const [userRes, auditRes] = await Promise.all([
    getUserAction(id),
    getEntityAuditLogsAction(id, 'user'),
  ])

  if (!userRes.ok) notFound()

  const u     = userRes.data
  const logs  = auditRes.ok ? auditRes.data : []
  const canEdit = session.user.role === UserRole.SuperAdmin ||
    (session.user.role === UserRole.Manager && u.role === UserRole.Staff)

  const coverage = [u.district, u.city].filter(Boolean).join(' / ')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        icon={User}
        title="Staff Profile"
        subtitle={`${u.name} · ${ROLE_LABEL[u.role]}`}
        backHref="/staff"
        backLabel="Back to staff"
      />

      {/* Profile card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl font-bold text-indigo-700 dark:text-indigo-400">
              {initials(u.name)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{u.name}</h1>
              <p className="text-sm text-slate-500">{u.email}</p>
              {u.phone && <p className="text-sm text-slate-500">{u.phone}</p>}
            </div>
          </div>
          {canEdit && (
            <Link
              href={`/staff/${u._id}/edit`}
              className="flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Link>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Role</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{ROLE_LABEL[u.role]}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Status</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[u.status]}`}>
              {u.status}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Zone</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{u.zoneName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Coverage
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{coverage || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Last login</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {u.lastLoginAt
                ? new Date(u.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Never'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Audit trail */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity history</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((log) => (
              <div key={log._id} className="px-5 py-3 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{log.actorName ?? 'System'}</span>
                    {' — '}
                    <span className="capitalize">{log.action.replace(/_/g, ' ')}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
