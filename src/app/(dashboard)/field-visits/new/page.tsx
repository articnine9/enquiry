import dynamic from 'next/dynamic'
import { Footprints } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Log Field Visit' }

const FieldVisitForm = dynamic(
  () => import('@/features/field-visits/components/FieldVisitForm')
)

export default async function NewFieldVisitPage() {
  await requirePermission('visit:create')

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
      <PageHeader
        icon={Footprints}
        title="Log Field Visit"
        subtitle="Record a poultry farm, hotel, restaurant, dealer, or distributor visit"
        backHref="/field-visits"
        backLabel="Back to field visits"
      />

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6">
        <FieldVisitForm />
      </div>
    </div>
  )
}
