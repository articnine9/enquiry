import dynamic from 'next/dynamic'
import { Database } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { SettingsHeader } from '@/features/settings/components/SettingsHeader'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Master Data — Settings' }

const MasterDataManager = dynamic(
  () => import('@/features/settings/components/MasterDataManager')
)

export default async function MasterDataPage() {
  await requireRole(UserRole.SuperAdmin)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <SettingsHeader
        icon={Database}
        title="Master Data"
        subtitle="Manage the dropdown options used on the enquiry form"
      />

      <MasterDataManager />
    </div>
  )
}
