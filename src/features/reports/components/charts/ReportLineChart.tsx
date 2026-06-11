'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface LineSeries {
  key:    string
  label:  string
  color:  string
}

interface ReportLineChartProps {
  data:       Record<string, unknown>[]
  xKey:       string
  series:     LineSeries[]
  height?:    number
  xFormat?:   (val: string) => string
  className?: string
}

function buildLinePath(
  values: number[],
  W: number,
  H: number,
  max: number
): string {
  if (values.length < 2) return ''
  const step = W / (values.length - 1)
  return values
    .map((v, i) => {
      const x = i * step
      const y = H - (max > 0 ? (v / max) * H : 0)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function buildAreaPath(values: number[], W: number, H: number, max: number): string {
  if (values.length < 2) return ''
  const line  = buildLinePath(values, W, H, max)
  const lastX = ((values.length - 1) * W / (values.length - 1)).toFixed(1)
  return `${line} L ${lastX},${H} L 0,${H} Z`
}

export default function ReportLineChart({
  data,
  xKey,
  series,
  height    = 140,
  xFormat,
  className,
}: ReportLineChartProps) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)

  const W = 560

  const allValues = data.flatMap((d) =>
    series.map((s) => Number(d[s.key] ?? 0))
  )
  const max = Math.max(...allValues, 1)

  if (!data.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-sm text-slate-400 rounded-lg bg-slate-50 dark:bg-slate-800/40',
          className
        )}
        style={{ height }}
      >
        No data for this period
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="w-full"
          style={{ height }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHovIdx(null)}
        >
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={0} y1={height * (1 - t)} x2={W} y2={height * (1 - t)}
              stroke="currentColor" strokeWidth={0.5}
              className="text-slate-200 dark:text-slate-700"
            />
          ))}

          {/* Area fills (first series only) */}
          {series.slice(0, 1).map((s) => (
            <path
              key={`area-${s.key}`}
              d={buildAreaPath(data.map((d) => Number(d[s.key] ?? 0)), W, height, max)}
              fill={s.color}
              opacity={0.08}
            />
          ))}

          {/* Lines */}
          {series.map((s) => (
            <path
              key={s.key}
              d={buildLinePath(data.map((d) => Number(d[s.key] ?? 0)), W, height, max)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Hover hit areas */}
          {data.map((_, i) => (
            <rect
              key={i}
              x={i * W / Math.max(data.length - 1, 1) - W / data.length / 2}
              y={0}
              width={W / data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHovIdx(i)}
            />
          ))}

          {/* Hover dots */}
          {hovIdx !== null &&
            series.map((s) => {
              const v = Number(data[hovIdx]?.[s.key] ?? 0)
              const x = hovIdx * W / Math.max(data.length - 1, 1)
              const y = height - (max > 0 ? (v / max) * height : 0)
              return (
                <circle key={s.key} cx={x} cy={y} r={4}
                  fill={s.color} stroke="white" strokeWidth={1.5} />
              )
            })
          }
        </svg>

        {/* Tooltip */}
        {hovIdx !== null && data[hovIdx] && (
          <div
            className="absolute bottom-full mb-2 bg-slate-900 dark:bg-slate-700 text-white text-[11px] rounded-lg px-3 py-2 pointer-events-none shadow-lg z-10 whitespace-nowrap"
            style={{
              left:      `${(hovIdx / Math.max(data.length - 1, 1)) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="font-semibold mb-1 text-slate-300">
              {xFormat
                ? xFormat(String(data[hovIdx][xKey]))
                : String(data[hovIdx][xKey])
              }
            </p>
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-300">{s.label}:</span>
                <span className="font-semibold">{Number(data[hovIdx][s.key] ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* X-axis labels */}
      {data.length > 0 && (
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-slate-400">
            {xFormat ? xFormat(String(data[0][xKey])) : String(data[0][xKey])}
          </span>
          <span className="text-[10px] text-slate-400">
            {xFormat
              ? xFormat(String(data[data.length - 1][xKey]))
              : String(data[data.length - 1][xKey])
            }
          </span>
        </div>
      )}
    </div>
  )
}
