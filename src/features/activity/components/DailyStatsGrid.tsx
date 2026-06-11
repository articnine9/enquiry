'use client'

import { useEffect } from 'react'
import {
  Clock, Phone, CheckCircle2, FileText,
  TrendingUp, Users, RefreshCw, CalendarCheck,
} from 'lucide-react'
import { useActivityStore } from '@/store/activity.store'
import { getDailyStatsAction } from '../actions/activity.actions'
import { cn } from '@/lib/utils'

// ── Stat config ───────────────────────────────────────────────────────────────

interface StatConfig {
  key:        string
  label:      string
  icon:       React.ElementType
  color:      string
  bg:         string
  format?:    (v: number) => string
  hint?:      string
}

const STATS: StatConfig[] = [
  {
    key:    'totalOnlineMinutes',
    label:  'Online Time',
    icon:   Clock,
    color:  'text-blue-600 dark:text-blue-400',
    bg:     'bg-blue-50 dark:bg-blue-900/30',
    format: (v) => `${Math.floor(v / 60)}h ${v % 60}m`,
    hint:   'Total session time today',
  },
  {
    key:    'enquiriesAssigned',
    label:  'Assigned',
    icon:   Users,
    color:  'text-indigo-600 dark:text-indigo-400',
    bg:     'bg-indigo-50 dark:bg-indigo-900/30',
    hint:   'Enquiries assigned to you today',
  },
  {
    key:    'enquiriesResolved',
    label:  'Resolved',
    icon:   CheckCircle2,
    color:  'text-green-600 dark:text-green-400',
    bg:     'bg-green-50 dark:bg-green-900/30',
    hint:   'Enquiries resolved today',
  },
  {
    key:    'callsMade',
    label:  'Calls Made',
    icon:   Phone,
    color:  'text-emerald-600 dark:text-emerald-400',
    bg:     'bg-emerald-50 dark:bg-emerald-900/30',
    hint:   'Outbound calls today',
  },
  {
    key:    'followUpsCompleted',
    label:  'Follow-ups',
    icon:   CalendarCheck,
    color:  'text-purple-600 dark:text-purple-400',
    bg:     'bg-purple-50 dark:bg-purple-900/30',
    hint:   'Follow-ups completed today',
  },
  {
    key:    'statusChanges',
    label:  'Status Changes',
    icon:   RefreshCw,
    color:  'text-amber-600 dark:text-amber-400',
    bg:     'bg-amber-50 dark:bg-amber-900/30',
    hint:   'Enquiry statuses updated today',
  },
  {
    key:    'notesAdded',
    label:  'Notes',
    icon:   FileText,
    color:  'text-slate-600 dark:text-slate-400',
    bg:     'bg-slate-100 dark:bg-slate-800',
    hint:   'Internal notes added today',
  },
  {
    key:    'productivityScore',
    label:  'Score',
    icon:   TrendingUp,
    color:  'text-rose-600 dark:text-rose-400',
    bg:     'bg-rose-50 dark:bg-rose-900/30',
    format: (v) => `${v} / 100`,
    hint:   'Today\'s productivity score',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface DailyStatsGridProps {
  staffId?: string
  compact?: boolean
}

export default function DailyStatsGrid({ staffId, compact = false }: DailyStatsGridProps) {
  const { myStats, myLoading, myError, setMyStats, setMyLoading } = useActivityStore()

  useEffect(() => {
    setMyLoading('loading')
    getDailyStatsAction(staffId).then((r) => {
      if (r.ok) {
        setMyStats(r.data)
        setMyLoading('ready')
      } else {
        setMyLoading('error', r.error)
      }
    })
  }, [staffId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (myLoading === 'loading' || myLoading === 'idle') {
    return <SkeletonGrid compact={compact} />
  }

  if (myLoading === 'error') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
        {myError ?? 'Failed to load stats'}
      </div>
    )
  }

  if (!myStats) return null

  const data = myStats as unknown as Record<string, number>

  return (
    <div
      className={cn(
        'grid gap-3',
        compact
          ? 'grid-cols-2 sm:grid-cols-4'
          : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-4'
      )}
    >
      {STATS.map((s) => {
        const value = data[s.key] ?? 0
        const Icon  = s.icon
        const label = s.format ? s.format(value) : String(value)

        return (
          <div
            key={s.key}
            title={s.hint}
            className="group relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            {/* Background accent */}
            <div className={cn(
              'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity',
              s.bg
            )} />

            <div className="relative flex flex-col gap-3">
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center',
                s.bg
              )}>
                <Icon className={cn('w-4.5 h-4.5', s.color)} />
              </div>

              <div>
                <p className={cn(
                  'font-bold tabular-nums',
                  compact ? 'text-xl' : 'text-2xl',
                  s.color
                )}>
                  {label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {s.label}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonGrid({ compact }: { compact: boolean }) {
  return (
    <div className={cn(
      'grid gap-3',
      compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-4'
    )}>
      {STATS.map((s) => (
        <div
          key={s.key}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3 animate-pulse"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-1.5">
            <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  )
}
