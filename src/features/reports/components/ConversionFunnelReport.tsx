'use client'

import { useEffect } from 'react'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { useReportStore, useReportFilters, useConversionReport } from '@/store/report.store'
import { getConversionFunnelAction } from '../actions/report.actions'
import ReportFilters from './ReportFilters'
import FunnelChart from './charts/FunnelChart'
import { cn } from '@/lib/utils'

// ── Conversion summary ring ───────────────────────────────────────────────────

function ConversionRing({ rate }: { rate: number }) {
  const clamped = Math.min(Math.max(rate, 0), 100)
  const r       = 52
  const circum  = 2 * Math.PI * r
  const dash    = (clamped / 100) * circum
  const color   = clamped >= 60 ? '#10b981' : clamped >= 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative flex items-center justify-center">
        <svg width={140} height={140} className="rotate-[-90deg]">
          <circle cx={70} cy={70} r={r} fill="none" stroke="currentColor"
            strokeWidth={12} className="text-slate-100 dark:text-slate-800" />
          <circle cx={70} cy={70} r={r} fill="none"
            stroke={color} strokeWidth={12}
            strokeDasharray={`${dash} ${circum - dash}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color }}>
            {clamped}%
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">Conversion</span>
        </div>
      </div>
    </div>
  )
}

// ── Stage summary cards ───────────────────────────────────────────────────────

function StageSummaryCard({
  label, count, pct, color,
}: {
  label: string; count: number; pct: number; color: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm text-center">
      <div className="w-2 h-2 rounded-full mx-auto mb-2" style={{ backgroundColor: color }} />
      <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{count}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      <p className="text-[11px] font-semibold tabular-nums mt-0.5" style={{ color }}>{pct}%</p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConversionFunnelReport() {
  const { loading, setConversion, setLoading } = useReportStore()
  const filters   = useReportFilters()
  const data      = useConversionReport()
  const isLoading = loading['conversion'] === 'loading' || loading['conversion'] === 'idle'
  const error     = useReportStore((s) => s.error['conversion'])

  function runReport() {
    setLoading('conversion', 'loading')
    getConversionFunnelAction(filters).then((r) => {
      if (r.ok) { setConversion(r.data); setLoading('conversion', 'ready') }
      else       setLoading('conversion', 'error', r.error)
    })
  }

  useEffect(() => { runReport() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <ReportFilters
        onRefresh={runReport}
        showExport={false}
        loading={isLoading}
        showZone
      />

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading && !data && (
        <div className="space-y-4 animate-pulse">
          <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-72 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      )}

      {data && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Conversion ring */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-6 flex flex-col items-center justify-center gap-4">
              <ConversionRing rate={data.conversionRate} />
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {data.converted}
                  </span>
                  <span>of</span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {data.totalEnquiries}
                  </span>
                  <span>converted</span>
                </div>
              </div>
            </div>

            {/* Drop-off summary */}
            <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Stage Drop-off Summary
              </h3>
              {data.stages.length > 0 ? (
                <div className="space-y-3">
                  {data.stages.slice(0, -1).map((stage, i) => {
                    const next = data.stages[i + 1]
                    if (!next) return null
                    return (
                      <div key={stage.status} className="flex items-center gap-3">
                        <div
                          className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400 w-24 truncate">
                          {stage.label}
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                            {stage.count}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                          <span className="text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                            {next.count}
                          </span>
                        </div>
                        {next.dropOffPct > 0 ? (
                          <span className="text-[11px] font-semibold text-red-500 tabular-nums">
                            -{next.dropOffPct}% drop
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">No drop</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">
                  No funnel data for this period
                </p>
              )}
            </div>
          </div>

          {/* Stage cards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {data.stages.map((s) => (
              <StageSummaryCard
                key={s.status}
                label={s.label}
                count={s.count}
                pct={s.pct}
                color={s.color}
              />
            ))}
          </div>

          {/* Funnel chart */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Conversion Funnel
              </h3>
              <span className="ml-auto text-xs text-slate-400 tabular-nums">
                {data.totalEnquiries} total enquiries
              </span>
            </div>
            <FunnelChart stages={data.stages} />
          </div>
        </>
      )}
    </div>
  )
}
