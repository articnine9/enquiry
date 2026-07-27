import dynamic from 'next/dynamic'
import { MessageSquareWarning } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Log Complaint' }

const ComplaintForm = dynamic(
  () => import('@/features/complaints/components/ComplaintForm')
)

export default async function NewComplaintPage() {
  await requirePermission('complaint:create')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
      <PageHeader
        icon={MessageSquareWarning}
        title="Log Complaint"
        subtitle="Record a product, delivery, or service complaint"
        backHref="/complaints"
        backLabel="Back to complaints"
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6">
        <ComplaintForm />
      </div>
    </div>
  )
}
