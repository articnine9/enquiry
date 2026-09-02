'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import type { ProductRow } from '../actions/product.actions'
import type { WarehouseRow } from '../actions/warehouse.actions'
import { toggleProductStatusAction } from '../actions/product.actions'
import { toast } from 'sonner'

interface ProductListProps {
  products:     ProductRow[]
  categories:   Array<{ value: string; label: string }> | string[]
  warehouses:   WarehouseRow[]
  canCreateProduct: boolean
  canUpdateProduct: boolean
  onAddProduct: () => void
  onEditProduct: (product: ProductRow) => void
  onRefresh:    () => void
  search:       string
  setSearch:    (v: string) => void
  category:     string
  setCategory:  (v: string) => void
  warehouseId:  string
  setWarehouseId: (v: string) => void
  lowStockOnly: boolean
  setLowStockOnly: (v: boolean) => void
  page:         number
  setPage:      (v: number) => void
  totalPages:   number
  total:        number
  isLoading:    boolean
}

export default function ProductList({
  products,
  categories,
  warehouses,
  canCreateProduct,
  canUpdateProduct,
  onAddProduct,
  onEditProduct,
  onRefresh,
  search,
  setSearch,
  category,
  setCategory,
  warehouseId,
  setWarehouseId,
  lowStockOnly,
  setLowStockOnly,
  page,
  setPage,
  totalPages,
  total,
  isLoading,
}: ProductListProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleToggleStatus(id: string) {
    setTogglingId(id)
    try {
      const res = await toggleProductStatusAction(id)
      if (res.ok) {
        toast.success(`Product status updated to ${res.data.isActive ? 'Active' : 'Inactive'}`)
        onRefresh()
      } else {
        toast.error(res.error || 'Failed to update status')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search by SKU, product name, or category..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={e => {
              setCategory(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c, idx) => {
              const val = typeof c === 'string' ? c : c.value
              const lbl = typeof c === 'string' ? c : c.label
              return (
                <option key={val || idx} value={val}>
                  {lbl}
                </option>
              )
            })}
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

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => {
              setLowStockOnly(!lowStockOnly)
              setPage(1)
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              lowStockOnly
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Only
          </button>
        </div>

        {/* Add Product Button */}
        {canCreateProduct && (
          <button
            onClick={onAddProduct}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Product & SKU</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Selling Price</th>
                <th className="px-4 py-3.5">Stock on Hand</th>
                <th className="px-4 py-3.5">Available</th>
                <th className="px-4 py-3.5">Min Alert</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map(p => {
                  const isLow = p.totalAvailable <= p.minStockLevel
                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Product Name & SKU */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <Link
                              href={`/inventory/products/${p._id}`}
                              className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                            >
                              <span>{p.name}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                {p.sku}
                              </span>
                              {p.requiresBatchTracking && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300">
                                  Batch Tracked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 text-xs">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                          {p.category}
                        </span>
                        {p.subCategory && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{p.subCategory}</div>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ₹{p.sellingPrice.toLocaleString('en-IN')}
                        </span>
                        <div className="text-[11px] text-slate-400">Cost: ₹{p.costPrice}</div>
                      </td>

                      {/* On Hand */}
                      <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {p.totalOnHand.toLocaleString()} {p.uom}
                      </td>

                      {/* Available */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isLow
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {p.totalAvailable.toLocaleString()} {p.uom}
                          </span>
                          {isLow && (
                            <span
                              title={`Below reorder point of ${p.minStockLevel} ${p.uom}`}
                              className="inline-flex items-center p-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Min Level */}
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {p.minStockLevel} {p.uom}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canUpdateProduct && (
                            <>
                              <button
                                onClick={() => onEditProduct(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Edit product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(p._id)}
                                disabled={togglingId === p._id}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  p.isActive
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                }`}
                                title={p.isActive ? 'Deactivate product' : 'Activate product'}
                              >
                                {p.isActive ? (
                                  <XCircle className="w-4 h-4" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
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
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} items
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
