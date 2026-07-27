import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MessageSquareWarning, User, Truck, Store } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { getComplaintAction } from '@/features/complaints/actions/complaint.actions'
import ComplaintTypeBadge from '@/features/complaints/components/ComplaintTypeBadge'
import ComplaintStatusTracker from '@/features/complaints/components/ComplaintStatusTracker'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await getComplaintAction(id)
  if (!result.ok) return { title: 'Complaint' }
  return { title: `${result.data.customerName} — Complaint` }
}

export default async function ComplaintDetailPage({ params }: PageProps) {
  const { id } = await params
  await requirePermission('complaint:read')

  const result = await getComplaintAction(id)
  if (!result.ok) notFound()
  const complaint = result.data

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6">
      <PageHeader
        icon={MessageSquareWarning}
        title={complaint.customerName}
        subtitle={`${formatDate(complaint.complaintDate)} · ${complaint.phone}`}
        backHref="/complaints"
        backLabel="Back to complaints"
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <ComplaintTypeBadge type={complaint.complaintType} className="text-sm px-3 py-1" />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Status</p>
          <ComplaintStatusTracker complaint={complaint} canEdit />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Complaint Date</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{formatDate(complaint.complaintDate)}</p>
          </div>
          {complaint.customerId && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" />Customer</p>
              <Link href={`/customers/${complaint.customerId}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                View profile
              </Link>
            </div>
          )}
          {complaint.distributorName && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><Truck className="w-3 h-3" />Distributor</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{complaint.distributorName}</p>
            </div>
          )}
          {complaint.dealerName && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><Store className="w-3 h-3" />Dealer</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{complaint.dealerName}</p>
            </div>
          )}
          {complaint.enquiryNo && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Related Enquiry</p>
              <Link href={`/enquiries/${complaint.enquiryId}`} className="text-sm font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
                {complaint.enquiryNo}
              </Link>
            </div>
          )}
          {complaint.assignedToName && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Assigned To</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{complaint.assignedToName}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">Complaint Details</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{complaint.description}</p>
        </div>

        {complaint.resolutionNotes && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-400 mb-1">Resolution Notes</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{complaint.resolutionNotes}</p>
            {complaint.resolvedAt && (
              <p className="text-xs text-slate-400 mt-1">Resolved {formatDate(complaint.resolvedAt)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
