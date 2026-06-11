'use client'

import { useEffect } from 'react'
import { CalendarCheck, CalendarX, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useReportStore, useReportFilters, useFollowUpReport } from '@/store/report.store'
import { getFollowUpReportAction } from '../actions/report.actions'
import ReportFilters from './ReportFilters'
import ReportLineChart from './charts/ReportLineChart'
import HorizontalBarChart from './charts/HorizontalBarChart'
import { exportFollowUpByStaff } from '../utils/csv-export'
import { cn } from '@/lib/utils'

function KpiCard({ label, value, icon: Icon, color, bg }: {
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

function StaffFollowUpTable() {
  const data = useFollowUpReport()
  const rows = data?.byStaff ?? []

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-slate-400">No staff data for this period</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Staff', 'Scheduled', 'Completed', 'Missed', 'Completion Rate'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2.5 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => {
            const rateColor =
              r.completionRate >= 80 ? 'text-green-600 dark:text-green-400' :
              r.completionRate >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                       'text-red-500 dark:text-red-400'
            const barColor =
              r.completionRate >= 80 ? '#10b981' :
              r.completionRate >= 50 ? '#f59e0b' : '#ef4444'

            const initials = r.staffName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

            return (
              <tr key={r.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                      {initials}
                    </div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{r.staffName}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-xs tabular-nums">{r.scheduled}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-green-600 dark:text-green-400">{r.completed}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-red-500">{r.missed}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1.5 rounded-full" style={{ width: `${r.completionRate}%`, backgroundColor: barColor }} />
                    </div>
                    <span className={cn('text-xs font-bold tabular-nums', rateColor)}>
                      {r.completionRate}%
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

export default function FollowUpReport() {
  const { loading, setFollowUp, setLoading } = useReportStore()
  const filters   = useReportFilters()
  const data      = useFollowUpReport()
  const isLoading = loading['followup'] === 'loading' || loading['followup'] === 'idle'
  const error     = useReportStore((s) => s.error['followup'])

  function runReport() {
    setLoading('followup', 'loading')
    getFollowUpReportAction(filters).then((r) => {
      if (r.ok) { setFollowUp(r.data); setLoading('followup', 'ready') }
      else       setLoading('followup', 'error', r.error)
    })
  }

  useEffect(() => { runReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const completionColor =
    (data?.completionRate ?? 0) >= 80 ? 'text-green-600 dark:text-green-400' :
    (data?.completionRate ?? 0) >= 50 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-red-500 dark:text-red-400'

  return (
    <div className="space-y-5">
      <ReportFilters
        onRefresh={runReport}
        onExport={() => data?.byStaff?.length && exportFollowUpByStaff(data.byStaff)}
        showExport={!!data?.byStaff?.length}
        loading={isLoading}
        showStaff
      />

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {isLoading && !data && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
          <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard label="Scheduled"      value={data.totals.scheduled}
              icon={CalendarCheck} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-900/30" />
            <KpiCard label="Completed"      value={data.totals.completed}
              icon={CheckCircle2}  color="text-green-600 dark:text-green-400"  bg="bg-green-50 dark:bg-green-900/30" />
            <KpiCard label="Missed"         value={data.totals.missed}
              icon={AlertCircle}   color="text-red-600 dark:text-red-400"      bg="bg-red-50 dark:bg-red-900/30" />
            <KpiCard label="Pending"        value={data.totals.pending}
              icon={Clock}         color="text-amber-600 dark:text-amber-400"  bg="bg-amber-50 dark:bg-amber-900/30" />
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-center items-center">
              <p className={cn('text-3xl font-bold tabular-nums', completionColor)}>
                {data.completionRate}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Completion Rate</p>
              {data.avgCompletionDays > 0 && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Avg {data.avgCompletionDays}d to complete
                </p>
              )}
            </div>
          </div>

          {/* Trend + distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Daily Trend</h3>
              <ReportLineChart
                data={data.dailyTrend as unknown as Record<string, unknown>[]}
                xKey="date"
                xFormat={(v) => new Date(v).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
                series={[
                  { key: 'scheduled', label: 'Scheduled', color: '#6366f1' },
                  { key: 'completed', label: 'Completed', color: '#10b981' },
                  { key: 'missed',    label: 'Missed',    color: '#ef4444' },
                ]}
                height={120}
              />
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">By Type</h4>
                <HorizontalBarChart data={data.byType.map((t, i) => ({ label: t._id, value: t.count }))} showPct={false} />
              </div>
              {data.byOutcome.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">By Outcome</h4>
                  <HorizontalBarChart data={data.byOutcome.map((t, i) => ({ label: t._id, value: t.count }))} showPct={false} />
                </div>
              )}
            </div>
          </div>

          {/* Staff table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">By Staff</h3>
            <StaffFollowUpTable />
          </div>
        </>
      )}
    </div>
  )
}
