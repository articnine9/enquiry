'use client'

import { useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Bell, BellOff, AlarmClock, CalendarDays, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  getUpcomingFollowUps,
  getOverdueFollowUps,
  dismissReminderAction,
} from '../actions/followup.actions'
import { FollowUpTypeBadge } from './FollowUpTypeBadge'
import {
  useFollowUpStore,
  useFollowUpStore as useStore,
} from '@/store/followup.store'
import { formatDateTime } from '@/lib/utils'
import { FollowUpStatus } from '@/types/enums'
import { cn } from '@/lib/utils'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'

// ── Component ─────────────────────────────────────────────────────────────────

interface ReminderPanelProps {
  className?: string
}

export default function ReminderPanel({ className }: ReminderPanelProps) {
  const { upcoming, overdue, setUpcoming, setOverdue, optimisticDismissReminder } =
    useFollowUpStore()

  // Load on mount
  useEffect(() => {
    void getUpcomingFollowUps(7).then((r)  => r.ok && setUpcoming(r.data))
    void getOverdueFollowUps().then((r)    => r.ok && setOverdue(r.data))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const overdueCount  = overdue.length
  const upcomingCount = upcoming.length

  return (
    <div className={cn('space-y-1', className)}>
      {/* ── Overdue section ──────────────────────────────────────────────── */}
      {overdueCount > 0 && (
        <Section
          icon={<AlarmClock className="w-4 h-4 text-orange-500" />}
          title="Overdue"
          count={overdueCount}
          urgent
        >
          {overdue.slice(0, 5).map((fu) => (
            <ReminderRow
              key={String(fu._id)}
              fu={fu}
              onDismiss={optimisticDismissReminder}
            />
          ))}
          {overdueCount > 5 && (
            <Link
              href="/follow-ups?overdue=true"
              className="flex items-center justify-center gap-1.5 py-2 text-xs text-orange-600 dark:text-orange-400 hover:underline"
            >
              View all {overdueCount} overdue
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </Section>
      )}

      {/* ── Upcoming section ─────────────────────────────────────────────── */}
      <Section
        icon={<CalendarDays className="w-4 h-4 text-blue-500" />}
        title="Next 7 days"
        count={upcomingCount}
      >
        {upcomingCount === 0 ? (
          <p className="px-4 py-3 text-xs text-slate-400 text-center">
            No follow-ups scheduled in the next 7 days
          </p>
        ) : (
          upcoming.slice(0, 8).map((fu) => (
            <ReminderRow
              key={String(fu._id)}
              fu={fu}
              onDismiss={optimisticDismissReminder}
            />
          ))
        )}
        {upcomingCount > 8 && (
          <Link
            href="/follow-ups"
            className="flex items-center justify-center gap-1.5 py-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all {upcomingCount}
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </Section>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon, title, count, urgent, children,
}: {
  icon:     React.ReactNode
  title:    string
  count:    number
  urgent?:  boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800',
          urgent && 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {icon}
          {title}
        </div>
        {count > 0 && (
          <span
            className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              urgent
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            )}
          >
            {count}
          </span>
        )}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
    </div>
  )
}

// ── Single reminder row ───────────────────────────────────────────────────────

function ReminderRow({
  fu,
  onDismiss,
}: {
  fu:        FollowUpDocument
  onDismiss: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const id = String(fu._id)

  const isOverdue =
    fu.status === FollowUpStatus.Scheduled &&
    fu.scheduledAt &&
    new Date(fu.scheduledAt) < new Date()

  const hasReminder =
    fu.reminderAt && !fu.reminderDismissed && !fu.reminderSentAt

  const enquiry = fu.enquiryId as unknown as {
    _id: string; enquiryNo: string; customerName: string
  } | null

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onDismiss(id)
    startTransition(async () => {
      const r = await dismissReminderAction(id)
      if (!r.ok) toast.error(r.error)
    })
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
        isPending && 'opacity-50'
      )}
    >
      <FollowUpTypeBadge type={fu.type} showLabel={false} size="sm" />

      <div className="flex-1 min-w-0">
        {enquiry ? (
          <Link
            href={`/enquiries/${enquiry._id}`}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate"
          >
            {enquiry.enquiryNo} · {enquiry.customerName}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </Link>
        ) : (
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            Follow-up
          </p>
        )}
        <p
          className={cn(
            'text-xs mt-0.5',
            isOverdue
              ? 'text-orange-600 dark:text-orange-400 font-medium'
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {isOverdue ? '⚠ ' : ''}{formatDateTime(fu.scheduledAt)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
          {fu.notes}
        </p>
      </div>

      {hasReminder && (
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isPending}
          title="Dismiss reminder"
          className="p-1 rounded text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex-shrink-0"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
