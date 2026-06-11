'use client'

import { useEffect, useTransition } from 'react'
import { Filter, RefreshCw, Download } from 'lucide-react'
import { useReportStore, useReportFilters, useReportFilterOpts } from '@/store/report.store'
import { getReportFilterOptionsAction } from '../actions/report.actions'
import { cn } from '@/lib/utils'
import type { ReportPeriod } from '../types/report.types'

// ── Period options ────────────────────────────────────────────────────────────

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'today',      label: 'Today'       },
  { value: 'yesterday',  label: 'Yesterday'   },
  { value: 'week',       label: 'This Week'   },
  { value: 'last_week',  label: 'Last Week'   },
  { value: 'month',      label: 'This Month'  },
  { value: 'last_month', label: 'Last Month'  },
  { value: 'quarter',    label: 'This Quarter'},
  { value: 'year',       label: 'This Year'   },
  { value: 'custom',     label: 'Custom Range'},
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReportFiltersProps {
  onRefresh:    () => void
  onExport?:    () => void
  showExport?:  boolean
  showZone?:    boolean
  showStaff?:   boolean
  loading?:     boolean
  className?:   string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportFilters({
  onRefresh,
  onExport,
  showExport = true,
  showZone   = true,
  showStaff  = false,
  loading    = false,
  className,
}: ReportFiltersProps) {
  const { setFilters, setFilterOptions, optionsLoaded } = useReportStore()
  const filters = useReportFilters()
  const opts    = useReportFilterOpts()
  const [isPending, startTransition] = useTransition()

  // Load filter options once
  useEffect(() => {
    if (optionsLoaded) return
    getReportFilterOptionsAction().then((r) => {
      if (r.ok) setFilterOptions(r.data)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn(
      'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-4',
      className
    )}>
      <div className="flex flex-wrap items-end gap-3">

        {/* Period selector */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Period
          </label>
          <select
            value={filters.period}
            onChange={(e) => setFilters({ period: e.target.value as ReportPeriod })}
            className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Custom date range */}
        {filters.period === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo}
                onChange={(e) => setFilters({ dateFrom: e.target.value })}
                className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom}
                onChange={(e) => setFilters({ dateTo: e.target.value })}
                className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        {/* Zone filter */}
        {showZone && opts.zones.length > 0 && (
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Zone
            </label>
            <select
              value={filters.zoneId ?? ''}
              onChange={(e) => setFilters({ zoneId: e.target.value || undefined })}
              className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Zones</option>
              {opts.zones.map((z) => (
                <option key={z._id} value={z._id}>{z.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Staff filter */}
        {showStaff && opts.staff.length > 0 && (
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Staff
            </label>
            <select
              value={filters.staffId ?? ''}
              onChange={(e) => setFilters({ staffId: e.target.value || undefined })}
              className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Staff</option>
              {opts.staff.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Spacer + actions */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => startTransition(onRefresh)}
            disabled={loading || isPending}
            className={cn(
              'h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors',
              'bg-indigo-600 hover:bg-indigo-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', (loading || isPending) && 'animate-spin')} />
            Run
          </button>

          {showExport && onExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={loading}
              className={cn(
                'h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors',
                'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
                'hover:bg-slate-50 dark:hover:bg-slate-800',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
