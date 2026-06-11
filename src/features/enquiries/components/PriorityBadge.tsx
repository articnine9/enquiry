import { cn } from '@/lib/utils'
import { EnquiryPriority, ENQUIRY_PRIORITY_LABELS } from '@/types/enums'

const PRIORITY_STYLES: Record<EnquiryPriority, string> = {
  [EnquiryPriority.Low]:    'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400',
  [EnquiryPriority.Medium]: 'bg-blue-50   text-blue-700  dark:bg-blue-900/30  dark:text-blue-300',
  [EnquiryPriority.High]:   'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  [EnquiryPriority.Urgent]: 'bg-red-50    text-red-700   dark:bg-red-900/30   dark:text-red-300',
}

const PRIORITY_DOTS: Record<EnquiryPriority, string> = {
  [EnquiryPriority.Low]:    'bg-slate-400',
  [EnquiryPriority.Medium]: 'bg-blue-500',
  [EnquiryPriority.High]:   'bg-orange-500',
  [EnquiryPriority.Urgent]: 'bg-red-500 animate-pulse',
}

interface PriorityBadgeProps {
  priority: EnquiryPriority
  dot?:     boolean
}

export function PriorityBadge({ priority, dot = true }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        PRIORITY_STYLES[priority]
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOTS[priority])} />}
      {ENQUIRY_PRIORITY_LABELS[priority]}
    </span>
  )
}
