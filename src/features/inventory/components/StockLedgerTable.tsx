'use client'

import { useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Package,
} from 'lucide-react'
import { StockTransactionType, STOCK_TRANSACTION_TYPE_LABELS } from '@/types/enums'
import type { StockTransactionRow } from '../actions/stock.actions'
import type { WarehouseRow } from '../actions/warehouse.actions'
import { formatDate } from '@/lib/utils'

interface StockLedgerTableProps {
  movements:    StockTransactionRow[]
  warehouses:   WarehouseRow[]
  typeFilter:   string
  setTypeFilter: (v: string) => void
  warehouseId:  string
  setWarehouseId: (v: string) => void
  startDate:    string
  setStartDate: (v: string) => void
  endDate:      string
  setEndDate:   (v: string) => void
  page:         number
  setPage:      (v: number) => void
  totalPages:   number
  total:        number
  isLoading:    boolean
}

function getMovementIcon(type: string) {
  switch (type) {
    case StockTransactionType.InwardPurchase:
      return <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    case StockTransactionType.OutwardDispatch:
      return <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    case StockTransactionType.OutwardSample:
      return <ArrowUpRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
    case StockTransactionType.Transfer:
      return <ArrowLeftRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
    case StockTransactionType.AdjustmentLoss:
      return <SlidersHorizontal className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    case StockTransactionType.AdjustmentSurplus:
      return <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    default:
      return <Package className="w-4 h-4 text-slate-500" />
  }
}

function getMovementBadge(type: string) {
  switch (type) {
    case StockTransactionType.InwardPurchase:
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    case StockTransactionType.OutwardDispatch:
      return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    case StockTransactionType.OutwardSample:
      return 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'
    case StockTransactionType.Transfer:
      return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    case StockTransactionType.AdjustmentLoss:
      return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    case StockTransactionType.AdjustmentSurplus:
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200'
  }
}

export default function StockLedgerTable({
  movements,
  warehouses,
  typeFilter,
  setTypeFilter,
  warehouseId,
  setWarehouseId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  page,
  setPage,
  totalPages,
  total,
  isLoading,
}: StockLedgerTableProps) {
  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Movement Type */}
        <select
          value={typeFilter}
          onChange={e => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Movement Types</option>
          {Object.values(StockTransactionType).map(t => (
            <option key={t} value={t}>
              {STOCK_TRANSACTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        {/* Warehouse Filter */}
        <select
          value={warehouseId}
          onChange={e => {
            setWarehouseId(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Warehouses</option>
          {warehouses.map(w => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
        </select>

        {/* Start Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* End Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={e => {
              setEndDate(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {(typeFilter || warehouseId || startDate || endDate) && (
          <button
            onClick={() => {
              setTypeFilter('')
              setWarehouseId('')
              setStartDate('')
              setEndDate('')
              setPage(1)
            }}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Tx No. & Type</th>
                <th className="px-4 py-3.5">Warehouse(s)</th>
                <th className="px-4 py-3.5">Items & Quantity</th>
                <th className="px-4 py-3.5">Reference / Doc</th>
                <th className="px-4 py-3.5">Operator</th>
                <th className="px-4 py-3.5">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    Loading stock movement ledger...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No stock transactions found.
                  </td>
                </tr>
              ) : (
                movements.map(m => {
                  return (
                    <tr
                      key={m._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Tx No & Type */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                            {getMovementIcon(m.type)}
                          </div>
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {m.transactionNo}
                            </span>
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getMovementBadge(
                                  m.type
                                )}`}
                              >
                                {STOCK_TRANSACTION_TYPE_LABELS[m.type as StockTransactionType] ||
                                  m.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Warehouses */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {m.type === StockTransactionType.Transfer ? (
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-slate-400">From:</span>{' '}
                              <span className="font-medium">{m.sourceWarehouseName}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">To:</span>{' '}
                              <span className="font-medium text-purple-600 dark:text-purple-400">
                                {m.targetWarehouseName}
                              </span>
                            </div>
                          </div>
                        ) : m.targetWarehouseName ? (
                          <div>
                            <span className="text-slate-400">Into:</span>{' '}
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {m.targetWarehouseName}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-400">Out of:</span>{' '}
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {m.sourceWarehouseName}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {m.items.map((it, idx) => (
                            <div key={idx} className="text-xs flex items-center gap-2">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {it.productName || it.productSku || 'Product'}
                              </span>
                              {it.batchNumber && (
                                <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1 rounded">
                                  B:{it.batchNumber}
                                </span>
                              )}
                              <span className="font-bold text-slate-900 dark:text-white">
                                {it.quantity} units
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                        {m.referenceNo ? (
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                            {m.referenceNo}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {m.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {m.notes}
                          </div>
                        )}
                      </td>

                      {/* Operator */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.performerName || 'System User'}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString('en-IN', {
                          day:    '2-digit',
                          month:  'short',
                          year:   'numeric',
                          hour:   '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
            <span>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
