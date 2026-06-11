import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import EnquiryForm from '@/features/enquiries/components/EnquiryForm'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Enquiry — EnquiryPro' }

export default async function NewEnquiryPage() {
  await requireRole(UserRole.SuperAdmin, UserRole.Manager)

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
        <span className="text-slate-700 dark:text-slate-200 font-medium">New</span>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Create Enquiry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Fill in the customer and enquiry details below.
          </p>
        </div>
        <div className="p-6">
          <EnquiryForm mode="create" />
        </div>
      </div>
    </div>
  )
}
