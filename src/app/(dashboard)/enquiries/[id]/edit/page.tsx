import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/lib/auth/auth'
import { getEnquiryById } from '@/features/enquiries/actions/enquiry.actions'
import EnquiryForm from '@/features/enquiries/components/EnquiryForm'
import { UserRole, EnquiryStatus } from '@/types/enums'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await getEnquiryById(id)
  if (!result.ok) return { title: 'Edit Enquiry — EnquiryPro' }
  return { title: `Edit ${result.data.enquiryNo} — EnquiryPro` }
}

export default async function EditEnquiryPage({ params }: PageProps) {
  const { id }  = await params
  const session = await auth()

  // Staff cannot edit
  if (session?.user?.role === UserRole.Staff) redirect(`/enquiries/${id}`)

  const result = await getEnquiryById(id)
  if (!result.ok) notFound()

  const enquiry = result.data

  // Cannot edit closed/cancelled enquiries
  if (
    enquiry.status === EnquiryStatus.Closed ||
    enquiry.status === EnquiryStatus.Cancelled
  ) {
    redirect(`/enquiries/${id}`)
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          href={`/enquiries/${id}`}
          className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {enquiry.enquiryNo}
        </Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-slate-200 font-medium">Edit</span>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Edit Enquiry
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {enquiry.enquiryNo} · {enquiry.customerName}
          </p>
        </div>
        <div className="p-6">
          <EnquiryForm
            mode="edit"
            enquiry={enquiry as never}
            onCancel={undefined}
          />
        </div>
      </div>
    </div>
  )
}
