'use client'

import { AlertTriangle, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSlaStatus, formatSlaCountdown, SLA_STATUS_LABELS, type SlaStatus } from '@/lib/sla'

const STATUS_STYLES: Record<SlaStatus, string> = {
  on_track:    'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400',
  at_risk:     'bg-amber-50  text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  breached:    'bg-red-50    text-red-700   dark:bg-red-900/30   dark:text-red-300',
  paused:      'bg-blue-50   text-blue-700  dark:bg-blue-900/30  dark:text-blue-300',
  met:         'bg-green-50  text-green-700 dark:bg-green-900/30 dark:text-green-300',
  missed:      'bg-red-50    text-red-700   dark:bg-red-900/30   dark:text-red-300',
  not_tracked: 'bg-slate-100 text-slate-400 dark:bg-slate-800    dark:text-slate-500',
}

const STATUS_ICONS: Record<SlaStatus, typeof Clock> = {
  on_track:    Clock,
  at_risk:     AlertTriangle,
  breached:    XCircle,
  paused:      PauseCircle,
  met:         CheckCircle2,
  missed:      XCircle,
  not_tracked: Clock,
}

interface SlaBadgeProps {
  createdAt:   Date | string
  dueAt?:      Date | string | null
  slaMet?:     boolean | null
  isClosed:    boolean
  isPaused?:   boolean
  showCountdown?: boolean
}

export function SlaBadge({ createdAt, dueAt, slaMet, isClosed, isPaused = false, showCountdown = false }: SlaBadgeProps) {
  const status = getSlaStatus({ createdAt, dueAt, slaMet, isClosed, isPaused })
  if (status === 'not_tracked') {
    return <span className="text-xs text-slate-400">—</span>
  }

  const Icon = STATUS_ICONS[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        STATUS_STYLES[status]
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {SLA_STATUS_LABELS[status]}
      {showCountdown && dueAt && (status === 'on_track' || status === 'at_risk' || status === 'breached') && (
        <span className="opacity-75">· {formatSlaCountdown(dueAt)}</span>
      )}
    </span>
  )
}
