'use client'

import { useState } from 'react'
import { X, ArrowLeftRight, Plus, Trash2, AlertCircle } from 'lucide-react'
import { recordStockTransferAction } from '../actions/stock.actions'
import type { ProductRow } from '../actions/product.actions'
import type { WarehouseRow } from '../actions/warehouse.actions'
import { toast } from 'sonner'

interface StockTransferModalProps {
  isOpen:     boolean
  onClose:    () => void
  onSuccess:  () => void
  products:   ProductRow[]
  warehouses: WarehouseRow[]
}

interface TransferItemRow {
  productId:   string
  batchNumber: string
  quantity:    number
}

export default function StockTransferModal({
  isOpen,
  onClose,
  onSuccess,
  products,
  warehouses,
}: StockTransferModalProps) {
  const [sourceWarehouseId, setSourceWarehouseId] = useState(warehouses[0]?._id || '')
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[1]?._id || warehouses[0]?._id || '')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<TransferItemRow[]>([
    {
      productId:   products[0]?._id || '',
      batchNumber: '',
      quantity:    5,
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

  function handleItemChange(index: number, field: keyof TransferItemRow, value: string | number) {
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

    if (!sourceWarehouseId || !targetWarehouseId) {
      setError('Please select both source and destination warehouses')
      return
    }

    if (sourceWarehouseId === targetWarehouseId) {
      setError('Source and destination warehouses cannot be the same')
      return
    }

    if (items.length === 0 || items.some(i => !i.productId || i.quantity <= 0)) {
      setError('All items must have a valid product and quantity greater than 0')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await recordStockTransferAction({
        sourceWarehouseId,
        targetWarehouseId,
        referenceNo: referenceNo.trim() || undefined,
        notes:       notes.trim() || undefined,
        items:       items.map(i => ({
          productId:   i.productId,
          batchNumber: i.batchNumber.trim() || undefined,
          quantity:    Number(i.quantity),
        })),
      })

      if (res.ok) {
        toast.success(`Transfer ${res.data.transactionNo} completed successfully`)
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'Failed to record stock transfer')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Inter-Warehouse Stock Transfer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Move inventory between central hubs, regional warehouses, and distributor points
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

          {/* Source & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                From Warehouse (Source) *
              </label>
              <select
                required
                value={sourceWarehouseId}
                onChange={e => setSourceWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                To Warehouse (Destination) *
              </label>
              <select
                required
                value={targetWarehouseId}
                onChange={e => setTargetWarehouseId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                {warehouses.map(w => (
                  <option key={w._id} value={w._id} disabled={w._id === sourceWarehouseId}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Transfer Manifest / Reference No.
            </label>
            <input
              type="text"
              placeholder="e.g. TRF-2026-1049"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Transfer Items ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 transition-colors"
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
                      <th className="px-3 py-2.5 min-w-[100px]">Qty to Move *</th>
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
                              className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
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
                              className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none uppercase font-mono"
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
                                className="w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-none"
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Transport / Transfer Notes
            </label>
            <textarea
              rows={2}
              placeholder="Driver name, vehicle registration number, tracking link..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
              className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? <span>Transferring...</span> : <span>Confirm Transfer</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
