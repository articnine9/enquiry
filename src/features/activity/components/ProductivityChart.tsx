'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useActivityStore } from '@/store/activity.store'
import { getProductivityTrendAction } from '../actions/activity.actions'
import { cn } from '@/lib/utils'

// ── Config ────────────────────────────────────────────────────────────────────

const DAY_OPTIONS = [7, 14, 30] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })
}

function buildSparklinePath(
  points: number[],
  width:  number,
  height: number
): string {
  if (points.length < 2) return ''
  const max  = Math.max(...points, 1)
  const step = width / (points.length - 1)
  const coords = points.map((v, i) => {
    const x = i * step
    const y = height - (v / max) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M ${coords.join(' L ')}`
}

function buildAreaPath(
  points: number[],
  width:  number,
  height: number
): string {
  if (points.length < 2) return ''
  const line = buildSparklinePath(points, width, height)
  const max  = Math.max(...points, 1)
  const lastX = ((points.length - 1) * width / (points.length - 1)).toFixed(1)
  return `${line} L ${lastX},${height} L 0,${height} Z`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ProductivityChartProps {
  staffId?:  string
  className?: string
}

export default function ProductivityChart({ staffId, className }: ProductivityChartProps) {
  const {
    myTrend, trendDays, myLoading,
    setMyTrend, setMyLoading, setTrendDays,
  } = useActivityStore()

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  useEffect(() => {
    setMyLoading('loading')
    getProductivityTrendAction(staffId, trendDays).then((r) => {
      if (r.ok) { setMyTrend(r.data); setMyLoading('ready') }
      else       setMyLoading('error', r.error)
    })
  }, [staffId, trendDays]) // eslint-disable-line react-hooks/exhaustive-deps

  const scores      = myTrend.map((p) => p.productivityScore)
  const avg         = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0
  const lastScore   = scores.at(-1)  ?? 0
  const prevScore   = scores.at(-2)  ?? 0
  const trend       = lastScore - prevScore
  const maxScore    = Math.max(...scores, 1)

  const W = 600, H = 120

  if (myLoading === 'loading') {
    return (
      <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 animate-pulse', className)}>
        <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700 mb-4" />
        <div className="h-28 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Productivity Score
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {hoveredIdx !== null ? scores[hoveredIdx] : lastScore}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
            <TrendIndicator trend={trend} />
          </div>
        </div>

        {/* Day filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setTrendDays(d)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                trendDays === d
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <div className="px-5 pt-4 pb-2">
        {scores.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-sm text-slate-400">
            No data for this period
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-28"
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((tick) => {
                const y = H - (tick / maxScore) * H
                return (
                  <line
                    key={tick}
                    x1={0} y1={y} x2={W} y2={y}
                    stroke="currentColor"
                    strokeWidth={0.5}
                    className="text-slate-200 dark:text-slate-700"
                  />
                )
              })}

              {/* Area fill */}
              <path
                d={buildAreaPath(scores, W, H)}
                fill="url(#areaGrad)"
                opacity={0.3}
              />

              {/* Line */}
              <path
                d={buildSparklinePath(scores, W, H)}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hover hit areas */}
              {scores.map((v, i) => {
                const x = i * W / (scores.length - 1)
                const y = H - (v / maxScore) * H
                const isHov = hoveredIdx === i
                return (
                  <g key={i}>
                    {/* Wide invisible hit target */}
                    <rect
                      x={x - W / scores.length / 2}
                      y={0}
                      width={W / scores.length}
                      height={H}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIdx(i)}
                    />
                    {/* Dot */}
                    {isHov && (
                      <circle
                        cx={x} cy={y} r={5}
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth={2}
                      />
                    )}
                  </g>
                )
              })}

              {/* Gradients */}
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}   />
                </linearGradient>
              </defs>
            </svg>

            {/* Tooltip */}
            {hoveredIdx !== null && (
              <div
                className="absolute -top-2 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 pointer-events-none shadow-lg"
                style={{
                  left: `${(hoveredIdx / (scores.length - 1)) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="font-bold">{scores[hoveredIdx]}</div>
                <div className="text-slate-300 text-[10px]">
                  {formatShortDate(myTrend[hoveredIdx].date)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: date labels + avg */}
      {scores.length > 0 && (
        <div className="flex items-center justify-between px-5 pb-4 pt-1">
          <span className="text-xs text-slate-400">
            {formatShortDate(myTrend[0]?.date ?? '')}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Avg <span className="font-semibold text-slate-700 dark:text-slate-200">{avg}</span>
          </span>
          <span className="text-xs text-slate-400">
            {formatShortDate(myTrend.at(-1)?.date ?? '')}
          </span>
        </div>
      )}
    </div>
  )
}

// ── TrendIndicator ────────────────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
      <TrendingUp className="w-3.5 h-3.5" />+{trend}
    </span>
  )
  if (trend < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500 dark:text-red-400">
      <TrendingDown className="w-3.5 h-3.5" />{trend}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-400">
      <Minus className="w-3.5 h-3.5" />0
    </span>
  )
}
