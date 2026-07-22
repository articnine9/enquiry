import dynamic from 'next/dynamic'
import { Truck } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Distributors' }

const DistributorManager = dynamic(
  () => import('@/features/distributors/components/DistributorManager')
)

export default async function DistributorsPage() {
  await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Truck}
        title="Distributors"
        subtitle="Manage territory partners and their dealer networks"
      />

      <DistributorManager />
    </div>
  )
}
