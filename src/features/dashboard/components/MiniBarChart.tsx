'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface BarDatum {
  label: string
  value: number
  color?: string
}

interface MiniBarChartProps {
  data:       BarDatum[]
  height?:    number
  barColor?:  string
  className?: string
  formatLabel?: (v: number) => string
}

export default function MiniBarChart({
  data,
  height     = 80,
  barColor   = '#6366f1',
  className,
  formatLabel,
}: MiniBarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const pct  = (d.value / max) * 100
          const isHov = hovered === i
          const color = d.color ?? barColor
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-0.5 group cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHov && (
                <div className="absolute -translate-y-8 bg-slate-900 dark:bg-slate-700 text-white text-[10px] rounded px-1.5 py-0.5 pointer-events-none z-10 whitespace-nowrap">
                  {formatLabel ? formatLabel(d.value) : d.value}
                </div>
              )}
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height:          `${pct}%`,
                  minHeight:       d.value > 0 ? 3 : 0,
                  backgroundColor: color,
                  opacity:         isHov ? 1 : 0.75,
                }}
              />
            </div>
          )
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 text-center text-[9px] truncate',
              hovered === i ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
            )}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}
