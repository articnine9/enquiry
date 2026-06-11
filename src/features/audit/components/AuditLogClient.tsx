'use client'

import { useState, useCallback } from 'react'
import AuditLogFilters from './AuditLogFilters'
import AuditLogTable from './AuditLogTable'
import { getAuditLogsAction, type AuditFilters, type AuditLogEntry } from '../actions/audit.actions'
import type { PaginatedResult } from '@/types/api'

const EMPTY_RESULT: PaginatedResult<AuditLogEntry> = {
  data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false,
}

export default function AuditLogClient() {
  const [filters,   setFilters]   = useState<AuditFilters>({ page: 1, pageSize: 20 })
  const [result,    setResult]    = useState<PaginatedResult<AuditLogEntry>>(EMPTY_RESULT)
  const [isLoading, setIsLoading] = useState(false)
  const [fetched,   setFetched]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const load = useCallback(async (f: AuditFilters) => {
    setIsLoading(true)
    setError(null)
    const r = await getAuditLogsAction(f)
    if (r.ok) {
      setResult(r.data)
      setFetched(true)
    } else {
      setError(r.error)
    }
    setIsLoading(false)
  }, [])

  function handleApply() {
    load(filters)
  }

  function handlePageChange(page: number) {
    const next = { ...filters, page }
    setFilters(next)
    load(next)
  }

  return (
    <div className="space-y-4">
      <AuditLogFilters
        filters={filters}
        onChange={setFilters}
        onApply={handleApply}
        isLoading={isLoading}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!fetched ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-16 text-center text-slate-400 text-sm">
          Use the filters above and click <strong className="text-slate-600 dark:text-slate-300">Apply filters</strong> to load audit logs.
        </div>
      ) : (
        <AuditLogTable
          result={result}
          filters={filters}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
