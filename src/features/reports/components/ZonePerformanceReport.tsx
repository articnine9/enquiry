'use client'

import { useEffect } from 'react'
import { MapPin, TrendingUp } from 'lucide-react'
import { useReportStore, useReportFilters, useZoneReport } from '@/store/report.store'
import { getZonePerformanceReportAction } from '../actions/report.actions'
import ReportFilters from './ReportFilters'
import { exportZonePerformance } from '../utils/csv-export'
import { cn } from '@/lib/utils'

function convColor(rate: number) {
  if (rate >= 60) return { text: 'text-green-600 dark:text-green-400', bar: '#10b981' }
  if (rate >= 30) return { text: 'text-amber-600 dark:text-amber-400', bar: '#f59e0b' }
  return           { text: 'text-red-500 dark:text-red-400',           bar: '#ef4444' }
}

function ZoneTable() {
  const data = useZoneReport()
  if (!data?.rows?.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No zone data for this period</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Zone', 'Total', 'Open', 'Resolved', 'Closed', 'Cancelled', 'Urgent', 'Staff', 'Avg Load', 'Avg Res (h)', 'Conv. Rate'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2.5 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.rows.map((r) => {
            const cc = convColor(r.conversionRate)
            return (
              <tr key={r.zoneId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{r.zoneName}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-xs tabular-nums font-semibold">{r.total}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-amber-600 dark:text-amber-400">{r.open}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-green-600 dark:text-green-400">{r.resolved}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-teal-600 dark:text-teal-400">{r.closed}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-400">{r.cancelled}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-red-500">{r.urgent}</td>
                <td className="py-3 pr-4 text-xs tabular-nums">{r.staffCount}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-500">{r.avgLoad}</td>
                <td className="py-3 pr-4 text-xs tabular-nums text-slate-500">
                  {r.avgResolutionHours ? `${r.avgResolutionHours}h` : '—'}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-1.5 rounded-full" style={{ width: `${r.conversionRate}%`, backgroundColor: cc.bar }} />
                    </div>
                    <span className={cn('text-xs font-bold tabular-nums', cc.text)}>
                      {r.conversionRate}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2.5 pr-4 text-xs font-bold text-slate-800 dark:text-slate-200">Total</td>
            <td className="py-2.5 pr-4 text-xs font-bold tabular-nums">{data.totals.total}</td>
            <td className="py-2.5 pr-4 text-xs font-semibold text-amber-600">{data.totals.open}</td>
            <td className="py-2.5 pr-4 text-xs font-semibold text-green-600">{data.totals.resolved}</td>
            <td colSpan={7} />
            <td className="py-2.5 text-xs font-bold">
              <span className={cn(convColor(data.totals.conversionRate).text)}>
                {data.totals.conversionRate}%
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function ZonePerformanceReport() {
  const { loading, setZone, setLoading } = useReportStore()
  const filters   = useReportFilters()
  const data      = useZoneReport()
  const isLoading = loading['zone'] === 'loading' || loading['zone'] === 'idle'
  const error     = useReportStore((s) => s.error['zone'])

  function runReport() {
    setLoading('zone', 'loading')
    getZonePerformanceReportAction(filters).then((r) => {
      if (r.ok) { setZone(r.data); setLoading('zone', 'ready') }
      else       setLoading('zone', 'error', r.error)
    })
  }

  useEffect(() => { runReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <ReportFilters
        onRefresh={runReport}
        onExport={() => data?.rows?.length && exportZonePerformance(data.rows)}
        showExport={!!data?.rows?.length}
        loading={isLoading}
        showZone
      />

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {isLoading && !data && (
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      )}

      {data && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Zones</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{data.rows.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Enquiries</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{data.totals.total}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Resolved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{data.totals.resolved}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Overall Conv. Rate</p>
              <p className={cn('text-2xl font-bold mt-1', convColor(data.totals.conversionRate).text)}>
                {data.totals.conversionRate}%
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Zone Breakdown</h3>
            </div>
            <ZoneTable />
          </div>
        </>
      )}
    </div>
  )
}
