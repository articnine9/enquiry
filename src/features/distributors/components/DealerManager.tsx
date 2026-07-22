'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2, Loader2, X, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Combobox } from '@/components/forms/Combobox'
import { getCityOptions } from '@/lib/data/southIndiaDistricts'
import {
  getDealersByDistributorAction, createDealerAction, updateDealerAction,
  toggleDealerActiveAction, deleteDealerAction,
  type DealerRow,
} from '../actions/dealer.actions'
import type { IDealerServiceLocation } from '@/lib/db/models/Dealer'

// ── Service-location repeatable rows ───────────────────────────────────────────

function ServiceLocationEditor({
  districtOptions, locations, onChange,
}: {
  districtOptions: { value: string; label: string }[]
  locations: IDealerServiceLocation[]
  onChange: (next: IDealerServiceLocation[]) => void
}) {
  function update(i: number, patch: Partial<IDealerServiceLocation>) {
    onChange(locations.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function remove(i: number) {
    onChange(locations.filter((_, idx) => idx !== i))
  }
  function add() {
    onChange([...locations, { district: districtOptions[0]?.value ?? '', city: '' }])
  }

  const SELECT = cn(
    'h-9 px-2 rounded-lg border text-sm w-full',
    'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
    'text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
  )

  return (
    <div className="space-y-2">
      {locations.length === 0 && (
        <p className="text-xs text-slate-400 italic">No service locations yet — add at least one district.</p>
      )}
      {locations.map((loc, i) => {
        const cityOptions = getCityOptions(loc.district)
        return (
          <div key={i} className="flex items-center gap-2">
            <select value={loc.district} onChange={(e) => update(i, { district: e.target.value, city: '' })} className={SELECT}>
              {districtOptions.length === 0 && <option value="">No districts assigned</option>}
              {districtOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="w-40 shrink-0">
              <Combobox
                id={`service-city-${i}`} name={`serviceCity-${i}`}
                options={cityOptions}
                value={loc.city ?? ''}
                onChange={(v) => update(i, { city: v })}
                placeholder="Any city"
                searchPlaceholder="Search city…"
                emptyText="No city found"
              />
            </div>
            <button type="button" onClick={() => remove(i)} className="w-8 h-8 shrink-0 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={add}
        disabled={districtOptions.length === 0}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40 disabled:no-underline"
      >
        <Plus className="w-3.5 h-3.5" />
        Add service location
      </button>
    </div>
  )
}

// ── Row form dialog ────────────────────────────────────────────────────────────

interface RowFormProps {
  distributorId:      string
  distributorDistricts: { value: string; label: string }[]
  row?:                DealerRow
  onSave:              () => void
  onCancel:            () => void
}

function RowForm({ distributorId, distributorDistricts, row, onSave, onCancel }: RowFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name:             row?.name             ?? '',
    contactName:      row?.contactName      ?? '',
    contactPhone:     row?.contactPhone     ?? '',
    contactEmail:     row?.contactEmail     ?? '',
    address:          row?.address          ?? '',
    serviceLocations: row?.serviceLocations ?? [] as IDealerServiceLocation[],
    isActive:         row?.isActive         ?? true,
  })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      name:             form.name,
      distributorId,
      contactName:      form.contactName,
      contactPhone:     form.contactPhone,
      contactEmail:     form.contactEmail || undefined,
      address:          form.address || undefined,
      serviceLocations: form.serviceLocations,
      isActive:         form.isActive,
    }

    startTransition(async () => {
      const r = row
        ? await updateDealerAction(row._id, payload)
        : await createDealerAction(payload)
      if (!r.ok) { setError(r.error); return }
      onSave()
    })
  }

  const INPUT = cn(
    'w-full h-9 px-3 rounded-lg border text-sm',
    'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
    'text-slate-800 dark:text-slate-200 placeholder:text-slate-400',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
  )
  const LABEL = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
            {row ? 'Edit dealer' : 'New dealer'}
          </h2>
          <button type="button" onClick={onCancel} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Dealer name *</label>
              <input required type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Contact name *</label>
              <input required type="text" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Contact phone *</label>
              <input required type="tel" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} className={INPUT} placeholder="+91 98765 43210" />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Contact email</label>
              <input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Address</label>
              <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Service locations</label>
              <ServiceLocationEditor
                districtOptions={distributorDistricts}
                locations={form.serviceLocations}
                onChange={(v) => set('serviceLocations', v)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Restricted to this distributor&rsquo;s assigned districts. Leave city blank to cover the whole district.</p>
            </div>
            <div className="col-span-2 flex items-center">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={isPending} className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 transition-colors">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {row ? 'Save changes' : 'Create dealer'}
            </button>
            <button type="button" onClick={onCancel} className="h-9 px-4 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface DealerManagerProps {
  distributorId:        string
  distributorDistricts: string[]   // the parent distributor's assignedDistricts
}

export default function DealerManager({ distributorId, distributorDistricts }: DealerManagerProps) {
  const [rows,      setRows]      = useState<DealerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing,   setEditing]   = useState<DealerRow | null | 'new'>(null)
  const [error,     setError]     = useState<string | null>(null)

  const districtOptions = distributorDistricts.map((d) => ({ value: d, label: d }))

  async function reload() {
    setIsLoading(true)
    setError(null)
    const r = await getDealersByDistributorAction(distributorId)
    if (r.ok) setRows(r.data)
    else setError(r.error)
    setIsLoading(false)
  }

  useEffect(() => { reload() }, [distributorId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(id: string, current: boolean) {
    await toggleDealerActiveAction(id, !current)
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, isActive: !current } : r))
  }

  async function handleDelete(row: DealerRow) {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return
    const r = await deleteDealerAction(row._id)
    if (!r.ok) { setError(r.error); return }
    setRows((prev) => prev.filter((x) => x._id !== row._id))
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing('new')}
          disabled={distributorDistricts.length === 0}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          title={distributorDistricts.length === 0 ? 'Assign at least one district to this distributor first' : undefined}
        >
          <Plus className="w-4 h-4" />
          New dealer
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dealer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Service Locations</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                  No dealers yet under this distributor.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row._id} className={cn('hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors', !row.isActive && 'opacity-60')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  <p>{row.contactName}</p>
                  <p className="text-slate-400">{row.contactPhone}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                  {row.serviceLocations.length === 0 ? '—' : row.serviceLocations.map((l) => l.city ? `${l.district} / ${l.city}` : l.district).join(', ')}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium',
                    row.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  )}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button type="button" onClick={() => setEditing(row)} title="Edit"
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => handleToggle(row._id, row.isActive)} title={row.isActive ? 'Deactivate' : 'Activate'}
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors">
                      {row.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => handleDelete(row)} title="Delete"
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <RowForm
          distributorId={distributorId}
          distributorDistricts={districtOptions}
          row={editing === 'new' ? undefined : editing}
          onSave={() => { setEditing(null); reload() }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
