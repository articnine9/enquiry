import { cn } from '@/lib/utils'
import { LeadStage, LEAD_STAGE_LABELS } from '@/types/enums'

interface LeadStageBadgeProps {
  stage: LeadStage | string
  size?: 'sm' | 'md'
}

export function LeadStageBadge({ stage, size = 'md' }: LeadStageBadgeProps) {
  const isLost  = stage === LeadStage.Lost
  const label   = LEAD_STAGE_LABELS[stage as LeadStage] ?? stage

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium ring-1 ring-inset rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        isLost
          ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 ring-red-200 dark:ring-red-700'
          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-700'
      )}
    >
      {label}
    </span>
  )
}
