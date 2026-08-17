'use client'

import { useState } from 'react'
import {
  Building2,
  Plus,
  Edit2,
  MapPin,
  User,
  Phone,
  Package,
  Boxes,
  X,
  AlertCircle,
} from 'lucide-react'
import { WarehouseType, WAREHOUSE_TYPE_LABELS } from '@/types/enums'
import type { WarehouseRow } from '../actions/warehouse.actions'
import { createWarehouseAction, updateWarehouseAction } from '../actions/warehouse.actions'
import { toast } from 'sonner'

interface WarehouseManagementProps {
  warehouses:      WarehouseRow[]
  warehouseTypes?: Array<{ value: string; label: string }>
  onRefresh:       () => void
}

const DEFAULT_WAREHOUSE_TYPES = Object.values(WarehouseType).map(t => ({
  value: t,
  label: WAREHOUSE_TYPE_LABELS[t],
}))

export default function WarehouseManagement({
  warehouses,
  warehouseTypes = DEFAULT_WAREHOUSE_TYPES,
  onRefresh,
}: WarehouseManagementProps) {
  const typesList = warehouseTypes.length > 0 ? warehouseTypes : DEFAULT_WAREHOUSE_TYPES
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseRow | null>(null)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<string>(typesList[0]?.value || WarehouseType.RegionalHub)
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [state, setState] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setEditingWarehouse(null)
    setCode('')
    setName('')
    setType(WarehouseType.RegionalHub)
    setCity('')
    setDistrict('')
    setState('')
    setContactPhone('')
    setError(null)
    setIsModalOpen(true)
  }

  function openEdit(w: WarehouseRow) {
    setEditingWarehouse(w)
    setCode(w.code)
    setName(w.name)
    setType(w.type as WarehouseType)
    setCity(w.address?.city || '')
    setDistrict(w.address?.district || '')
    setState(w.address?.state || '')
    setContactPhone(w.contactPhone || '')
    setError(null)
    setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        code:         code.trim().toUpperCase(),
        name:         name.trim(),
        type:         type as WarehouseType,
        contactPhone: contactPhone.trim() || undefined,
        address: {
          city:     city.trim() || undefined,
          district: district.trim() || undefined,
          state:    state.trim() || undefined,
        },
      }

      let res
      if (editingWarehouse) {
        res = await updateWarehouseAction(editingWarehouse._id, payload)
      } else {
        res = await createWarehouseAction(payload)
      }

      if (res.ok) {
        toast.success(
          editingWarehouse ? 'Warehouse updated successfully' : 'Warehouse created successfully'
        )
        setIsModalOpen(false)
        onRefresh()
      } else {
        setError(res.error || 'Failed to save warehouse')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Storage Warehouses & Stock Points ({warehouses.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Multi-location inventory storage depots and fulfillment centers
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map(w => (
          <div
            key={w._id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{w.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {w.code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {typesList.find(t => t.value === w.type)?.label || WAREHOUSE_TYPE_LABELS[w.type as WarehouseType] || w.type}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => openEdit(w)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Edit warehouse"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Address & Contact */}
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {(w.address?.city || w.address?.district) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    {[w.address.city, w.address.district, w.address.state]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {w.managerName && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>In-charge: {w.managerName}</span>
                </div>
              )}
              {w.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{w.contactPhone}</span>
                </div>
              )}
            </div>

            {/* Stats Footer */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[11px] text-slate-400">Active SKUs</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {w.totalSkus.toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[11px] text-slate-400">Total Units</div>
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {w.totalQuantity.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WH-CBE-01"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Type *
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {typesList.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coimbatore Regional Depot"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coimbatore"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coimbatore"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tamil Nadu"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingWarehouse ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
