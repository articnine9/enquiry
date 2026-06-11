'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, CheckCircle2, XCircle, Bell, BellOff, Clock, AlarmClock } from 'lucide-react'
import { FollowUpStatusBadge } from './FollowUpStatusBadge'
import { FollowUpTypeBadge }   from './FollowUpTypeBadge'
import { dismissReminderAction } from '../actions/followup.actions'
import { useFollowUpStore }     from '@/store/followup.store'
import { cn, formatDateTime, formatDate } from '@/lib/utils'
import { FollowUpStatus, FollowUpOutcome, FOLLOW_UP_OUTCOME_LABELS } from '@/types/enums'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'

// ── Component ─────────────────────────────────────────────────────────────────

interface FollowUpCardProps {
  followUp:   FollowUpDocument
  isLast?:    boolean
  canEdit?:   boolean
}

export default function FollowUpCard({ followUp, isLast, canEdit = true }: FollowUpCardProps) {
  const [isPending, startTransition] = useTransition()
  const { openEdit, openClose, optimisticDismissReminder } = useFollowUpStore()

  const id        = String(followUp._id)
  const isOpen    = followUp.status === FollowUpStatus.Scheduled
  const isOverdue =
    isOpen && followUp.scheduledAt && new Date(followUp.scheduledAt) < new Date()

  const hasActiveReminder =
    isOpen &&
    followUp.reminderAt &&
    !followUp.reminderDismissed &&
    !followUp.reminderSentAt

  const creator = followUp.createdBy as unknown as { name: string } | null

  function handleDismissReminder() {
    optimisticDismissReminder(id)
    startTransition(async () => {
      const result = await dismissReminderAction(id)
      if (!result.ok) toast.error(result.error)
    })
  }

  return (
    <div
      className={cn(
        'relative pl-8 pb-6',
        !isLast && 'border-l-2 border-slate-200 dark:border-slate-700 ml-3'
      )}
    >
      {/* Timeline dot */}
      <span
        className={cn(
          'absolute -left-3 top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 text-white text-xs font-bold',
          followUp.status === FollowUpStatus.Completed
            ? 'bg-green-500'
            : followUp.status === FollowUpStatus.Missed
              ? 'bg-red-500'
              : followUp.status === FollowUpStatus.Cancelled
                ? 'bg-slate-400'
                : isOverdue
                  ? 'bg-orange-500'
                  : 'bg-blue-500'
        )}
      >
        {followUp.status === FollowUpStatus.Completed
          ? <CheckCircle2 className="w-3.5 h-3.5" />
          : followUp.status === FollowUpStatus.Cancelled
            ? <XCircle className="w-3.5 h-3.5" />
            : isOverdue
              ? <AlarmClock className="w-3.5 h-3.5" />
              : <Clock className="w-3.5 h-3.5" />
        }
      </span>

      {/* Card */}
      <div
        className={cn(
          'rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-opacity',
          followUp.status === FollowUpStatus.Cancelled && 'opacity-60',
          isPending && 'animate-pulse',
          isOverdue
            ? 'border-orange-200 dark:border-orange-800'
            : 'border-slate-200 dark:border-slate-700'
        )}
      >
        {/* Card header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <FollowUpTypeBadge type={followUp.type} size="sm" />
            <FollowUpStatusBadge status={followUp.status} size="sm" />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                <AlarmClock className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>

          {/* Actions */}
          {canEdit && isOpen && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {hasActiveReminder ? (
                <button
                  type="button"
                  title="Dismiss reminder"
                  onClick={handleDismissReminder}
                  disabled={isPending}
                  className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>
              ) : followUp.reminderAt ? (
                <span title="Reminder dismissed" className="p-1.5 text-slate-300 dark:text-slate-600">
                  <BellOff className="w-3.5 h-3.5" />
                </span>
              ) : null}

              <button
                type="button"
                title="Edit follow-up"
                onClick={() => openEdit(followUp)}
                disabled={isPending}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Close follow-up"
                onClick={() => openClose(followUp)}
                disabled={isPending}
                className="p-1.5 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="px-4 py-3 space-y-3">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(followUp.scheduledAt)}
            </span>
            {followUp.durationMinutes && (
              <span>{followUp.durationMinutes} min</span>
            )}
            {creator && (
              <span>by {creator.name}</span>
            )}
            {followUp.completedAt && (
              <span className="text-green-600 dark:text-green-400">
                Closed {formatDate(followUp.completedAt)}
              </span>
            )}
          </div>

          {/* Outcome */}
          {followUp.outcome && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              {FOLLOW_UP_OUTCOME_LABELS[followUp.outcome as FollowUpOutcome]}
            </div>
          )}

          {/* Notes */}
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {followUp.notes}
          </p>

          {/* Tags */}
          {followUp.tags && followUp.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {followUp.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Reminder info */}
          {followUp.reminderAt && isOpen && !followUp.reminderDismissed && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5">
              <Bell className="w-3 h-3" />
              Reminder: {formatDateTime(followUp.reminderAt)}
            </div>
          )}

          {/* Next follow-up */}
          {followUp.nextFollowUpDate && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5">
              <AlarmClock className="w-3 h-3" />
              Next: {formatDateTime(followUp.nextFollowUpDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
