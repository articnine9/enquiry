'use client'

import { useEffect } from 'react'
import { Megaphone, Target, TrendingUp } from 'lucide-react'
import { useReportStore, useReportFilters, useMarketingReport } from '@/store/report.store'
import { getMarketingReportAction } from '../actions/report.actions'
import ReportFilters from './ReportFilters'
import HorizontalBarChart from './charts/HorizontalBarChart'
import { ENQUIRY_SOURCE_LABELS, EnquirySource } from '@/types/enums'
import { cn } from '@/lib/utils'

function sourceLabel(source: string): string {
  return ENQUIRY_SOURCE_LABELS[source as EnquirySource] ?? source
}

function convColor(rate: number) {
  if (rate >= 60) return 'text-green-600 dark:text-green-400'
  if (rate >= 30) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

function BusinessCategoryTable() {
  const data = useMarketingReport()
  const rows = data?.byBusinessCategory ?? []

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No classified leads for this period</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Category', 'Sub-Category', 'Leads', 'Converted', 'Conversion Rate'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2.5 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => (
            <tr key={`${r.category}-${r.subCategory}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <td className="py-3 pr-4 text-xs font-semibold text-slate-800 dark:text-slate-200">{r.categoryLabel}</td>
              <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-400">{r.subCategoryLabel}</td>
              <td className="py-3 pr-4 text-xs tabular-nums font-semibold">{r.leads}</td>
              <td className="py-3 pr-4 text-xs tabular-nums text-green-600 dark:text-green-400">{r.converted}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${r.conversionRate}%` }} />
                  </div>
                  <span className={cn('text-xs font-bold tabular-nums', convColor(r.conversionRate))}>
                    {r.conversionRate}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SourceTable() {
  const data = useMarketingReport()
  const rows = data?.bySource ?? []

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-slate-400">No leads for this period</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Source', 'Leads', 'Converted', 'Conversion Rate'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2.5 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <tr key={r.source} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <td className="py-3 pr-4 text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">{sourceLabel(r.source)}</td>
              <td className="py-3 pr-4 text-xs tabular-nums font-semibold">{r.leads}</td>
              <td className="py-3 pr-4 text-xs tabular-nums text-green-600 dark:text-green-400">{r.converted}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${r.conversionRate}%` }} />
                  </div>
                  <span className={cn('text-xs font-bold tabular-nums', convColor(r.conversionRate))}>
                    {r.conversionRate}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MarketingReport() {
  const { loading, setMarketing, setLoading } = useReportStore()
  const filters   = useReportFilters()
  const data      = useMarketingReport()
  const isLoading = loading['marketing'] === 'loading' || loading['marketing'] === 'idle'
  const error     = useReportStore((s) => s.error['marketing'])

  function runReport() {
    setLoading('marketing', 'loading')
    getMarketingReportAction(filters).then((r) => {
      if (r.ok) { setMarketing(r.data); setLoading('marketing', 'ready') }
      else       setLoading('marketing', 'error', r.error)
    })
  }

  useEffect(() => { runReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const topSource = data?.bySource?.[0]
  const overallConversion = data && data.totalLeads > 0
    ? Math.round((data.bySource.reduce((s, r) => s + r.converted, 0) / data.totalLeads) * 1000) / 10
    : 0

  return (
    <div className="space-y-5">
      <ReportFilters onRefresh={runReport} showExport={false} loading={isLoading} showZone={false} />

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
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Megaphone className="w-3.5 h-3.5" />
                <p className="text-xs">Leads Generated</p>
              </div>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{data.totalLeads}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <p className="text-xs">Overall Conversion</p>
              </div>
              <p className={cn('text-2xl font-bold', convColor(overallConversion))}>{overallConversion}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Target className="w-3.5 h-3.5" />
                <p className="text-xs">Top Source</p>
              </div>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 capitalize">
                {topSource ? sourceLabel(topSource.source) : '—'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Leads by Source</h3>
            <HorizontalBarChart
              data={data.bySource.map((r) => ({ label: sourceLabel(r.source), value: r.leads }))}
            />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Conversion by Source</h3>
            <SourceTable />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">Business Category Classification</h3>
            <p className="text-xs text-slate-400 mb-4">Segment customers and generate category-wise reports</p>
            <BusinessCategoryTable />
          </div>
        </>
      )}
    </div>
  )
}
