import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Footprints, Plus } from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Field Visits' }

const FieldVisitList = dynamic(
  () => import('@/features/field-visits/components/FieldVisitList')
)

interface PageProps {
  searchParams: Promise<{ distributorId?: string }>
}

export default async function FieldVisitsPage({ searchParams }: PageProps) {
  await requirePermission('visit:read')
  const { distributorId } = await searchParams

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Footprints}
        title="Field Visits"
        subtitle="Poultry farm, hotel, restaurant, dealer, and distributor visit activity"
        actions={
          <Link
            href="/field-visits/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 backdrop-blur-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Visit
          </Link>
        }
      />

      <FieldVisitList distributorId={distributorId} />
    </div>
  )
}
