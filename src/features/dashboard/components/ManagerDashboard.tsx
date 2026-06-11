'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  Users, FileText, CalendarCheck, CalendarX,
  Clock, Phone, CheckCircle2, AlertTriangle, TrendingUp,
} from 'lucide-react'
import { useDashboardStore, useManagerDash } from '@/store/dashboard.store'
import { getManagerDashboardAction } from '../actions/dashboard.actions'
import StatCard from './StatCard'
import DonutChart from './DonutChart'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'

// ── Priority colours ──────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, { text: string; bg: string }> = {
  low:    { text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30'   },
  medium: { text: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/30'     },
  high:   { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30'   },
  urgent: { text: 'text-red-700 dark:text-red-400',     bg: 'bg-red-100 dark:bg-red-900/30'       },
}

const STATUS_COLORS: Record<string, string> = {
  new:         '#6366f1', assigned: '#3b82f6', in_progress: '#f59e0b',
  follow_up:   '#8b5cf6', resolved: '#10b981', closed: '#14b8a6', cancelled: '#ef4444',
}

function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_COLOR[priority] ?? { text: 'text-slate-600', bg: 'bg-slate-100' }
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide', c.text, c.bg)}>
      {priority}
    </span>
  )
}

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Team performance table ────────────────────────────────────────────────────

function TeamPerfTable() {
  const data = useManagerDash()
  if (!data?.teamPerf?.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No team activity data for this period
      </div>
    )
  }

  const maxScore = Math.max(...data.teamPerf.map((t) => t.avgScore), 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Staff', 'Assigned', 'Resolved', 'Rate', 'Calls', 'Follow-ups', 'Online', 'Score'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.teamPerf.map((t) => {
            const scorePct = Math.round((t.avgScore / maxScore) * 100)
            const barColor = scorePct >= 80 ? '#10b981' : scorePct >= 50 ? '#3b82f6' : scorePct >= 25 ? '#f59e0b' : '#ef4444'
            const initials = t.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

            return (
              <tr key={t.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight">{t.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{t.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 tabular-nums text-xs">{t.enquiriesAssigned}</td>
                <td className="py-3 pr-4 tabular-nums text-xs text-green-600 dark:text-green-400">{t.enquiriesResolved}</td>
                <td className="py-3 pr-4 text-xs">
                  <span className={cn('font-semibold', t.resolutionRate >= 60 ? 'text-green-600' : t.resolutionRate >= 30 ? 'text-amber-600' : 'text-red-500')}>
                    {t.resolutionRate}%
                  </span>
                </td>
                <td className="py-3 pr-4 tabular-nums text-xs">{t.callsMade}</td>
                <td className="py-3 pr-4 tabular-nums text-xs">{t.followUpsCompleted}</td>
                <td className="py-3 pr-4 tabular-nums text-xs text-slate-500">{fmtHours(t.totalOnlineMinutes)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1.5 rounded-full" style={{ width: `${scorePct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color: barColor }}>{t.avgScore}</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Oldest pending enquiries ──────────────────────────────────────────────────

function OldestPendingList() {
  const data = useManagerDash()
  const rows = data?.pending?.oldest ?? []

  if (!rows.length) {
    return <p className="text-sm text-slate-400 py-4 text-center">All caught up!</p>
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((e) => (
        <div key={e._id} className="flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-1 rounded transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/enquiries/${e._id}`} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {e.enquiryNo}
              </Link>
              <PriorityBadge priority={e.priority} />
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-0.5">{e.name}</p>
            {e.assignee && <p className="text-[10px] text-slate-400">→ {e.assignee}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {e.ageHours}h
            </p>
            <p className="text-[10px] text-slate-400">old</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Today's follow-up list ────────────────────────────────────────────────────

function TodayFollowUpsList() {
  const data  = useManagerDash()
  const items = data?.followUps?.todayList ?? []

  if (!items.length) {
    return <p className="text-sm text-slate-400 py-4 text-center">No follow-ups scheduled today</p>
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
      {items.map((f) => (
        <div key={f._id} className="flex items-start gap-3 py-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/enquiries/${f.enquiryId}`} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {f.enquiryNo}
              </Link>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">{f.type}</span>
            </div>
            {f.staffName && <p className="text-[10px] text-slate-400">{f.staffName}</p>}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex-shrink-0 tabular-nums">
            {new Date(f.scheduledAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const {
    managerLoading, managerError,
    setManager, setManagerLoading,
  } = useDashboardStore()
  const data = useManagerDash()

  useEffect(() => {
    setManagerLoading('loading')
    getManagerDashboardAction().then((r) => {
      if (r.ok) { setManager(r.data); setManagerLoading('ready') }
      else       setManagerLoading('error', r.error)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (managerLoading === 'loading' || managerLoading === 'idle') {
    return <LoadingSkeleton />
  }

  if (managerLoading === 'error') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5 text-sm text-red-700 dark:text-red-400">
        {managerError}
      </div>
    )
  }

  if (!data) return null

  const { pending, followUps } = data

  const statusSlices = pending.byStatus.map((s) => ({
    label: s._id, value: s.count, color: STATUS_COLORS[s._id] ?? '#94a3b8',
  }))

  const followUpByType = followUps.byType.map((t) => ({
    label: t._id, value: t.count,
  }))

  return (
    <div className="space-y-6">

      {/* ── Row 1: KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending Enquiries" value={pending.total}
          icon={FileText}     iconColor="text-amber-600 dark:text-amber-400"  iconBg="bg-amber-50 dark:bg-amber-900/30" />
        <StatCard label="Unassigned"        value={pending.unassigned}
          icon={AlertTriangle} iconColor="text-red-600 dark:text-red-400"    iconBg="bg-red-50 dark:bg-red-900/30" />
        <StatCard label="Follow-ups Today"  value={followUps.todayDue}
          icon={CalendarCheck} iconColor="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-50 dark:bg-indigo-900/30" />
        <StatCard label="Overdue Follow-ups" value={followUps.overdue}
          icon={CalendarX}    iconColor="text-rose-600 dark:text-rose-400"    iconBg="bg-rose-50 dark:bg-rose-900/30" />
      </div>

      {/* ── Row 2: Follow-up summary cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Completed Today"  value={followUps.completedToday}
          icon={CheckCircle2} iconColor="text-green-600 dark:text-green-400"  iconBg="bg-green-50 dark:bg-green-900/30" size="sm" />
        <StatCard label="Upcoming (7d)"    value={followUps.upcoming}
          icon={Clock}        iconColor="text-blue-600 dark:text-blue-400"    iconBg="bg-blue-50 dark:bg-blue-900/30"  size="sm" />
        <StatCard label="Team Members"     value={data.teamPerf.length}
          icon={Users}        iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-50 dark:bg-purple-900/30" size="sm" />
        <StatCard label="Avg Score"
          value={data.teamPerf.length
            ? Math.round(data.teamPerf.reduce((s, t) => s + t.avgScore, 0) / data.teamPerf.length)
            : 0
          }
          icon={TrendingUp}   iconColor="text-teal-600 dark:text-teal-400"    iconBg="bg-teal-50 dark:bg-teal-900/30"  size="sm" />
      </div>

      {/* ── Row 3: Pending breakdown + Today's follow-ups ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Pending by Status
          </h3>
          {statusSlices.length > 0 ? (
            <DonutChart slices={statusSlices} label={String(pending.total)} sublabel="Pending" size={140} thickness={24} />
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No pending enquiries</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Today&apos;s Follow-ups
            </h3>
            <Link href="/follow-ups" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          <TodayFollowUpsList />
        </div>
      </div>

      {/* ── Row 4: Team performance table ────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Team Performance</h3>
          </div>
          <Link href="/staff" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            All staff →
          </Link>
        </div>
        <TeamPerfTable />
      </div>

      {/* ── Row 5: Oldest pending enquiries ──────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Oldest Pending Enquiries
            </h3>
          </div>
          <Link href="/enquiries?sort=createdAt&order=asc" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View all →
          </Link>
        </div>
        <OldestPendingList />
      </div>

    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-52 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-52 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="h-56 rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}
