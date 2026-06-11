'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  FileText, CheckCircle2, CalendarCheck,
  AlertCircle, Clock, TrendingUp, Phone,
} from 'lucide-react'
import { useDashboardStore, useStaffDash } from '@/store/dashboard.store'
import { getStaffDashboardAction } from '../actions/dashboard.actions'
import StatCard from './StatCard'
import DonutChart from './DonutChart'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1', assigned: '#3b82f6', in_progress: '#f59e0b',
  follow_up: '#8b5cf6', resolved: '#10b981', closed: '#14b8a6', cancelled: '#ef4444',
}

const STATUS_LABEL: Record<string, { text: string; bg: string; dot: string }> = {
  new:         { text: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-900/30', dot: 'bg-indigo-400' },
  assigned:    { text: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-100 dark:bg-blue-900/30',    dot: 'bg-blue-400'    },
  in_progress: { text: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-100 dark:bg-amber-900/30',  dot: 'bg-amber-400'   },
  follow_up:   { text: 'text-purple-700 dark:text-purple-300',bg: 'bg-purple-100 dark:bg-purple-900/30',dot: 'bg-purple-400'  },
}

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-green-400', medium: 'bg-blue-400', high: 'bg-amber-400', urgent: 'bg-red-500',
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_LABEL[status] ?? { text: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' }
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', c.text, c.bg)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {status.replace('_', ' ')}
    </span>
  )
}

function fmtAge(hours: number): string {
  if (hours < 1)  return '< 1h'
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

// ── Today's follow-ups ────────────────────────────────────────────────────────

function TodayFollowUps() {
  const data  = useStaffDash()
  const items = data?.myFollowUps?.todayDue ?? []

  if (!items.length) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No follow-ups scheduled today</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((f) => (
        <div key={f._id} className="flex items-start gap-3 py-3">
          <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Link href={`/enquiries/${f.enquiryId}`} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              {f.enquiryNo}
            </Link>
            {f.enquiryName && (
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{f.enquiryName}</p>
            )}
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">{f.type}</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex-shrink-0 tabular-nums">
            {new Date(f.scheduledAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Overdue follow-ups ────────────────────────────────────────────────────────

function OverdueFollowUps() {
  const data  = useStaffDash()
  const items = data?.myFollowUps?.overdue ?? []

  if (!items.length) return null

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
          Overdue Follow-ups ({items.length})
        </h4>
      </div>
      <div className="space-y-2">
        {items.map((f) => (
          <div key={f._id} className="flex items-center gap-2">
            <Link href={`/enquiries/${f.enquiryId}`} className="text-xs font-semibold text-red-700 dark:text-red-400 hover:underline">
              {f.enquiryNo}
            </Link>
            <span className="text-[10px] text-red-500 uppercase">{f.type}</span>
            <span className="ml-auto text-[10px] text-red-600 dark:text-red-400 tabular-nums">
              {new Date(f.scheduledAt).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Recent active enquiries ───────────────────────────────────────────────────

function RecentEnquiriesList() {
  const data = useStaffDash()
  const rows = data?.myEnquiries?.recentActive ?? []

  if (!rows.length) {
    return <p className="text-sm text-slate-400 py-4 text-center">No active enquiries</p>
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((e) => (
        <div key={e._id} className="flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-1 rounded transition-colors">
          {/* Priority dot */}
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[e.priority] ?? 'bg-slate-400')} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/enquiries/${e._id}`} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {e.enquiryNo}
              </Link>
              <StatusBadge status={e.status} />
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-0.5">{e.name}</p>
          </div>
          <p className="text-[10px] text-slate-400 flex-shrink-0 tabular-nums">
            {new Date(e.updatedAt).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Pending tasks ─────────────────────────────────────────────────────────────

function PendingTasksList() {
  const data  = useStaffDash()
  const tasks = data?.pendingTasks ?? []

  if (!tasks.length) {
    return (
      <div className="py-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
        <p className="text-sm text-slate-400">All tasks are up to date</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {tasks.map((t) => (
        <div key={t._id} className="flex items-center gap-3 py-3">
          <div className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[t.priority] ?? 'bg-slate-400')} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/enquiries/${t._id}`} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {t.enquiryNo}
              </Link>
              <StatusBadge status={t.status} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{t.name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={cn('text-[11px] font-semibold tabular-nums', t.ageHours > 48 ? 'text-red-500' : t.ageHours > 24 ? 'text-amber-600' : 'text-slate-500')}>
              {fmtAge(t.ageHours)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Productivity ring ─────────────────────────────────────────────────────────

function ProductivityRing({ score }: { score: number }) {
  const clamped   = Math.min(Math.max(score, 0), 100)
  const r         = 44
  const circum    = 2 * Math.PI * r
  const dash      = (clamped / 100) * circum
  const color     = clamped >= 80 ? '#10b981' : clamped >= 50 ? '#3b82f6' : clamped >= 25 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={120} height={120} className="rotate-[-90deg]">
        <circle cx={60} cy={60} r={r} fill="none" stroke="currentColor" strokeWidth={10} className="text-slate-100 dark:text-slate-800" />
        <circle
          cx={60} cy={60} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circum - dash}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center pointer-events-none" style={{ marginTop: -76 }}>
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{clamped}</span>
        <span className="text-[10px] text-slate-400">/ 100</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">Today&apos;s Score</p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StaffDashboard() {
  const {
    staffLoading, staffError,
    setStaff, setStaffLoading,
  } = useDashboardStore()
  const data = useStaffDash()

  useEffect(() => {
    setStaffLoading('loading')
    getStaffDashboardAction().then((r) => {
      if (r.ok) { setStaff(r.data); setStaffLoading('ready') }
      else       setStaffLoading('error', r.error)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (staffLoading === 'loading' || staffLoading === 'idle') {
    return <LoadingSkeleton />
  }

  if (staffLoading === 'error') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5 text-sm text-red-700 dark:text-red-400">
        {staffError}
      </div>
    )
  }

  if (!data) return null

  const { myEnquiries, myFollowUps, todayScore } = data

  const statusSlices = myEnquiries.byStatus.map((s) => ({
    label: s._id, value: s.count, color: STATUS_COLORS[s._id] ?? '#94a3b8',
  }))

  return (
    <div className="space-y-6">

      {/* ── Row 1: KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="My Enquiries"   value={myEnquiries.total}
          icon={FileText}     iconColor="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-50 dark:bg-indigo-900/30" />
        <StatCard label="Active"         value={myEnquiries.active}
          icon={AlertCircle}  iconColor="text-amber-600 dark:text-amber-400"  iconBg="bg-amber-50 dark:bg-amber-900/30" />
        <StatCard label="Resolved Today" value={myEnquiries.resolvedToday}
          icon={CheckCircle2} iconColor="text-green-600 dark:text-green-400"  iconBg="bg-green-50 dark:bg-green-900/30" />
        <StatCard label="Follow-ups Today" value={myFollowUps.todayCount}
          icon={CalendarCheck} iconColor="text-blue-600 dark:text-blue-400"   iconBg="bg-blue-50 dark:bg-blue-900/30" />
      </div>

      {/* ── Row 2: Score ring + Status donut ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Productivity score */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 flex flex-col items-center justify-center gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 self-start">
            Productivity
          </h3>
          <div className="relative flex items-center justify-center">
            <ProductivityRing score={todayScore} />
          </div>
        </div>

        {/* Enquiry by status donut */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
            My Enquiries by Status
          </h3>
          {statusSlices.length > 0 ? (
            <DonutChart
              slices={statusSlices}
              label={String(myEnquiries.total)}
              sublabel="Total"
              size={140}
              thickness={24}
            />
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-slate-400">
              No enquiries assigned
            </div>
          )}
        </div>

        {/* Overdue alert */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Follow-up Status
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                {myFollowUps.completedToday}
              </p>
              <p className="text-[11px] text-green-700 dark:text-green-500 mt-0.5">Done Today</p>
            </div>
            <div className={cn(
              'text-center p-3 rounded-lg',
              myFollowUps.overdueCount > 0
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-slate-50 dark:bg-slate-800'
            )}>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                myFollowUps.overdueCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-400'
              )}>
                {myFollowUps.overdueCount}
              </p>
              <p className={cn(
                'text-[11px] mt-0.5',
                myFollowUps.overdueCount > 0
                  ? 'text-red-700 dark:text-red-500'
                  : 'text-slate-400'
              )}>
                Overdue
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Overdue alert banner ──────────────────────────────────────────── */}
      {myFollowUps.overdueCount > 0 && <OverdueFollowUps />}

      {/* ── Row 3: Today's follow-ups + Pending tasks ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Today&apos;s Follow-ups
              </h3>
            </div>
            <Link href="/follow-ups" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          <TodayFollowUps />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Pending Tasks
            </h3>
          </div>
          <PendingTasksList />
        </div>
      </div>

      {/* ── Row 4: Recent active enquiries ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              My Active Enquiries
            </h3>
          </div>
          <Link href="/enquiries" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View all →
          </Link>
        </div>
        <RecentEnquiriesList />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-52 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-52 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}
