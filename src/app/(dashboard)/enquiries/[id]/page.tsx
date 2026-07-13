import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pencil, UserCheck } from 'lucide-react'
import { auth } from '@/lib/auth/auth'
import { getEnquiryById } from '@/features/enquiries/actions/enquiry.actions'
import { StatusBadge } from '@/features/enquiries/components/StatusBadge'
import { PriorityBadge } from '@/features/enquiries/components/PriorityBadge'
import EnquiryDetailActions from '@/features/enquiries/components/EnquiryDetailActions'
import FollowUpSection from '@/features/followups/components/FollowUpSection'
import { formatDate, formatDateTime } from '@/lib/utils'
import { labelFor, resolveMasterValue } from '@/features/settings/services/masterData.service'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await getEnquiryById(id)
  if (!result.ok) return { title: 'Enquiry — EnquiryPro' }
  return { title: `${result.data.enquiryNo} — EnquiryPro` }
}

export default async function EnquiryDetailPage({ params }: PageProps) {
  const { id }  = await params
  const session = await auth()
  const result  = await getEnquiryById(id)

  if (!result.ok) notFound()

  const enquiry    = result.data as EnquiryDocument
  const role        = session?.user?.role as UserRole
  const canEdit     = role !== UserRole.Staff
  const isStaff     = role === UserRole.Staff
  const isCancelled = enquiry.status === 'cancelled' || enquiry.status === 'closed'

  const assignedUser = enquiry.assignedTo as unknown as { name: string; email: string } | null

  // Resolve master-data labels for display
  const [sourceLabel, productLabel, categoryLabel] = await Promise.all([
    labelFor('enquiry_source',   enquiry.enquirySource),
    labelFor('enquiry_product',  enquiry.product),
    labelFor('enquiry_category', enquiry.category),
  ])
  const priorityRow = await resolveMasterValue('enquiry_priority', enquiry.priority)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href="/enquiries"
          className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Enquiries
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-200 font-mono text-xs font-medium">
          {enquiry.enquiryNo}
        </span>
      </div>

      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={enquiry.status} />
            <PriorityBadge
              priority={enquiry.priority}
              color={priorityRow?.color}
              label={priorityRow?.label}
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {enquiry.subject || enquiry.customerName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Created {formatDateTime(enquiry.createdAt)}
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              href={`/enquiries/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
          </div>
        )}
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer details */}
          <DetailCard title="Customer Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailField label="Name"  value={enquiry.customerName} />
              <DetailField label="Phone" value={enquiry.phone} />
              {enquiry.email && <DetailField label="Email" value={enquiry.email} />}
              <DetailField label="Address" value={[enquiry.address, enquiry.city, enquiry.district, enquiry.pincode].filter(Boolean).join(', ')} />
              <DetailField label="Location" value={enquiry.location} />
            </dl>
          </DetailCard>

          {/* Follow-ups */}
          <FollowUpSection
            enquiryId={String(enquiry._id)}
            canCreate={!isCancelled}
            canEdit={!isCancelled}
          />

          {/* Enquiry details */}
          <DetailCard title="Enquiry Details">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailField label="Source"   value={sourceLabel} />
              <DetailField label="Product"  value={productLabel} />
              <DetailField label="Category" value={categoryLabel} />
            </dl>
            {enquiry.description && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{enquiry.description}</p>
              </div>
            )}
            {!isStaff && (enquiry as EnquiryDocument & { internalNotes?: string }).internalNotes && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Internal Notes</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  {(enquiry as EnquiryDocument & { internalNotes?: string }).internalNotes}
                </p>
              </div>
            )}
            {enquiry.tags && enquiry.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                {enquiry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </DetailCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Assignment */}
          <DetailCard title="Assignment">
            {assignedUser ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {assignedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{assignedUser.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{assignedUser.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Not yet assigned</p>
            )}
          </DetailCard>

          {/* Timeline */}
          <DetailCard title="Timeline">
            <dl className="space-y-2 text-xs">
              <TimelineItem label="Created"  value={formatDate(enquiry.createdAt)} />
              {enquiry.assignedAt && (
                <TimelineItem label="Assigned" value={formatDate(enquiry.assignedAt)} />
              )}
              {enquiry.resolvedAt && (
                <TimelineItem label="Resolved" value={formatDate(enquiry.resolvedAt)} />
              )}
              {enquiry.closedAt && (
                <TimelineItem label="Closed" value={formatDate(enquiry.closedAt)} />
              )}
            </dl>
          </DetailCard>

          {/* Actions */}
          <EnquiryDetailActions enquiry={enquiry} userRole={role} />
        </div>
      </div>

    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-slate-800 dark:text-slate-200 font-medium">{value}</dd>
    </div>
  )
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700 dark:text-slate-300">{value}</dd>
    </div>
  )
}
