import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MessageSquareWarning, Plus } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Complaints' }

const ComplaintList = dynamic(
  () => import('@/features/complaints/components/ComplaintList')
)

export default async function ComplaintsPage() {
  await requirePermission('complaint:read')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mx-auto space-y-6">
      <PageHeader
        icon={MessageSquareWarning}
        title="Complaints"
        subtitle="Product, delivery, and service complaints"
        actions={
          <Link
            href="/complaints/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 backdrop-blur-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Complaint
          </Link>
        }
      />

      <ComplaintList />
    </div>
  )
}
