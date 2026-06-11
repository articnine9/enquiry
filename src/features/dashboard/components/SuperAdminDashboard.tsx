'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  FileText, Users, TrendingUp, CheckCircle2,
  MapPin, AlertTriangle, XCircle, Layers,
} from 'lucide-react'
import { useDashboardStore, useSuperAdminDash } from '@/store/dashboard.store'
import { getSuperAdminDashboardAction } from '../actions/dashboard.actions'
import StatCard from './StatCard'
import DonutChart from './DonutChart'
import MiniBarChart from './MiniBarChart'
import TrendLineChart from './TrendLineChart'
import { cn } from '@/lib/utils'

// ── Status colours ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new:         '#6366f1',
  assigned:    '#3b82f6',
  in_progress: '#f59e0b',
  follow_up:   '#8b5cf6',
  resolved:    '#10b981',
  closed:      '#14b8a6',
  cancelled:   '#ef4444',
}

const PRIORITY_COLORS: Record<string, string> = {
  low:    '#10b981',
  medium: '#3b82f6',
  high:   '#f59e0b',
  urgent: '#ef4444',
}

// ── Zone table ────────────────────────────────────────────────────────────────

function ZoneTable() {
  const data = useSuperAdminDash()
  if (!data) return null
  const rows = data.zonePerformance

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            {['Zone', 'Total', 'Open', 'Resolved', 'Closed', 'Urgent', 'Staff', 'Conv. Rate'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2 pr-4 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-6 text-center text-xs text-slate-400">
                No zone data
              </td>
            </tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
              <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">{r.zoneName}</td>
              <td className="py-2.5 pr-4 tabular-nums">{r.total}</td>
              <td className="py-2.5 pr-4 tabular-nums text-amber-600 dark:text-amber-400">{r.open}</td>
              <td className="py-2.5 pr-4 tabular-nums text-green-600 dark:text-green-400">{r.resolved}</td>
              <td className="py-2.5 pr-4 tabular-nums text-teal-600 dark:text-teal-400">{r.closed}</td>
              <td className="py-2.5 pr-4 tabular-nums text-red-600 dark:text-red-400">{r.urgent}</td>
              <td className="py-2.5 pr-4 tabular-nums">{r.staffCount}</td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 max-w-[60px] h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${r.conversionRate}%`,
                        backgroundColor: r.conversionRate >= 60 ? '#10b981' : r.conversionRate >= 30 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-xs tabular-nums font-medium text-slate-700 dark:text-slate-300">
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const {
    superAdminLoading, superAdminError,
    setSuperAdmin, setSuperAdminLoading, trendDays, setTrendDays,
  } = useDashboardStore()
  const data = useSuperAdminDash()

  useEffect(() => {
    setSuperAdminLoading('loading')
    getSuperAdminDashboardAction().then((r) => {
      if (r.ok) { setSuperAdmin(r.data); setSuperAdminLoading('ready') }
      else       setSuperAdminLoading('error', r.error)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (superAdminLoading === 'loading' || superAdminLoading === 'idle') {
    return <LoadingSkeleton />
  }

  if (superAdminLoading === 'error') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5 text-sm text-red-700 dark:text-red-400">
        {superAdminError}
      </div>
    )
  }

  if (!data) return null

  const { enquiry, staff, zonePerformance, trend } = data

  const statusSlices = enquiry.byStatus.map((s) => ({
    label: s._id,
    value: s.count,
    color: STATUS_COLORS[s._id] ?? '#94a3b8',
  }))

  const priorityBars = enquiry.byPriority.map((p) => ({
    label: p._id,
    value: p.count,
    color: PRIORITY_COLORS[p._id] ?? '#94a3b8',
  }))

  const sourceBars = enquiry.bySource.map((s) => ({
    label: s._id,
    value: s.count,
  }))

  // Filter trend to selected window
  const trendData = trend.slice(-trendDays)

  return (
    <div className="space-y-6">

      {/* ── Row 1: KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Enquiries"  value={enquiry.total}
          icon={FileText}     iconColor="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-50 dark:bg-indigo-900/30" />
        <StatCard label="Open"             value={enquiry.open}
          icon={Layers}       iconColor="text-amber-600 dark:text-amber-400"  iconBg="bg-amber-50 dark:bg-amber-900/30" />
        <StatCard label="Resolved"         value={enquiry.resolved}
          icon={CheckCircle2} iconColor="text-green-600 dark:text-green-400"  iconBg="bg-green-50 dark:bg-green-900/30" />
        <StatCard label="This Month"       value={enquiry.thisMonth}
          icon={TrendingUp}   iconColor="text-blue-600 dark:text-blue-400"    iconBg="bg-blue-50 dark:bg-blue-900/30" />
        <StatCard label="Total Staff"      value={staff.total}
          icon={Users}        iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-50 dark:bg-purple-900/30" />
        <StatCard label="Conversion Rate"  value={`${enquiry.conversionRate}%`}
          icon={TrendingUp}   iconColor="text-teal-600 dark:text-teal-400"    iconBg="bg-teal-50 dark:bg-teal-900/30" />
      </div>

      {/* ── Row 2: Status donut + Priority bars + Source bars ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Status distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
            By Status
          </h3>
          <DonutChart
            slices={statusSlices}
            label={String(enquiry.total)}
            sublabel="Total"
            size={140}
            thickness={24}
          />
        </div>

        {/* Priority distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
            By Priority
          </h3>
          <MiniBarChart data={priorityBars} height={100} />
        </div>

        {/* Source distribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
            By Source
          </h3>
          <MiniBarChart data={sourceBars} height={100} barColor="#3b82f6" />
        </div>
      </div>

      {/* ── Row 3: Trend chart ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Enquiry Trend
          </h3>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setTrendDays(d)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  trendDays === d
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {trendData.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-slate-400">
            No trend data
          </div>
        ) : (
          <TrendLineChart data={trendData} />
        )}
      </div>

      {/* ── Row 4: Zone performance table ───────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Zone Performance
            </h3>
          </div>
          <Link
            href="/assignments"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Manage zones →
          </Link>
        </div>
        <ZoneTable />
      </div>

      {/* ── Row 5: Staff by zone ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Staff by Zone
          </h3>
          <span className="text-xs text-slate-400 ml-auto">
            {staff.active} active / {staff.total} total
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {staff.byZone.map((z, i) => (
            <div key={i} className="rounded-lg border border-slate-100 dark:border-slate-800 p-3">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{z.zoneName}</p>
              <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">{z.count}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {z.activeCount} active · load {z.totalLoad}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="h-44 rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="h-56 rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}
