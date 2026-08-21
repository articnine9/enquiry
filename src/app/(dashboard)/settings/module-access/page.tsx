import dynamic from 'next/dynamic'
import { LayoutPanelLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { SettingsHeader } from '@/features/settings/components/SettingsHeader'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Module Access — Settings' }

const ModuleAccessManager = dynamic(
  () => import('@/features/settings/components/ModuleAccessManager')
)

export default async function ModuleAccessPage() {
  await requireRole(UserRole.SuperAdmin)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mx-auto space-y-6">
      <SettingsHeader
        icon={LayoutPanelLeft}
        title="Module Access"
        subtitle="Show or hide modules in Staff's sidebar and block direct access to hidden ones"
      />

      <ModuleAccessManager />
    </div>
  )
}
