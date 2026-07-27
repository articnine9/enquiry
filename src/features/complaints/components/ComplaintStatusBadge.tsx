import { CircleDot, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComplaintStatus, COMPLAINT_STATUS_LABELS } from '@/types/enums'

const STYLES: Record<ComplaintStatus, string> = {
  [ComplaintStatus.Open]:       'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  [ComplaintStatus.InProgress]: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  [ComplaintStatus.Resolved]:   'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  [ComplaintStatus.Closed]:     'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

const ICONS: Record<ComplaintStatus, typeof CircleDot> = {
  [ComplaintStatus.Open]:       CircleDot,
  [ComplaintStatus.InProgress]: Loader2,
  [ComplaintStatus.Resolved]:   CheckCircle2,
  [ComplaintStatus.Closed]:     XCircle,
}

export default function ComplaintStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as ComplaintStatus
  const Icon = ICONS[s] ?? CircleDot
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
      STYLES[s] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      className
    )}>
      <Icon className="w-3 h-3 shrink-0" />
      {COMPLAINT_STATUS_LABELS[s] ?? status}
    </span>
  )
}
