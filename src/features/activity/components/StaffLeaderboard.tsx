'use client'

import { useEffect } from 'react'
import { Trophy, Phone, CheckCircle2, CalendarCheck, Clock } from 'lucide-react'
import { useActivityStore, useLeaderboard, useTeamPeriod } from '@/store/activity.store'
import { getLeaderboardAction } from '../actions/activity.actions'
import { cn } from '@/lib/utils'
import type { PeriodFilter } from '@/store/activity.store'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: 'Today',
  week:  'This Week',
  month: 'This Month',
}

function medal(rank: number) {
  if (rank === 1) return { emoji: '🥇', cls: 'text-amber-500  bg-amber-50  dark:bg-amber-900/30'  }
  if (rank === 2) return { emoji: '🥈', cls: 'text-slate-500  bg-slate-100 dark:bg-slate-800'      }
  if (rank === 3) return { emoji: '🥉', cls: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30' }
  return null
}

function scoreBar(score: number, max: number) {
  const pct = Math.round((score / Math.max(max, 1)) * 100)
  const color =
    pct >= 80 ? 'bg-green-500'  :
    pct >= 50 ? 'bg-blue-500'   :
    pct >= 25 ? 'bg-amber-400'  : 'bg-red-400'
  return { pct, color }
}

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StaffLeaderboardProps {
  className?: string
}

export default function StaffLeaderboard({ className }: StaffLeaderboardProps) {
  const {
    teamLoading, teamError,
    setLeaderboard, setTeamPeriod, setTeamLoading,
  } = useActivityStore()

  const entries = useLeaderboard()
  const period  = useTeamPeriod()
  const maxScore = Math.max(...entries.map((e) => e.totalScore), 1)

  useEffect(() => {
    setTeamLoading('loading')
    getLeaderboardAction(period).then((r) => {
      if (r.ok) { setLeaderboard(r.data); setTeamLoading('ready') }
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
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Leaderboard</h3>
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

      {/* Loading skeleton */}
      {teamLoading === 'loading' && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-2 w-full rounded bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="h-5 w-10 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {teamLoading === 'error' && (
        <div className="px-5 py-4 text-sm text-red-600 dark:text-red-400">{teamError}</div>
      )}

      {/* List */}
      {teamLoading === 'ready' && (
        <>
          {entries.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No activity data for this period
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((entry) => {
                const bar    = scoreBar(entry.totalScore, maxScore)
                const m      = medal(entry.rank)
                const initials = entry.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                return (
                  <div
                    key={entry.staffId}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    {/* Rank / avatar */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                        {initials}
                      </div>
                      {m && (
                        <span className="absolute -top-1 -right-1 text-[11px] leading-none">
                          {m.emoji}
                        </span>
                      )}
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {entry.name}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums ml-2">
                          {entry.totalScore}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={cn('h-1.5 rounded-full transition-all', bar.color)}
                          style={{ width: `${bar.pct}%` }}
                        />
                      </div>
                      {/* Mini metrics */}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {entry.enquiriesResolved}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {entry.callsMade}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <CalendarCheck className="w-2.5 h-2.5" />
                          {entry.followUpsCompleted}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {fmtHours(entry.onlineMinutes)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
