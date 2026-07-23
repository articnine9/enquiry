import { cn } from '@/lib/utils'
import { VisitType, VISIT_TYPE_LABELS } from '@/types/enums'

const COLORS: Record<VisitType, string> = {
  [VisitType.PoultryFarmVisit]: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  [VisitType.HotelVisit]:       'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  [VisitType.RestaurantVisit]:  'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  [VisitType.DealerVisit]:      'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  [VisitType.DistributorVisit]: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
}

export default function VisitTypeBadge({ type, className }: { type: string; className?: string }) {
  const t = type as VisitType
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
      COLORS[t] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      className
    )}>
      {VISIT_TYPE_LABELS[t] ?? type}
    </span>
  )
}
