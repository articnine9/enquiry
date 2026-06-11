'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  FileText, CheckCircle2, XCircle, Layers, Clock, TrendingUp,
} from 'lucide-react'
import {
  useReportStore, useReportFilters, useEnquiryReport,
} from '@/store/report.store'
import { getEnquiryReportAction } from '../actions/report.actions'
import { resolveDateRange } from '../utils/date-range'
import ReportFilters from './ReportFilters'
import HorizontalBarChart from './charts/HorizontalBarChart'
import ReportLineChart from './charts/ReportLineChart'
import { exportEnquiryRows } from '../utils/csv-export'
import { cn } from '@/lib/utils'

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, color, bg,
}: {
  label: string; value: string | number
  icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm',
      'flex flex-col gap-3'
    )}>
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

// ── Status colours ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  new:         '#6366f1', assigned:    '#3b82f6',
  in_progress: '#f59e0b', follow_up:   '#8b5cf6',
  resolved:    '#10b981', closed:      '#14b8a6',
  cancelled:   '#ef4444',
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#10b981', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444',
}

const SOURCE_COLOR = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899']

// ── Enquiry table ─────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, string> = {
  low:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
  high:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  urgent: 'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400',
}

function EnquiryTable() {
  const data = useEnquiryReport()
  const rows = data?.recentRows ?? []

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Enquiry', 'Name', 'Status', 'Priority', 'Source', 'Assignee', 'Created', 'Age'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2.5 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr><td colSpan={8} className="py-8 text-center text-sm text-slate-400">No enquiries in this period</td></tr>
          ) : rows.map((r) => (
            <tr key={r._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <td className="py-2.5 pr-4">
                <Link href={`/enquiries/${r._id}`}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  {r.enquiryNo}
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-xs text-slate-700 dark:text-slate-300 max-w-[160px] truncate">{r.name}</td>
              <td className="py-2.5 pr-4">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium capitalize">
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[r.status] ?? '#94a3b8' }} />
                  {r.status.replace('_', ' ')}
                </span>
              </td>
              <td className="py-2.5 pr-4">
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase', PRIORITY_BADGE[r.priority] ?? 'bg-slate-100 text-slate-600')}>
                  {r.priority}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-xs text-slate-500 capitalize">{r.source}</td>
              <td className="py-2.5 pr-4 text-xs text-slate-500">{r.assignee ?? '—'}</td>
              <td className="py-2.5 pr-4 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                {new Date(r.createdAt).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: '2-digit' })}
              </td>
              <td className="py-2.5 text-xs tabular-nums text-slate-400">{r.ageHours}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnquirySummaryReport() {
  const {
    loading, setEnquiry, setLoading,
  } = useReportStore()
  const filters = useReportFilters()
  const data    = useEnquiryReport()
  const isLoading = loading['enquiry'] === 'loading' || loading['enquiry'] === 'idle'
  const error     = useReportStore((s) => s.error['enquiry'])

  function runReport() {
    setLoading('enquiry', 'loading')
    getEnquiryReportAction(filters).then((r) => {
      if (r.ok) { setEnquiry(r.data); setLoading('enquiry', 'ready') }
      else       setLoading('enquiry', 'error', r.error)
    })
  }

  // Auto-run on mount
  useEffect(() => { runReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleExport() {
    if (!data?.recentRows?.length) return
    exportEnquiryRows(data.recentRows)
  }

  return (
    <div className="space-y-5">
      <ReportFilters
        onRefresh={runReport}
        onExport={handleExport}
        showExport={!!data?.recentRows?.length}
        loading={isLoading}
        showZone
      />

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading && !data && <Skeleton />}

      {data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total"         value={data.totals.total}    icon={FileText}     color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-900/30" />
            <KpiCard label="In Range"      value={data.totals.inRange}  icon={Layers}       color="text-blue-600 dark:text-blue-400"    bg="bg-blue-50 dark:bg-blue-900/30" />
            <KpiCard label="Open"          value={data.totals.open}     icon={Layers}       color="text-amber-600 dark:text-amber-400"  bg="bg-amber-50 dark:bg-amber-900/30" />
            <KpiCard label="Resolved"      value={data.totals.resolved} icon={CheckCircle2} color="text-green-600 dark:text-green-400"  bg="bg-green-50 dark:bg-green-900/30" />
            <KpiCard label="Cancelled"     value={data.totals.cancelled}icon={XCircle}      color="text-red-600 dark:text-red-400"      bg="bg-red-50 dark:bg-red-900/30" />
            <KpiCard
              label="Avg Resolution"
              value={data.avgResolutionHours ? `${data.avgResolutionHours}h` : '—'}
              icon={Clock}
              color="text-teal-600 dark:text-teal-400"
              bg="bg-teal-50 dark:bg-teal-900/30"
            />
          </div>

          {/* Trend chart */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Daily Trend
            </h3>
            <ReportLineChart
              data={data.dailyTrend as unknown as Record<string, unknown>[]}
              xKey="date"
              xFormat={(v) => new Date(v).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}
              series={[
                { key: 'created',  label: 'Created',  color: '#6366f1' },
                { key: 'resolved', label: 'Resolved', color: '#10b981' },
                { key: 'closed',   label: 'Closed',   color: '#3b82f6' },
              ]}
              height={140}
            />
          </div>

          {/* Distribution charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">By Status</h4>
              <HorizontalBarChart
                data={data.byStatus.map((s, i) => ({ label: s._id, value: s.count, pct: s.pct, color: STATUS_COLOR[s._id] }))}
              />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">By Priority</h4>
              <HorizontalBarChart
                data={data.byPriority.map((s) => ({ label: s._id, value: s.count, pct: s.pct, color: PRIORITY_COLOR[s._id] }))}
              />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">By Source</h4>
              <HorizontalBarChart
                data={data.bySource.map((s, i) => ({ label: s._id, value: s.count, pct: s.pct, color: SOURCE_COLOR[i % SOURCE_COLOR.length] }))}
              />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">By Category</h4>
              <HorizontalBarChart
                data={data.byCategory.map((s, i) => ({ label: s._id, value: s.count, pct: s.pct }))}
              />
            </div>
          </div>

          {/* Enquiry table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Enquiries ({data.recentRows.length} most recent in range)
            </h3>
            <EnquiryTable />
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
      <div className="h-52 rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}
