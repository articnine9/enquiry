import { cn } from '@/lib/utils'
import { FollowUpStatus, FOLLOW_UP_STATUS_LABELS } from '@/types/enums'

const STYLES: Record<FollowUpStatus, string> = {
  [FollowUpStatus.Scheduled]: 'bg-blue-50   text-blue-700   ring-blue-200   dark:bg-blue-900/30  dark:text-blue-300  dark:ring-blue-700',
  [FollowUpStatus.Completed]: 'bg-green-50  text-green-700  ring-green-200  dark:bg-green-900/30 dark:text-green-300 dark:ring-green-700',
  [FollowUpStatus.Missed]:    'bg-red-50    text-red-700    ring-red-200    dark:bg-red-900/30   dark:text-red-300   dark:ring-red-700',
  [FollowUpStatus.Cancelled]: 'bg-slate-100 text-slate-500  ring-slate-200  dark:bg-slate-800    dark:text-slate-400 dark:ring-slate-600',
}

const DOTS: Record<FollowUpStatus, string> = {
  [FollowUpStatus.Scheduled]: 'bg-blue-500 animate-pulse',
  [FollowUpStatus.Completed]: 'bg-green-500',
  [FollowUpStatus.Missed]:    'bg-red-500',
  [FollowUpStatus.Cancelled]: 'bg-slate-400',
}

interface Props {
  status:   FollowUpStatus
  dot?:     boolean
  size?:    'sm' | 'md'
}

export function FollowUpStatusBadge({ status, dot = true, size = 'md' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium ring-1 ring-inset rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        STYLES[status]
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOTS[status])} />}
      {FOLLOW_UP_STATUS_LABELS[status]}
    </span>
  )
}
