'use client'

import { cn } from '@/lib/utils'
import type { FunnelStage } from '../../types/report.types'

interface FunnelChartProps {
  stages:    FunnelStage[]
  className?: string
}

export default function FunnelChart({ stages, className }: FunnelChartProps) {
  const max = Math.max(...stages.map((s) => s.count), 1)

  if (!stages.length) {
    return (
      <div className={cn('py-10 text-center text-sm text-slate-400', className)}>
        No funnel data
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {stages.map((stage, i) => {
        const widthPct = Math.max((stage.count / max) * 100, 4)

        return (
          <div key={stage.status} className="flex items-center gap-3 group">
            {/* Stage number */}
            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: stage.color }}>
              {i + 1}
            </div>

            {/* Bar + labels */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {stage.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {stage.count.toLocaleString()}
                  </span>
                  {i > 0 && stage.dropOffPct > 0 && (
                    <span className="text-[10px] text-red-500 tabular-nums">
                      ▼ {stage.dropOffPct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-6 w-full rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-6 rounded flex items-center justify-end pr-2 transition-all duration-700"
                  style={{
                    width:           `${widthPct}%`,
                    backgroundColor: stage.color,
                    opacity:         0.85,
                  }}
                >
                  {widthPct > 12 && (
                    <span className="text-[10px] font-semibold text-white tabular-nums">
                      {stage.pct}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
