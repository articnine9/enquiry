import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronLeft,
  Package,
  Building2,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Layers,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { requirePermission } from '@/lib/auth/session'
import { getProductByIdAction } from '@/features/inventory/actions/product.actions'
import { getStockLedgerAction } from '@/features/inventory/actions/stock.actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { STOCK_TRANSACTION_TYPE_LABELS, type StockTransactionType } from '@/types/enums'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const res = await getProductByIdAction(id)
  return {
    title: res.ok ? `${res.data.name} — Inventory` : 'Product Details',
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  await requirePermission('inventory:read')
  const { id } = await params

  const [productRes, ledgerRes] = await Promise.all([
    getProductByIdAction(id),
    getStockLedgerAction({ productId: id, limit: 15 }),
  ])

  if (!productRes.ok) {
    notFound()
  }

  const p = productRes.data
  const movements = ledgerRes.ok ? ledgerRes.data.data : []
  const isLow = p.totalAvailable <= p.minStockLevel

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Inventory
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{p.name}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    p.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
                {isLow && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Low Stock Alert
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold">
                  SKU: {p.sku}
                </span>
                <span>•</span>
                <span>Category: {p.category}</span>
                {p.subCategory && (
                  <>
                    <span>•</span>
                    <span>Sub: {p.subCategory}</span>
                  </>
                )}
                <span>•</span>
                <span>UOM: {p.uom}</span>
                {p.hsnCode && (
                  <>
                    <span>•</span>
                    <span>HSN: {p.hsnCode}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Key Metrics right side */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Selling Price</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                ₹{p.sellingPrice.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-400">Cost: ₹{p.costPrice}</div>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-medium">Total Available</div>
              <div
                className={`text-lg font-bold ${
                  isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {p.totalAvailable} {p.uom}
              </div>
              <div className="text-[11px] text-slate-400">On Hand: {p.totalOnHand}</div>
            </div>
          </div>
        </div>

        {p.description && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
            {p.description}
          </div>
        )}
      </div>

      {/* Stock by Warehouse */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          Warehouse Distribution & Stock Levels
        </h2>

        {p.stockByWarehouse.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
            No stock has been received into any warehouse yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {p.stockByWarehouse.map(wh => (
              <div
                key={wh.warehouseId}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {wh.warehouseName}
                    </h3>
                    <span className="font-mono text-xs text-slate-400">{wh.warehouseCode}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    {wh.quantityAvailable} {p.uom} Avail
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">Quantity on Hand:</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {wh.quantityOnHand} {p.uom}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Allocated:</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {wh.quantityAllocated} {p.uom}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batches Table (if batch tracking enabled) */}
      {p.requiresBatchTracking && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Active Batches & Expiry Dates ({p.batches.length})
          </h2>

          {p.batches.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
              No active batches with quantity on hand.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Mfg. Date</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {p.batches.map(b => (
                    <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {b.batchNumber}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {b.warehouseName}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {b.quantity} {p.uom}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {b.manufacturingDate
                          ? new Date(b.manufacturingDate).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {b.expiryDate
                          ? new Date(b.expiryDate).toLocaleDateString('en-IN', {
                              day:   '2-digit',
                              month: 'short',
                              year:  'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            b.isExpired
                              ? 'bg-rose-100 text-rose-700'
                              : b.isNearExpiry
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {b.isExpired
                            ? 'EXPIRED'
                            : b.isNearExpiry
                            ? 'Near Expiry (<30d)'
                            : 'Valid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Movement History for this product */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Recent Stock Movements
        </h2>

        {movements.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
            No stock movements recorded yet for this product.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Tx No. & Type</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Quantity Moved</th>
                  <th className="px-4 py-3">Reference / Notes</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {movements.map(m => {
                  const it = m.items.find(i => i.productId === p._id) || m.items[0]
                  return (
                    <tr key={m._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold">{m.transactionNo}</span>
                        <div className="text-[11px] text-slate-400">
                          {STOCK_TRANSACTION_TYPE_LABELS[m.type as StockTransactionType] || m.type}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {m.targetWarehouseName ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Into: {m.targetWarehouseName}
                          </span>
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400">
                            Out of: {m.sourceWarehouseName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {it?.quantity} {p.uom}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {m.referenceNo || m.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(m.createdAt).toLocaleDateString('en-IN', {
                          day:   '2-digit',
                          month: 'short',
                          year:  'numeric',
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
