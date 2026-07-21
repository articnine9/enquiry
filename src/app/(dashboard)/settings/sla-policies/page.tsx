import dynamic from 'next/dynamic'
import { Timer } from 'lucide-react'
import { requireRole } from '@/lib/auth/session'
import { SettingsHeader } from '@/features/settings/components/SettingsHeader'
import { UserRole } from '@/types/enums'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'SLA Policies — Settings' }

const SlaPolicyManager = dynamic(
  () => import('@/features/settings/components/SlaPolicyManager')
)

export default async function SlaPoliciesPage() {
  await requireRole(UserRole.SuperAdmin)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <SettingsHeader
        icon={Timer}
        title="SLA Policies"
        subtitle="Set resolution-time targets per priority and category"
      />

      <SlaPolicyManager />
    </div>
  )
}
