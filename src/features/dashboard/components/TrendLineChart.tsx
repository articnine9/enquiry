'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { EnquiryTrendPoint } from '../actions/dashboard.actions'

interface TrendLineChartProps {
  data:       EnquiryTrendPoint[]
  className?: string
}

const LINES = [
  { key: 'created'  as const, color: '#6366f1', label: 'Created'  },
  { key: 'resolved' as const, color: '#10b981', label: 'Resolved' },
  { key: 'closed'   as const, color: '#3b82f6', label: 'Closed'   },
]

function buildPath(points: number[], W: number, H: number, max: number): string {
  if (points.length < 2) return ''
  const step = W / (points.length - 1)
  return points
    .map((v, i) => {
      const x = i * step
      const y = H - (max > 0 ? (v / max) * H : 0)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function TrendLineChart({ data, className }: TrendLineChartProps) {
  const [hovIdx, setHovIdx] = useState<number | null>(null)

  const W = 560, H = 100
  const allValues = data.flatMap((d) => [d.created, d.resolved, d.closed])
  const max = Math.max(...allValues, 1)

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        {LINES.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 100 }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHovIdx(null)}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={0} y1={H * (1 - t)} x2={W} y2={H * (1 - t)}
              stroke="currentColor" strokeWidth={0.5}
              className="text-slate-200 dark:text-slate-700"
            />
          ))}

          {/* Lines */}
          {LINES.map((l) => (
            <path
              key={l.key}
              d={buildPath(data.map((d) => d[l.key]), W, H, max)}
              fill="none"
              stroke={l.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Invisible hover columns */}
          {data.map((_, i) => {
            const x = i * W / Math.max(data.length - 1, 1)
            return (
              <rect
                key={i}
                x={x - W / data.length / 2}
                y={0}
                width={W / data.length}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHovIdx(i)}
              />
            )
          })}

          {/* Hover dots */}
          {hovIdx !== null && LINES.map((l) => {
            const d = data[hovIdx]
            if (!d) return null
            const x = hovIdx * W / Math.max(data.length - 1, 1)
            const y = H - (max > 0 ? (d[l.key] / max) * H : 0)
            return (
              <circle key={l.key} cx={x} cy={y} r={4}
                fill={l.color} stroke="white" strokeWidth={1.5} />
            )
          })}
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
            <div className="font-semibold mb-1">{fmtDate(data[hovIdx].date)}</div>
            {LINES.map((l) => (
              <div key={l.key} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-slate-300 capitalize">{l.label}:</span>
                <span className="font-medium">{data[hovIdx][l.key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* X-axis start/end labels */}
      {data.length > 0 && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-400">{fmtDate(data[0].date)}</span>
          <span className="text-[10px] text-slate-400">{fmtDate(data[data.length - 1].date)}</span>
        </div>
      )}
    </div>
  )
}
