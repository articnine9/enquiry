'use client'

import { cn } from '@/lib/utils'

interface HBarDatum {
  label:  string
  value:  number
  color?: string
  pct?:   number
}

interface HorizontalBarChartProps {
  data:       HBarDatum[]
  showPct?:   boolean
  barColor?:  string
  className?: string
  maxBars?:   number
}

const DEFAULT_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

export default function HorizontalBarChart({
  data,
  showPct   = true,
  barColor,
  className,
  maxBars   = 10,
}: HorizontalBarChartProps) {
  const visible = data.slice(0, maxBars)
  const max     = Math.max(...visible.map((d) => d.value), 1)

  if (!visible.length) {
    return (
      <div className={cn('py-6 text-center text-sm text-slate-400', className)}>
        No data available
      </div>
    )
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {visible.map((d, i) => {
        const pct   = showPct && d.pct !== undefined ? d.pct : Math.round((d.value / max) * 100)
        const width = Math.round((d.value / max) * 100)
        const color = d.color ?? barColor ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]

        return (
          <div key={i} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-700 dark:text-slate-300 capitalize truncate max-w-[60%]">
                {d.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                  {d.value.toLocaleString()}
                </span>
                {showPct && (
                  <span className="text-[10px] text-slate-400 tabular-nums w-9 text-right">
                    {d.pct ?? pct}%
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
