'use client'

import { useEffect, useState } from 'react'
import { LogIn, Clock, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SessionTrackerProps {
  loginAt:    string   // ISO string of current session start
  className?: string
}

export default function SessionTracker({ loginAt, className }: SessionTrackerProps) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(loginAt).getTime())

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - new Date(loginAt).getTime())
    }, 1000)
    return () => clearInterval(id)
  }, [loginAt])

  return (
    <div className={cn(
      'flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700',
      'bg-white dark:bg-slate-900 shadow-sm px-5 py-4',
      className
    )}>
      {/* Status dot */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Wifi className="w-4.5 h-4.5 text-green-600 dark:text-green-400" />
        </div>
        <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-slate-900" />
      </div>

      {/* Session info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Active Session
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <LogIn className="w-3 h-3" />
            Logged in {fmtTime(loginAt)}
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3 h-3" />
            {fmtDuration(elapsed)}
          </span>
        </div>
      </div>
    </div>
  )
}
