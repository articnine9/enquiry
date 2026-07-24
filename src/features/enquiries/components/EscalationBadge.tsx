'use client'

import { Clock, AlertTriangle, Siren, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEscalationTier, formatElapsedSince, ESCALATION_TIER_LABELS, type EscalationTier } from '@/lib/escalation'

const TIER_STYLES: Record<EscalationTier, string> = {
  none:                   'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
  reminder:               'bg-amber-50  text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  escalated:              'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  reassignment_available: 'bg-red-50    text-red-700   dark:bg-red-900/30   dark:text-red-300',
}

const TIER_ICONS: Record<EscalationTier, typeof Clock> = {
  none:                   Clock,
  reminder:               Clock,
  escalated:              AlertTriangle,
  reassignment_available: Siren,
}

interface EscalationBadgeProps {
  lastActionAt?: Date | string | null
  assignedTo?:   unknown
  status:        string
  leadStage?:    string
  showElapsed?:  boolean
}

export function EscalationBadge({ lastActionAt, assignedTo, status, leadStage, showElapsed = false }: EscalationBadgeProps) {
  const tier = getEscalationTier({ lastActionAt, assignedTo, status, leadStage })
  if (tier === 'none') {
    return <span className="text-xs text-slate-400">—</span>
  }

  const Icon = TIER_ICONS[tier]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        TIER_STYLES[tier]
      )}
    >
      {tier === 'reassignment_available' ? <UserX className="w-3 h-3 shrink-0" /> : <Icon className="w-3 h-3 shrink-0" />}
      {ESCALATION_TIER_LABELS[tier]}
      {showElapsed && lastActionAt && (
        <span className="opacity-75">· {formatElapsedSince(lastActionAt)}</span>
      )}
    </span>
  )
}
