'use client'

import { useState } from 'react'
import { X, SlidersHorizontal, Plus, Trash2, AlertCircle } from 'lucide-react'
import { StockTransactionType } from '@/types/enums'
import { recordStockAdjustmentAction } from '../actions/stock.actions'
import type { ProductRow } from '../actions/product.actions'
import type { WarehouseRow } from '../actions/warehouse.actions'
import { toast } from 'sonner'

interface StockAdjustmentModalProps {
  isOpen:             boolean
  onClose:            () => void
  onSuccess:          () => void
  products:           ProductRow[]
  warehouses:         WarehouseRow[]
  adjustmentReasons?: Array<{ value: string; label: string }>
}

interface AdjustmentItemRow {
  productId:   string
  batchNumber: string
  quantity:    number
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
  products,
  warehouses,
  adjustmentReasons = [],
}: StockAdjustmentModalProps) {
  const [type, setType] = useState<StockTransactionType>(StockTransactionType.AdjustmentLoss)
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?._id || '')
  const [referenceNo, setReferenceNo] = useState('')
  const [selectedPresetReason, setSelectedPresetReason] = useState('')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<AdjustmentItemRow[]>([
    {
      productId:   products[0]?._id || '',
      batchNumber: '',
      quantity:    1,
    },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function handleAddItem() {
    setItems([
      ...items,
      {
        productId:   products[0]?._id || '',
        batchNumber: '',
        quantity:    1,
      },
    ])
  }

  function handleRemoveItem(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function handleItemChange(index: number, field: keyof AdjustmentItemRow, value: string | number) {
    setItems(prevItems => {
      const updated = [...prevItems]
      updated[index] = {
        ...updated[index],
        [field]: value,
      }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!warehouseId) {
      setError('Please select a warehouse')
      return
    }

    if (!reason.trim()) {
      setError('Please specify the audit / adjustment justification reason')
      return
    }

    if (items.length === 0 || items.some(i => !i.productId || i.quantity <= 0)) {
      setError('All items must have a valid product and quantity greater than 0')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await recordStockAdjustmentAction({
        type:        type as StockTransactionType.AdjustmentLoss | StockTransactionType.AdjustmentSurplus,
        warehouseId,
        referenceNo: referenceNo.trim() || undefined,
        reason:      reason.trim(),
        items:       items.map(i => ({
          productId:   i.productId,
          batchNumber: i.batchNumber.trim() || undefined,
          quantity:    Number(i.quantity),
        })),
      })

      if (res.ok) {
        toast.success(`Stock adjustment ${res.data.transactionNo} recorded successfully`)
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'Failed to record stock adjustment')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoss = type === StockTransactionType.AdjustmentLoss

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isLoss
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Stock Reconciliation / Adjustment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adjust stock levels for physical count differences, expired/damaged write-offs, or surplus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type & Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Adjustment Type *
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as StockTransactionType)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value={StockTransactionType.AdjustmentLoss}>
                  Stock Reduction (Damage / Loss / Expired)
                </option>
                <option value={StockTransactionType.AdjustmentSurplus}>
                  Stock Surplus (Found in Audit Count)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Warehouse *
              </label>
              <select
                required
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Audit Reference No.
              </label>
              <input
                type="text"
                placeholder="e.g. AUDIT-Q1-2026"
                value={referenceNo}
                onChange={e => setReferenceNo(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Adjusted Items ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2.5 min-w-[240px]">Product *</th>
                      <th className="px-3 py-2.5 min-w-[140px]">Batch No.</th>
                      <th className="px-3 py-2.5 min-w-[120px]">
                        {isLoss ? 'Qty to Deduct (-)' : 'Qty to Add (+)'} *
                      </th>
                      <th className="px-2 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item, idx) => {
                      const prod = products.find(p => p._id === item.productId)
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2">
                            <select
                              required
                              value={item.productId}
                              onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            >
                              {products.map(p => (
                                <option key={p._id} value={p._id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              placeholder="e.g. B-0129"
                              value={item.batchNumber}
                              onChange={e => handleItemChange(idx, 'batchNumber', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none uppercase font-mono"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                required
                                min="1"
                                value={item.quantity}
                                onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                className={`w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-1 focus:ring-amber-500 focus:outline-none ${
                                  isLoss ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              />
                              <span className="text-[11px] text-slate-400">{prod?.uom}</span>
                            </div>
                          </td>

                          <td className="px-2 py-2 text-center">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                Adjustment Reason / Justification *
              </label>
              {adjustmentReasons.length > 0 && (
                <span className="text-[11px] text-slate-400">Master Setting presets available</span>
              )}
            </div>

            {adjustmentReasons.length > 0 && (
              <select
                value={selectedPresetReason}
                onChange={e => {
                  const selectedVal = e.target.value
                  setSelectedPresetReason(selectedVal)
                  const match = adjustmentReasons.find(r => r.value === selectedVal)
                  if (match) {
                    setReason(prev => (prev ? `${match.label} - ${prev}` : match.label))
                  }
                }}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Select standard reason preset (optional) --</option>
                {adjustmentReasons.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}

            <textarea
              required
              rows={2}
              placeholder="e.g. Expired batch discarded, packaging damage in transit, or physical count reconciliation difference..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? <span>Applying...</span> : <span>Apply Adjustment</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
