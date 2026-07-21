import { cn } from '@/lib/utils'
import { EnquiryStatus, ENQUIRY_STATUS_LABELS } from '@/types/enums'

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  [EnquiryStatus.New]:        'bg-slate-100 text-slate-700  dark:bg-slate-700/40 dark:text-slate-300 ring-slate-200 dark:ring-slate-600',
  [EnquiryStatus.Assigned]:   'bg-blue-50   text-blue-700   dark:bg-blue-900/30  dark:text-blue-300  ring-blue-200  dark:ring-blue-700',
  [EnquiryStatus.InProgress]: 'bg-amber-50  text-amber-700  dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200 dark:ring-amber-700',
  [EnquiryStatus.Paused]:     'bg-blue-50   text-blue-700   dark:bg-blue-900/30  dark:text-blue-300  ring-blue-200  dark:ring-blue-700',
  [EnquiryStatus.FollowUp]:   'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-purple-200 dark:ring-purple-700',
  [EnquiryStatus.Resolved]:   'bg-green-50  text-green-700  dark:bg-green-900/30 dark:text-green-300  ring-green-200  dark:ring-green-700',
  [EnquiryStatus.Closed]:     'bg-slate-100 text-slate-500  dark:bg-slate-800    dark:text-slate-400  ring-slate-200  dark:ring-slate-600',
  [EnquiryStatus.Cancelled]:  'bg-red-50    text-red-600    dark:bg-red-900/30   dark:text-red-400    ring-red-200    dark:ring-red-700',
}

interface StatusBadgeProps {
  status: EnquiryStatus
  size?:  'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium ring-1 ring-inset rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        STATUS_STYLES[status]
      )}
    >
      {ENQUIRY_STATUS_LABELS[status]}
    </span>
  )
}
