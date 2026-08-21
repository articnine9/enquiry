import dynamic from 'next/dynamic'
import { Trash2 } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { SettingsHeader } from '@/features/settings/components/SettingsHeader'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Data Management — Settings' }

const DataManagementTabs = dynamic(
  () => import('@/features/settings/components/DataManagementTabs')
)

export default async function DataManagementPage() {
  await requireRole(UserRole.SuperAdmin)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mx-auto space-y-6">
      <SettingsHeader
        icon={Trash2}
        title="Data Management"
        subtitle="Permanently delete enquiries or users — irreversible, use with care"
      />

      <DataManagementTabs />
    </div>
  )
}
