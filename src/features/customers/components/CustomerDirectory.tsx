'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, Users2, Repeat } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { getCustomersAction, type CustomerRow } from '../actions/customer.actions'
import type { PaginatedResult } from '@/types/api'

const EMPTY: PaginatedResult<CustomerRow> = {
  data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false,
}

export default function CustomerDirectory() {
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const [result,    setResult]    = useState<PaginatedResult<CustomerRow>>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback((p: number, s: string) => {
    setIsLoading(true)
    getCustomersAction({ search: s || undefined, page: p, pageSize: 20 }).then((r) => {
      if (r.ok) setResult(r.data)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => { load(1, '') }, [load])

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
    load(1, value)
  }

  function handlePageChange(p: number) {
    setPage(p)
    load(p, search)
  }

  const { data: rows, total, totalPages } = result

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search name, phone, email…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Territory</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dealer / Distributor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categories</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Purchases</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Purchase</th>
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
                    {search ? 'No customers match your search.' : 'No customers yet — they appear automatically once a lead converts.'}
                  </td>
                </tr>
              ) : rows.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${c._id}`} className="flex items-center gap-2 group">
                      <Users2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.phone}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                    {c.territory ?? c.district ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.dealerName ?? c.distributorName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.productCategories.slice(0, 2).map((cat) => (
                        <span key={cat} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">{cat}</span>
                      ))}
                      {c.productCategories.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{c.productCategories.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
                      c.totalPurchases > 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                    )}>
                      {c.totalPurchases > 1 && <Repeat className="w-3 h-3" />}
                      {c.totalPurchases}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.lastPurchaseAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <p>{total === 0 ? 'No results' : `${total.toLocaleString()} customers`}</p>
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
