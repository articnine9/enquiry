'use client'

import dynamic from 'next/dynamic'
import { UserRole } from '@/types/enums'

const SuperAdminDashboard = dynamic(
  () => import('@/features/dashboard/components/SuperAdminDashboard'),
  { ssr: false }
)
const ManagerDashboard = dynamic(
  () => import('@/features/dashboard/components/ManagerDashboard'),
  { ssr: false }
)
const StaffDashboard = dynamic(
  () => import('@/features/dashboard/components/StaffDashboard'),
  { ssr: false }
)
const ActivityDashboard = dynamic(
  () => import('@/features/activity/components/ActivityDashboard'),
  { ssr: false }
)

interface DashboardClientProps {
  role:             UserRole
  userId:           string
  sessionLoginAt?:  string
}

export default function DashboardClient({ role, userId, sessionLoginAt }: DashboardClientProps) {
  return (
    <>
      {role === UserRole.SuperAdmin && <SuperAdminDashboard />}
      {role === UserRole.Manager    && <ManagerDashboard />}
      {role === UserRole.Staff      && <StaffDashboard />}

      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Activity &amp; Productivity
        </p>
        <ActivityDashboard
          userId={userId}
          role={role}
          sessionLoginAt={sessionLoginAt}
        />
      </div>
    </>
  )
}
