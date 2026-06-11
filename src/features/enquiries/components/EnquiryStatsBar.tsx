import { cn } from '@/lib/utils'
import { EnquiryStatus, ENQUIRY_STATUS_LABELS } from '@/types/enums'

interface StatsBarProps {
  stats?: {
    total?:    number
    open?:     number
    resolved?: number
    byStatus?: { _id: EnquiryStatus; count: number }[]
  }
}

const STATUS_COLORS: Partial<Record<EnquiryStatus, string>> = {
  [EnquiryStatus.New]:        'text-slate-600  bg-slate-100  dark:bg-slate-800',
  [EnquiryStatus.Assigned]:   'text-blue-700   bg-blue-50    dark:bg-blue-900/30   dark:text-blue-300',
  [EnquiryStatus.InProgress]: 'text-amber-700  bg-amber-50   dark:bg-amber-900/30  dark:text-amber-300',
  [EnquiryStatus.Resolved]:   'text-green-700  bg-green-50   dark:bg-green-900/30  dark:text-green-300',
  [EnquiryStatus.Closed]:     'text-slate-500  bg-slate-100  dark:bg-slate-800',
}

export default function EnquiryStatsBar({ stats }: StatsBarProps) {
  const shown = [
    EnquiryStatus.New,
    EnquiryStatus.Assigned,
    EnquiryStatus.InProgress,
    EnquiryStatus.Resolved,
    EnquiryStatus.Closed,
  ]

  const countFor = (status: EnquiryStatus) =>
    stats?.byStatus?.find((s) => s._id === status)?.count ?? 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total */}
      <StatCard
        label="Total"
        value={stats?.total ?? 0}
        className="text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
      />
      {/* Open */}
      <StatCard
        label="Open"
        value={stats?.open ?? 0}
        className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
      />
      {/* Per status */}
      {shown.map((status) => (
        <StatCard
          key={status}
          label={ENQUIRY_STATUS_LABELS[status]}
          value={countFor(status)}
          className={cn(
            'border border-transparent',
            STATUS_COLORS[status] ?? 'text-slate-600 bg-slate-100 dark:bg-slate-800'
          )}
        />
      ))}
    </div>
  )
}

function StatCard({
  label, value, className,
}: {
  label: string; value?: number; className?: string
}) {
  return (
    <div className={cn('rounded-xl p-3 shadow-sm', className)}>
      <p className="text-xs font-medium opacity-70 mb-1 truncate">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{(value ?? 0).toLocaleString()}</p>
    </div>
  )
}
