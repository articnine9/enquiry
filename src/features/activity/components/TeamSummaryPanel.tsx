'use client'

import { useEffect } from 'react'
import {
  Users, CheckCircle2, Phone, CalendarCheck,
  CalendarX, Clock, TrendingUp,
} from 'lucide-react'
import { useActivityStore, useTeamSummary, useTeamPeriod } from '@/store/activity.store'
import { getTeamSummaryAction } from '../actions/activity.actions'
import { cn } from '@/lib/utils'
import type { PeriodFilter } from '@/store/activity.store'

// ── Config ────────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: 'Today',
  week:  'This Week',
  month: 'This Month',
}

interface MetricDef {
  key:     keyof import('../actions/activity.actions').TeamSummary
  label:   string
  icon:    React.ElementType
  color:   string
  bg:      string
  format?: (v: number) => string
}

const METRICS: MetricDef[] = [
  {
    key:   'activeStaffCount',
    label: 'Active Staff',
    icon:  Users,
    color: 'text-blue-600 dark:text-blue-400',
    bg:    'bg-blue-50 dark:bg-blue-900/30',
  },
  {
    key:   'enquiriesResolved',
    label: 'Resolved',
    icon:  CheckCircle2,
    color: 'text-green-600 dark:text-green-400',
    bg:    'bg-green-50 dark:bg-green-900/30',
  },
  {
    key:   'enquiriesAssigned',
    label: 'Assigned',
    icon:  Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg:    'bg-indigo-50 dark:bg-indigo-900/30',
  },
  {
    key:   'callsMade',
    label: 'Calls Made',
    icon:  Phone,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg:    'bg-emerald-50 dark:bg-emerald-900/30',
  },
  {
    key:   'followUpsCompleted',
    label: 'Follow-ups Done',
    icon:  CalendarCheck,
    color: 'text-purple-600 dark:text-purple-400',
    bg:    'bg-purple-50 dark:bg-purple-900/30',
  },
  {
    key:   'followUpsMissed',
    label: 'Missed',
    icon:  CalendarX,
    color: 'text-red-600 dark:text-red-400',
    bg:    'bg-red-50 dark:bg-red-900/30',
  },
  {
    key:    'onlineMinutes',
    label:  'Team Hours',
    icon:   Clock,
    color:  'text-amber-600 dark:text-amber-400',
    bg:     'bg-amber-50 dark:bg-amber-900/30',
    format: (v) => `${Math.floor(v / 60)}h`,
  },
  {
    key:    'avgScore',
    label:  'Avg Score',
    icon:   TrendingUp,
    color:  'text-rose-600 dark:text-rose-400',
    bg:     'bg-rose-50 dark:bg-rose-900/30',
    format: (v) => `${Math.round(v)}`,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface TeamSummaryPanelProps {
  className?: string
}

export default function TeamSummaryPanel({ className }: TeamSummaryPanelProps) {
  const { teamLoading, teamError, setTeamSummary, setTeamPeriod, setTeamLoading } = useActivityStore()
  const summary = useTeamSummary()
  const period  = useTeamPeriod()

  useEffect(() => {
    setTeamLoading('loading')
    getTeamSummaryAction(period).then((r) => {
      if (r.ok) { setTeamSummary(r.data); setTeamLoading('ready') }
      else       setTeamLoading('error', r.error)
    })
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn(
      'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Team Summary</h3>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTeamPeriod(p)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                period === p
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {(teamLoading === 'loading' || teamLoading === 'idle') && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 animate-pulse">
          {METRICS.map((m) => (
            <div key={m.key} className="rounded-lg bg-slate-100 dark:bg-slate-800 h-20" />
          ))}
        </div>
      )}

      {/* Error */}
      {teamLoading === 'error' && (
        <div className="px-5 py-4 text-sm text-red-600 dark:text-red-400">{teamError}</div>
      )}

      {/* Data */}
      {teamLoading === 'ready' && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
          {METRICS.map((m) => {
            const raw   = summary[m.key] as number
            const label = m.format ? m.format(raw) : String(raw)
            const Icon  = m.icon
            return (
              <div
                key={m.key}
                className="group relative rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 hover:shadow-sm transition-shadow overflow-hidden"
              >
                <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity', m.bg)} />
                <div className="relative">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', m.bg)}>
                    <Icon className={cn('w-4 h-4', m.color)} />
                  </div>
                  <p className={cn('text-xl font-bold tabular-nums', m.color)}>{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
