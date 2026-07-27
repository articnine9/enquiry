'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getComplaintsAction, type ComplaintRow } from '../actions/complaint.actions'
import ComplaintTypeBadge from './ComplaintTypeBadge'
import ComplaintStatusBadge from './ComplaintStatusBadge'
import { ComplaintType, ComplaintStatus, COMPLAINT_TYPE_LABELS, COMPLAINT_STATUS_LABELS } from '@/types/enums'
import type { PaginatedResult } from '@/types/api'

const EMPTY: PaginatedResult<ComplaintRow> = {
  data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false,
}

export default function ComplaintList() {
  const [search,        setSearch]        = useState('')
  const [complaintType, setComplaintType] = useState('')
  const [status,        setStatus]        = useState('')
  const [page,          setPage]          = useState(1)
  const [result,        setResult]        = useState<PaginatedResult<ComplaintRow>>(EMPTY)
  const [isLoading,     setIsLoading]     = useState(true)

  const load = useCallback((p: number, s: string, t: string, st: string) => {
    setIsLoading(true)
    getComplaintsAction({ search: s || undefined, complaintType: t || undefined, status: st || undefined, page: p, pageSize: 20 }).then((r) => {
      if (r.ok) setResult(r.data)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => { load(1, '', '', '') }, [load])

  function handleSearch(value: string) {
    setSearch(value); setPage(1); load(1, value, complaintType, status)
  }
  function handleTypeChange(value: string) {
    setComplaintType(value); setPage(1); load(1, search, value, status)
  }
  function handleStatusChange(value: string) {
    setStatus(value); setPage(1); load(1, search, complaintType, value)
  }
  function handlePageChange(p: number) {
    setPage(p); load(p, search, complaintType, status)
  }

  const { data: rows, total, totalPages } = result

  return (
    <div className="space-y-4">
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
          value={complaintType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        >
          <option value="">All types</option>
          {Object.values(ComplaintType).map((v) => (
            <option key={v} value={v}>{COMPLAINT_TYPE_LABELS[v]}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        >
          <option value="">All statuses</option>
          {Object.values(ComplaintStatus).map((v) => (
            <option key={v} value={v}>{COMPLAINT_STATUS_LABELS[v]}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dealer / Distributor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Complaint Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    {search || complaintType || status ? 'No complaints match your filters.' : 'No complaints logged yet.'}
                  </td>
                </tr>
              ) : rows.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/complaints/${c._id}`} className="flex items-center gap-2 group">
                      <User className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{c.customerName}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><ComplaintTypeBadge type={c.complaintType} /></td>
                  <td className="px-4 py-3"><ComplaintStatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.dealerName ?? c.distributorName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.complaintDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <p>{total === 0 ? 'No results' : `${total.toLocaleString()} complaints`}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
