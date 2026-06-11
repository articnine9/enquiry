'use client'

import { useEffect } from 'react'
import { Users, CheckCircle2, Phone, CalendarCheck, Clock, TrendingUp } from 'lucide-react'
import { useReportStore, useReportFilters, useStaffReport } from '@/store/report.store'
import { getStaffPerformanceReportAction } from '../actions/report.actions'
import ReportFilters from './ReportFilters'
import { exportStaffPerformance } from '../utils/csv-export'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-blue-600 dark:text-blue-400'
  if (score >= 25) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

function scoreBarColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 50) return '#3b82f6'
  if (score >= 25) return '#f59e0b'
  return '#ef4444'
}

function rateColor(rate: number) {
  if (rate >= 60) return 'text-green-600 dark:text-green-400'
  if (rate >= 30) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function TeamKpiCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: string | number
  icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col gap-3">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bg)}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <div>
        <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Staff table ───────────────────────────────────────────────────────────────

function StaffTable() {
  const data = useStaffReport()
  const rows = data?.rows ?? []

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No staff activity data for this period</p>
  }

  const maxScore = Math.max(...rows.map((r) => r.avgScore), 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Staff', 'Zone', 'Days Active', 'Assigned', 'Resolved', 'Rate', 'Calls', 'Follow-ups', 'Online', 'Score'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2.5 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, rank) => {
            const scorePct = Math.round((r.avgScore / maxScore) * 100)
            const initials = r.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

            return (
              <tr key={r.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-200 dark:from-indigo-900 dark:to-blue-900 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                        {initials}
                      </div>
                      {rank === 0 && <span className="absolute -top-1 -right-1 text-[11px]">🥇</span>}
                      {rank === 1 && <span className="absolute -top-1 -right-1 text-[11px]">🥈</span>}
                      {rank === 2 && <span className="absolute -top-1 -right-1 text-[11px]">🥉</span>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{r.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-xs text-slate-500">{r.zoneName}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-700 dark:text-slate-300">{r.activeDays}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-700 dark:text-slate-300">{r.enquiriesAssigned}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-green-600 dark:text-green-400">{r.enquiriesResolved}</td>
                <td className="py-3 pr-4 text-xs">
                  <span className={cn('font-semibold tabular-nums', rateColor(r.resolutionRate))}>
                    {r.resolutionRate}%
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-700 dark:text-slate-300">{r.callsMade}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-700 dark:text-slate-300">{r.followUpsCompleted}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-500">{fmtHours(r.totalOnlineMinutes)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${scorePct}%`, backgroundColor: scoreBarColor(r.avgScore) }}
                      />
                    </div>
                    <span className={cn('text-xs font-bold tabular-nums', scoreColor(r.avgScore))}>
                      {r.avgScore}
                    </span>
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function StaffPerformanceReport() {
  const { loading, setStaff, setLoading } = useReportStore()
  const filters   = useReportFilters()
  const data      = useStaffReport()
  const isLoading = loading['staff'] === 'loading' || loading['staff'] === 'idle'
  const error     = useReportStore((s) => s.error['staff'])

  function runReport() {
    setLoading('staff', 'loading')
    getStaffPerformanceReportAction(filters).then((r) => {
      if (r.ok) { setStaff(r.data); setLoading('staff', 'ready') }
      else       setLoading('staff', 'error', r.error)
    })
  }

  useEffect(() => { runReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleExport() {
    if (!data?.rows?.length) return
    exportStaffPerformance(data.rows)
  }

  return (
    <div className="space-y-5">
      <ReportFilters
        onRefresh={runReport}
        onExport={handleExport}
        showExport={!!data?.rows?.length}
        loading={isLoading}
        showZone
        showStaff
      />

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading && !data && <Skeleton />}

      {data && (
        <>
          {/* Team KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <TeamKpiCard label="Team Members"   value={data.rows.length}
              icon={Users}        color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-900/30" />
            <TeamKpiCard label="Total Assigned" value={data.totals.enquiriesAssigned}
              icon={Users}        color="text-blue-600 dark:text-blue-400"    bg="bg-blue-50 dark:bg-blue-900/30" />
            <TeamKpiCard label="Total Resolved" value={data.totals.enquiriesResolved}
              icon={CheckCircle2} color="text-green-600 dark:text-green-400"  bg="bg-green-50 dark:bg-green-900/30" />
            <TeamKpiCard label="Total Calls"    value={data.totals.callsMade}
              icon={Phone}        color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-900/30" />
            <TeamKpiCard label="Follow-ups Done" value={data.totals.followUpsCompleted}
              icon={CalendarCheck} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/30" />
            <TeamKpiCard label="Avg Team Score" value={data.totals.avgTeamScore}
              icon={TrendingUp}   color="text-teal-600 dark:text-teal-400"    bg="bg-teal-50 dark:bg-teal-900/30" />
          </div>

          {/* Staff performance table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Individual Performance
            </h3>
            <StaffTable />
          </div>
        </>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}
