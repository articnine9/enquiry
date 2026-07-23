'use client'

import { useEffect, useState } from 'react'
import { Store, TrendingUp } from 'lucide-react'
import { useReportStore, useReportFilters, useDealerReport } from '@/store/report.store'
import { getDealerPerformanceReportAction } from '../actions/report.actions'
import { getDealerOptionsAction, type OptionRow } from '@/features/field-visits/actions/fieldVisit.actions'
import ReportFilters from './ReportFilters'
import { cn } from '@/lib/utils'

function convColor(rate: number) {
  if (rate >= 60) return 'text-green-600 dark:text-green-400'
  if (rate >= 30) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

function DealerTable() {
  const data = useDealerReport()
  const rows = data?.rows ?? []

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No dealer leads for this period</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Dealer', 'Leads Received', 'Leads Converted', 'Conversion Rate'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2.5 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <Store className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{r.name}</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-xs tabular-nums font-semibold">{r.leadsReceived}</td>
              <td className="py-3 pr-4 text-xs tabular-nums text-green-600 dark:text-green-400">{r.leadsConverted}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${r.conversionRate}%` }} />
                  </div>
                  <span className={cn('text-xs font-bold tabular-nums', convColor(r.conversionRate))}>
                    {r.conversionRate}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
            <td className="py-2.5 pr-4 text-xs font-bold text-slate-800 dark:text-slate-200">Total</td>
            <td className="py-2.5 pr-4 text-xs font-bold tabular-nums">{data!.totals.leadsReceived}</td>
            <td className="py-2.5 pr-4 text-xs font-semibold text-green-600">{data!.totals.leadsConverted}</td>
            <td className="py-2.5 text-xs font-bold">
              <span className={convColor(data!.totals.conversionRate)}>{data!.totals.conversionRate}%</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function DealerPerformanceReport() {
  const { loading, setDealer, setLoading, setFilters } = useReportStore()
  const filters   = useReportFilters()
  const data      = useDealerReport()
  const isLoading = loading['dealer'] === 'loading' || loading['dealer'] === 'idle'
  const error     = useReportStore((s) => s.error['dealer'])

  const [dealers, setDealers] = useState<OptionRow[]>([])

  useEffect(() => {
    getDealerOptionsAction().then((r) => { if (r.ok) setDealers(r.data) })
  }, [])

  function runReport() {
    setLoading('dealer', 'loading')
    getDealerPerformanceReportAction(filters).then((r) => {
      if (r.ok) { setDealer(r.data); setLoading('dealer', 'ready') }
      else       setLoading('dealer', 'error', r.error)
    })
  }

  useEffect(() => { runReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <ReportFilters onRefresh={runReport} showExport={false} loading={isLoading} showZone={false} className="flex-1" />
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Dealer</label>
          <select
            value={filters.dealerId ?? ''}
            onChange={(e) => setFilters({ dealerId: e.target.value || undefined })}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Dealers</option>
            {dealers.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {isLoading && !data && (
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Leads Received</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{data.totals.leadsReceived}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400">Leads Converted</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{data.totals.leadsConverted}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-1"><TrendingUp className="w-3.5 h-3.5" /><p className="text-xs">Conversion Rate</p></div>
              <p className={cn('text-2xl font-bold', convColor(data.totals.conversionRate))}>{data.totals.conversionRate}%</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Dealer Breakdown</h3>
            <DealerTable />
          </div>
        </>
      )}
    </div>
  )
}
