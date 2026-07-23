'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, MapPin, Camera, User } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { getFieldVisitsAction, type FieldVisitRow } from '../actions/fieldVisit.actions'
import VisitTypeBadge from './VisitTypeBadge'
import { VisitType, VISIT_TYPE_LABELS } from '@/types/enums'
import type { PaginatedResult } from '@/types/api'

const EMPTY: PaginatedResult<FieldVisitRow> = {
  data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false,
}

interface FieldVisitListProps {
  distributorId?: string
}

export default function FieldVisitList({ distributorId }: FieldVisitListProps) {
  const [search,    setSearch]    = useState('')
  const [visitType, setVisitType] = useState('')
  const [page,      setPage]      = useState(1)
  const [result,    setResult]    = useState<PaginatedResult<FieldVisitRow>>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback((p: number, s: string, t: string) => {
    setIsLoading(true)
    getFieldVisitsAction({ search: s || undefined, visitType: t || undefined, distributorId, page: p, pageSize: 20 }).then((r) => {
      if (r.ok) setResult(r.data)
      setIsLoading(false)
    })
  }, [distributorId])

  useEffect(() => { load(1, '', '') }, [load])

  function handleSearch(value: string) {
    setSearch(value); setPage(1); load(1, value, visitType)
  }
  function handleTypeChange(value: string) {
    setVisitType(value); setPage(1); load(1, search, value)
  }
  function handlePageChange(p: number) {
    setPage(p); load(p, search, visitType)
  }

  const { data: rows, total, totalPages } = result

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search customer name…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>
        <select
          value={visitType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        >
          <option value="">All visit types</option>
          {Object.values(VisitType).map((v) => (
            <option key={v} value={v}>{VISIT_TYPE_LABELS[v]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dealer / Distributor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Visit Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    {search || visitType ? 'No visits match your filters.' : 'No field visits logged yet.'}
                  </td>
                </tr>
              ) : rows.map((v) => (
                <tr key={v._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/field-visits/${v._id}`} className="flex items-center gap-2 group">
                      <User className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{v.customerName}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><VisitTypeBadge type={v.visitType} /></td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{v.staffName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{v.dealerName ?? v.distributorName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(v.visitDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      {v.gpsLat != null && <MapPin className="w-3.5 h-3.5" />}
                      {v.photoUrl && <Camera className="w-3.5 h-3.5" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <p>{total === 0 ? 'No results' : `${total.toLocaleString()} visits`}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs">{page} / {totalPages || 1}</span>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
