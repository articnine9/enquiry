import dynamic from 'next/dynamic'
import { requirePermission } from '@/lib/auth/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inventory & Stock Management' }

const InventoryDashboard = dynamic(
  () => import('@/features/inventory/components/InventoryDashboard'),
  {
    loading: () => (
      <div className="px-4 py-6 sm:px-6 lg:px-8 mx-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-sm">
          Loading inventory management system...
        </div>
      </div>
    ),
  }
)

export default async function InventoryPage() {
  await requirePermission('inventory:read')

  // InventoryDashboard owns its own page layout, header, and toolbar.
  return <InventoryDashboard />
}
