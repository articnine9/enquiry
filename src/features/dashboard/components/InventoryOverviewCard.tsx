'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Boxes, Package, AlertTriangle, Clock, IndianRupee,
  ArrowDownRight, ArrowUpRight, ArrowLeftRight, SlidersHorizontal, ArrowRight,
} from 'lucide-react'
import StatCard from './StatCard'
import {
  getInventoryStatsAction,
  getLowStockAlertsAction,
  getExpiringBatchesAction,
  type InventoryStats,
  type LowStockAlertItem,
  type ExpiringBatchItem,
} from '@/features/inventory/actions/inventory-report.actions'
import { getStockLedgerAction, type StockTransactionRow } from '@/features/inventory/actions/stock.actions'
import { StockTransactionType, STOCK_TRANSACTION_TYPE_LABELS } from '@/types/enums'
import { formatDate } from '@/lib/utils'

const MOVEMENT_ICON: Record<string, React.ReactNode> = {
  [StockTransactionType.InwardPurchase]:    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
  [StockTransactionType.OutwardDispatch]:   <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
  [StockTransactionType.OutwardSample]:     <ArrowUpRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />,
  [StockTransactionType.Transfer]:          <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
  [StockTransactionType.AdjustmentLoss]:    <SlidersHorizontal className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
  [StockTransactionType.AdjustmentSurplus]: <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
}

export default function InventoryOverviewCard() {
  const [stats,   setStats]   = useState<InventoryStats | null>(null)
  const [lowStock, setLowStock] = useState<LowStockAlertItem[]>([])
  const [expiring, setExpiring] = useState<ExpiringBatchItem[]>([])
  const [movements, setMovements] = useState<StockTransactionRow[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    Promise.all([
      getInventoryStatsAction(),
      getLowStockAlertsAction(),
      getExpiringBatchesAction(),
      getStockLedgerAction({ limit: 6 }),
    ]).then(([statsRes, lowRes, expRes, movRes]) => {
      if (statsRes.ok) setStats(statsRes.data)
      if (lowRes.ok)   setLowStock(lowRes.data)
      if (expRes.ok)   setExpiring(expRes.data)
      if (movRes.ok)   setMovements(movRes.data.data)
      setStatus(statsRes.ok ? 'ready' : 'error')
    })
  }, [])

  if (status === 'loading') {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  if (status === 'error' || !stats) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5 text-sm text-red-700 dark:text-red-400">
        Failed to load inventory overview.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Inventory Overview
          </h3>
        </div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Manage inventory <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard size="sm" label="Active SKUs" value={stats.totalSkus}
          icon={Package}       iconColor="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-50 dark:bg-indigo-900/30" />
        <StatCard size="sm" label="Low Stock" value={stats.lowStockCount}
          icon={AlertTriangle} iconColor="text-amber-600 dark:text-amber-400"   iconBg="bg-amber-50 dark:bg-amber-900/30" />
        <StatCard size="sm" label="Near Expiry" value={stats.nearExpiryBatchCount + stats.expiredBatchCount}
          icon={Clock}         iconColor="text-rose-600 dark:text-rose-400"     iconBg="bg-rose-50 dark:bg-rose-900/30" />
        <StatCard size="sm" label="Stock Valuation" value={`₹${(stats.totalStockSalesValue / 100000).toFixed(1)}L`}
          icon={IndianRupee}   iconColor="text-blue-600 dark:text-blue-400"     iconBg="bg-blue-50 dark:bg-blue-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Low stock / expiring alerts */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Stock Alerts
          </h4>

          {lowStock.length === 0 && expiring.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No active alerts — inventory is healthy.</p>
          ) : (
            <div className="space-y-3">
              {lowStock.slice(0, 3).map((item) => (
                <Link
                  key={item.productId}
                  href={`/inventory/products/${item.productId}`}
                  className="flex items-center justify-between gap-2 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.productName}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                    -{item.shortageQuantity} {item.uom}
                  </span>
                </Link>
              ))}
              {expiring.slice(0, 3).map((b) => (
                <Link
                  key={b.batchId}
                  href={`/inventory/products/${b.productId}`}
                  className="flex items-center justify-between gap-2 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {b.productName} <span className="text-slate-400 font-normal">· {b.batchNumber}</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                    {b.isExpired ? 'Expired' : `${b.daysUntilExpiry}d left`}
                  </span>
                </Link>
              ))}
              {(lowStock.length > 3 || expiring.length > 3) && (
                <Link
                  href="/inventory?tab=alerts"
                  className="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline pt-1"
                >
                  View all {lowStock.length + expiring.length} alerts →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Recent stock movements */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Recent Stock Movements
          </h4>

          {movements.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No stock movements recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {movements.map((m) => (
                <div key={m._id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0">
                      {MOVEMENT_ICON[m.type] ?? <Package className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {m.items[0]?.productName ?? 'Product'}
                        {m.items.length > 1 && <span className="text-slate-400"> +{m.items.length - 1}</span>}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {STOCK_TRANSACTION_TYPE_LABELS[m.type as StockTransactionType] ?? m.type}
                        {' · '}{formatDate(m.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                    {m.items.reduce((sum, i) => sum + i.quantity, 0)} units
                  </span>
                </div>
              ))}
              <Link
                href="/inventory?tab=movements"
                className="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline pt-1"
              >
                View full ledger →
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
