import { cn } from '@/lib/utils'
import { ComplaintType, COMPLAINT_TYPE_LABELS } from '@/types/enums'

const COLORS: Record<ComplaintType, string> = {
  [ComplaintType.Product]:  'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  [ComplaintType.Delivery]: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  [ComplaintType.Service]:  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

export default function ComplaintTypeBadge({ type, className }: { type: string; className?: string }) {
  const t = type as ComplaintType
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
      COLORS[t] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      className
    )}>
      {COMPLAINT_TYPE_LABELS[t] ?? type}
    </span>
  )
}
