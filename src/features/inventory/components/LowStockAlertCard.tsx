'use client'

import Link from 'next/link'
import { AlertTriangle, Clock, Package, ArrowDownRight, ExternalLink } from 'lucide-react'
import type { LowStockAlertItem, ExpiringBatchItem } from '../actions/inventory-report.actions'

interface LowStockAlertCardProps {
  lowStockItems:   LowStockAlertItem[]
  expiringBatches: ExpiringBatchItem[]
  onRestock:       () => void
}

export default function LowStockAlertCard({
  lowStockItems,
  expiringBatches,
  onRestock,
}: LowStockAlertCardProps) {
  return (
    <div className="space-y-6">
      {/* Low Stock Alerts Section */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Low Stock Threshold Alerts ({lowStockItems.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Products currently at or below their designated reorder level
              </p>
            </div>
          </div>
          <button
            onClick={onRestock}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-colors"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Restock Goods
          </button>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-amber-100 dark:border-amber-900/30">
            All active products have healthy stock levels above minimum thresholds.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map(item => (
              <div
                key={item.productId}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-amber-200/80 dark:border-amber-900/40 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/inventory/products/${item.productId}`}
                      className="font-bold text-slate-900 dark:text-white text-sm hover:text-indigo-600 inline-flex items-center gap-1"
                    >
                      <span>{item.productName}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{item.sku}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    Deficit: -{item.shortageQuantity} {item.uom}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Available</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400">
                      {item.totalAvailable}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Min Alert</div>
                    <div className="font-medium text-slate-600 dark:text-slate-300">
                      {item.minStockLevel}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Reorder Batch</div>
                    <div className="font-medium text-slate-600 dark:text-slate-300">
                      {item.reorderQuantity}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expiring Batches Section */}
      <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Expiring & Expired Batches ({expiringBatches.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Batches nearing expiration (within 60 days) or already expired
            </p>
          </div>
        </div>

        {expiringBatches.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-rose-100 dark:border-rose-900/30">
            No active batches approaching expiration.
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Product & Batch</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Remaining Qty</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">Time Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expiringBatches.map(b => (
                    <tr key={b.batchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {b.productName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs text-slate-400">{b.sku}</span>
                          <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                            Batch: {b.batchNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {b.warehouseName}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {b.quantity.toLocaleString()} units
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {new Date(b.expiryDate).toLocaleDateString('en-IN', {
                          day:   '2-digit',
                          month: 'short',
                          year:  'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            b.isExpired
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : b.daysUntilExpiry <= 30
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-400'
                          }`}
                        >
                          {b.isExpired ? 'EXPIRED' : `${b.daysUntilExpiry} days left`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
