'use client'

import { useEffect, type ReactNode } from 'react'
import { BarChart2, Users, MapPin, CalendarCheck, TrendingUp, Megaphone, Store, Truck } from 'lucide-react'
import { useReportStore, useActiveReport } from '@/store/report.store'
import { cn } from '@/lib/utils'
import type { ReportType } from '@/features/reports/types/report.types'

const TABS: { type: ReportType; label: string; icon: React.ElementType; managerOnly?: boolean }[] = [
  { type: 'enquiry',     label: 'Enquiry Summary',    icon: BarChart2,     managerOnly: true },
  { type: 'staff',       label: 'Staff Performance',  icon: Users         },
  { type: 'zone',        label: 'Zone Performance',   icon: MapPin,        managerOnly: true },
  { type: 'followup',    label: 'Follow-up Analysis', icon: CalendarCheck, managerOnly: true },
  { type: 'conversion',  label: 'Conversion Funnel',  icon: TrendingUp,    managerOnly: true },
  { type: 'marketing',   label: 'Marketing',          icon: Megaphone,     managerOnly: true },
  { type: 'dealer',      label: 'Dealer Performance', icon: Store,         managerOnly: true },
  { type: 'distributor', label: 'Distributor Performance', icon: Truck,    managerOnly: true },
]

interface ReportTabClientProps {
  reports: Record<ReportType, ReactNode>
  isStaff: boolean
}

export default function ReportTabClient({ reports, isStaff }: ReportTabClientProps) {
  const { setActiveReport } = useReportStore()
  const active = useActiveReport()
  const tabs = isStaff ? TABS.filter((t) => !t.managerOnly) : TABS

  // Staff only ever has the Staff tab available — force it active rather than
  // leaving the store's default ('enquiry') pointed at a tab they can't see.
  useEffect(() => {
    if (isStaff && active !== 'staff') setActiveReport('staff')
  }, [isStaff]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = active === t.type
          return (
            <button
              key={t.type}
              type="button"
              onClick={() => setActiveReport(t.type)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors',
                'border-b-2 -mb-px',
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Active report */}
      <div>{reports[active]}</div>
    </div>
  )
}
