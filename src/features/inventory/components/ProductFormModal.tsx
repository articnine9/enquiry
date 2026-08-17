'use client'

import { useState, useMemo } from 'react'
import { X, Package, AlertCircle } from 'lucide-react'
import { ProductUOM, PRODUCT_UOM_LABELS } from '@/types/enums'
import { createProductAction, updateProductAction, type ProductRow } from '../actions/product.actions'
import { toast } from 'sonner'

export interface MasterItemOption {
  value:   string
  label:   string
  weight?: number
}

export interface MasterSubItemOption extends MasterItemOption {
  parentCode: string
}

interface ProductFormModalProps {
  isOpen:        boolean
  onClose:       () => void
  onSuccess:     () => void
  product?:      ProductRow | null
  categories:    MasterItemOption[]
  subCategories: MasterSubItemOption[]
  uoms:          MasterItemOption[]
  taxRates:      MasterItemOption[]
}

const DEFAULT_UOMS: MasterItemOption[] = Object.values(ProductUOM).map(u => ({
  value: u,
  label: PRODUCT_UOM_LABELS[u],
}))

const DEFAULT_TAX_RATES: MasterItemOption[] = [
  { value: '0', label: '0% (Exempt)', weight: 0 },
  { value: '5', label: '5% GST', weight: 5 },
  { value: '12', label: '12% GST', weight: 12 },
  { value: '18', label: '18% GST', weight: 18 },
  { value: '28', label: '28% GST', weight: 28 },
]

export default function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  product,
  categories,
  subCategories,
  uoms,
  taxRates,
}: ProductFormModalProps) {
  const isEdit = Boolean(product)

  const availableUoms = uoms.length > 0 ? uoms : DEFAULT_UOMS
  const availableTaxes = taxRates.length > 0 ? taxRates : DEFAULT_TAX_RATES

  const [sku, setSku] = useState(product?.sku || '')
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [category, setCategory] = useState(
    product?.category || categories[0]?.value || 'poultry_feed'
  )
  const [subCategory, setSubCategory] = useState(product?.subCategory || '')
  const [uom, setUom] = useState<string>(product?.uom || availableUoms[0]?.value || ProductUOM.Units)
  const [hsnCode, setHsnCode] = useState(product?.hsnCode || '')
  const [taxRate, setTaxRate] = useState(product?.taxRate ?? 0)
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? 0)
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice ?? 0)
  const [minStockLevel, setMinStockLevel] = useState(product?.minStockLevel ?? 10)
  const [reorderQuantity, setReorderQuantity] = useState(product?.reorderQuantity ?? 50)
  const [requiresBatchTracking, setRequiresBatchTracking] = useState(
    product?.requiresBatchTracking ?? true
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter sub-categories based on selected parent category
  const filteredSubCategories = useMemo(() => {
    if (!category) return []
    return subCategories.filter(sc => sc.parentCode === category)
  }, [category, subCategories])

  if (!isOpen) return null

  function generateSkuFromName() {
    if (!name) return
    const prefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'PRD'
    const rand = Math.floor(100 + Math.random() * 900)
    setSku(`${prefix}-${rand}`)
  }

  function handleCategoryChange(newCategory: string) {
    setCategory(newCategory)
    // Clear or update sub-category if current selection is invalid under new parent
    const validSubs = subCategories.filter(sc => sc.parentCode === newCategory)
    if (!validSubs.some(s => s.value === subCategory)) {
      setSubCategory(validSubs[0]?.value || '')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        sku:                   sku.trim().toUpperCase(),
        name:                  name.trim(),
        description:          description.trim() || undefined,
        category:              category.trim(),
        subCategory:          subCategory.trim() || undefined,
        uom:                   uom as ProductUOM,
        hsnCode:              hsnCode.trim() || undefined,
        taxRate:               Number(taxRate),
        costPrice:             Number(costPrice),
        sellingPrice:          Number(sellingPrice),
        minStockLevel:         Number(minStockLevel),
        reorderQuantity:       Number(reorderQuantity),
        requiresBatchTracking: Boolean(requiresBatchTracking),
        images:                [],
        isActive:              true,
      }

      let res
      if (isEdit && product) {
        res = await updateProductAction(product._id, payload)
      } else {
        res = await createProductAction(payload)
      }

      if (res.ok) {
        toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully')
        onSuccess()
        onClose()
      } else {
        setError(res.error || 'Operation failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure product catalog, categories, UOM, and pricing from Master Settings
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">
                  SKU / Code *
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={generateSkuFromName}
                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Generate
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. FEED-PLT-001"
                value={sku}
                onChange={e => setSku(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase font-mono"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Broiler Growth Concentrate 25kg"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Category *
              </label>
              {categories.length > 0 ? (
                <select
                  required
                  value={category}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Poultry Feed"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>

            {/* Sub-Category (Cascading) */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Sub-Category
              </label>
              {filteredSubCategories.length > 0 ? (
                <select
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">None / General</option>
                  {filteredSubCategories.map(sc => (
                    <option key={sc.value} value={sc.value}>
                      {sc.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Starter Feed"
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>

            {/* UOM */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Unit of Measure (UOM) *
              </label>
              <select
                value={uom}
                onChange={e => setUom(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {availableUoms.map(u => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Tax */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pricing & Taxes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={e => setCostPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Selling Price / MRP (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Tax / GST Rate
                </label>
                <select
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {availableTaxes.map(t => (
                    <option key={t.value} value={t.weight !== undefined ? t.weight : Number(t.value)}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  HSN Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2309"
                  value={hsnCode}
                  onChange={e => setHsnCode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Stock Thresholds & Batch Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="0"
                value={minStockLevel}
                onChange={e => setMinStockLevel(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Triggers alert when available quantity drops below this.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Default Reorder Quantity
              </label>
              <input
                type="number"
                min="0"
                value={reorderQuantity}
                onChange={e => setReorderQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Batch Tracking Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
            <input
              type="checkbox"
              id="batch-tracking"
              checked={requiresBatchTracking}
              onChange={e => setRequiresBatchTracking(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="batch-tracking" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Enable Batch & Expiry Tracking (Recommended for feeds, medicines, and perishable goods)
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Dosage, packaging details, storage instructions..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <span>{isEdit ? 'Update Product' : 'Create Product'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
