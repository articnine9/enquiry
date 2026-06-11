'use client'

import { useState, useEffect, useTransition } from 'react'
import { Search, RotateCcw } from 'lucide-react'
import { getAuditFilterOptionsAction, type AuditFilters } from '../actions/audit.actions'
import { cn } from '@/lib/utils'

interface AuditLogFiltersProps {
  filters:   AuditFilters
  onChange:  (filters: AuditFilters) => void
  onApply:   () => void
  isLoading: boolean
}

interface FilterOptions {
  actions:     string[]
  entityTypes: string[]
  actors:      { _id: string; name: string }[]
}

export default function AuditLogFilters({
  filters,
  onChange,
  onApply,
  isLoading,
}: AuditLogFiltersProps) {
  const [options, setOptions]     = useState<FilterOptions | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getAuditFilterOptionsAction().then((r) => {
      if (r.ok) setOptions(r.data)
    })
  }, [])

  function set(patch: Partial<AuditFilters>) {
    onChange({ ...filters, ...patch, page: 1 })
  }

  function reset() {
    onChange({ page: 1, pageSize: filters.pageSize })
  }

  const hasActiveFilters =
    !!(filters.actorId || filters.entityType || filters.action ||
       filters.dateFrom || filters.dateTo || filters.search)

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
      {/* Row 1: search + date range */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs…"
            value={filters.search ?? ''}
            onChange={(e) => set({ search: e.target.value || undefined })}
            className={cn(
              'w-full pl-9 pr-3 h-9 rounded-lg border text-sm',
              'border-slate-200 dark:border-slate-700',
              'bg-slate-50 dark:bg-slate-800',
              'text-slate-800 dark:text-slate-200 placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
            )}
          />
        </div>

        {/* Date from */}
        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => set({ dateFrom: e.target.value || undefined })}
          className={cn(
            'h-9 px-3 rounded-lg border text-sm',
            'border-slate-200 dark:border-slate-700',
            'bg-slate-50 dark:bg-slate-800',
            'text-slate-800 dark:text-slate-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
          )}
        />

        <span className="self-center text-slate-400 text-sm">to</span>

        {/* Date to */}
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => set({ dateTo: e.target.value || undefined })}
          className={cn(
            'h-9 px-3 rounded-lg border text-sm',
            'border-slate-200 dark:border-slate-700',
            'bg-slate-50 dark:bg-slate-800',
            'text-slate-800 dark:text-slate-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
          )}
        />
      </div>

      {/* Row 2: dropdowns + buttons */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Actor */}
        <select
          value={filters.actorId ?? ''}
          onChange={(e) => set({ actorId: e.target.value || undefined })}
          className={cn(
            'h-9 pl-3 pr-7 rounded-lg border text-sm min-w-[160px]',
            'border-slate-200 dark:border-slate-700',
            'bg-slate-50 dark:bg-slate-800',
            'text-slate-800 dark:text-slate-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
          )}
        >
          <option value="">All actors</option>
          {options?.actors.map((a) => (
            <option key={a._id} value={a._id}>{a.name}</option>
          ))}
        </select>

        {/* Action */}
        <select
          value={filters.action ?? ''}
          onChange={(e) => set({ action: e.target.value || undefined })}
          className={cn(
            'h-9 pl-3 pr-7 rounded-lg border text-sm min-w-[160px]',
            'border-slate-200 dark:border-slate-700',
            'bg-slate-50 dark:bg-slate-800',
            'text-slate-800 dark:text-slate-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
          )}
        >
          <option value="">All actions</option>
          {options?.actions.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>

        {/* Entity type */}
        <select
          value={filters.entityType ?? ''}
          onChange={(e) => set({ entityType: e.target.value || undefined })}
          className={cn(
            'h-9 pl-3 pr-7 rounded-lg border text-sm min-w-[140px]',
            'border-slate-200 dark:border-slate-700',
            'bg-slate-50 dark:bg-slate-800',
            'text-slate-800 dark:text-slate-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
          )}
        >
          <option value="">All entities</option>
          {options?.entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reset */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="h-9 px-3 rounded-lg text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}

        {/* Apply */}
        <button
          type="button"
          onClick={() => startTransition(onApply)}
          disabled={isLoading || isPending}
          className={cn(
            'h-9 px-4 rounded-lg text-sm font-medium transition-colors',
            'bg-indigo-600 hover:bg-indigo-700 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading || isPending ? 'Loading…' : 'Apply filters'}
        </button>
      </div>
    </div>
  )
}
