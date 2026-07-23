import dynamic from 'next/dynamic'
import { Users2 } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { PageHeader } from '@/components/ui/PageHeader'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Customers' }

const CustomerDirectory = dynamic(
  () => import('@/features/customers/components/CustomerDirectory')
)

export default async function CustomersPage() {
  await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={Users2}
        title="Customers"
        subtitle="Converted leads, purchase history, and repeat business"
      />

      <CustomerDirectory />
    </div>
  )
}
