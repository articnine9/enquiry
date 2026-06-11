import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireRole } from '@/lib/auth/session'
import { UserRole } from '@/types/enums'

const EnquirySummaryReport   = dynamic(() => import('@/features/reports/components/EnquirySummaryReport'))
const StaffPerformanceReport = dynamic(() => import('@/features/reports/components/StaffPerformanceReport'))
const ZonePerformanceReport  = dynamic(() => import('@/features/reports/components/ZonePerformanceReport'))
const FollowUpReport         = dynamic(() => import('@/features/reports/components/FollowUpReport'))
const ConversionFunnelReport = dynamic(() => import('@/features/reports/components/ConversionFunnelReport'))
const ReportTabClient        = dynamic(() => import('./_components/ReportTabClient'))

export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage() {
  await requireRole(UserRole.SuperAdmin, UserRole.Manager)

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Analyse enquiries, staff performance, zone metrics and follow-ups
        </p>
      </div>

      <ReportTabClient
        reports={{
          enquiry:    <EnquirySummaryReport />,
          staff:      <StaffPerformanceReport />,
          zone:       <ZonePerformanceReport />,
          followup:   <FollowUpReport />,
          conversion: <ConversionFunnelReport />,
        }}
      />
    </div>
  )
}
