'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  slices:     DonutSlice[]
  size?:      number
  thickness?: number
  label?:     string
  sublabel?:  string
  className?: string
}

const PALETTE = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

export default function DonutChart({
  slices,
  size      = 160,
  thickness = 28,
  label,
  sublabel,
  className,
}: DonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const total  = slices.reduce((s, d) => s + d.value, 0)
  const r      = (size - thickness) / 2
  const cx     = size / 2
  const cy     = size / 2
  const circum = 2 * Math.PI * r

  // Build arc paths from cumulative angles
  let cumulative = 0
  const arcs = slices.map((s, i) => {
    const frac   = total > 0 ? s.value / total : 0
    const offset = circum * (1 - cumulative)
    const dash   = circum * frac
    cumulative  += frac
    return { ...s, dash, offset, i, color: s.color ?? PALETTE[i % PALETTE.length] }
  })

  const displayLabel   = hovered !== null ? slices[hovered]?.value.toString()  : (label ?? total.toString())
  const displaySublabel = hovered !== null ? slices[hovered]?.label            : (sublabel ?? 'Total')

  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* SVG donut */}
      <div className="relative flex-shrink-0">
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-slate-100 dark:text-slate-800"
          />
          {arcs.map((arc) => (
            <circle
              key={arc.i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={hovered === arc.i ? thickness + 4 : thickness}
              strokeDasharray={`${arc.dash} ${circum - arc.dash}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
              className="transition-all duration-150 cursor-pointer"
              onMouseEnter={() => setHovered(arc.i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums leading-none">
            {displayLabel}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 max-w-[60px] text-center leading-tight">
            {displaySublabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {arcs.map((arc) => {
          const pct = total > 0 ? Math.round((arc.value / total) * 100) : 0
          return (
            <div
              key={arc.i}
              className="flex items-center gap-2 cursor-default"
              onMouseEnter={() => setHovered(arc.i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: arc.color }}
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{arc.label}</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-auto tabular-nums pl-2">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
