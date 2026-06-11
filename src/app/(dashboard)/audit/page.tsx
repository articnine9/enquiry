import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Shield } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit Logs' }

const AuditLogClient = dynamic(
  () => import('@/features/audit/components/AuditLogClient')
)

export default async function AuditPage() {
  await requireRole(UserRole.SuperAdmin)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Full system activity trail — who did what and when</p>
        </div>
      </div>

      {/* Client section */}
      <Suspense fallback={null}>
        <AuditLogClient />
      </Suspense>
    </div>
  )
}
