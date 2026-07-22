'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2, Loader2, X, Truck, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Combobox } from '@/components/forms/Combobox'
import { getDistrictOptions } from '@/lib/data/southIndiaDistricts'
import {
  getDistributorsAction, createDistributorAction, updateDistributorAction,
  toggleDistributorActiveAction, deleteDistributorAction,
  type DistributorRow,
} from '../actions/distributor.actions'

// ── Row form dialog ────────────────────────────────────────────────────────────

interface RowFormProps {
  row?:     DistributorRow
  onSave:   () => void
  onCancel: () => void
}

function DistrictMultiPicker({
  selected, onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const options = getDistrictOptions()
  const [picker, setPicker] = useState('')

  function add(value: string) {
    if (!value || selected.includes(value)) return
    onChange([...selected, value])
    setPicker('')
  }
  function remove(value: string) {
    onChange(selected.filter((d) => d !== value))
  }

  return (
    <div className="space-y-2">
      <Combobox
        id="assignedDistricts" name="__districtPicker"
        options={options.filter((o) => !selected.includes(o.value))}
        value={picker}
        onChange={add}
        placeholder="Add a district…"
        searchPlaceholder="Search district…"
        emptyText="No district found"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {d}
              <button type="button" onClick={() => remove(d)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RowForm({ row, onSave, onCancel }: RowFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name:              row?.name              ?? '',
    code:              row?.code              ?? '',
    territory:         row?.territory         ?? '',
    contactName:       row?.contactName       ?? '',
    contactPhone:      row?.contactPhone      ?? '',
    contactEmail:      row?.contactEmail      ?? '',
    address:           row?.address           ?? '',
    assignedDistricts: row?.assignedDistricts ?? [] as string[],
    isActive:          row?.isActive          ?? true,
  })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      name:              form.name,
      code:              form.code.toUpperCase(),
      territory:         form.territory,
      contactName:       form.contactName,
      contactPhone:      form.contactPhone,
      contactEmail:      form.contactEmail || undefined,
      address:           form.address || undefined,
      assignedDistricts: form.assignedDistricts,
      isActive:          form.isActive,
    }

    startTransition(async () => {
      const r = row
        ? await updateDistributorAction(row._id, payload)
        : await createDistributorAction(payload)
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
            {row ? 'Edit distributor' : 'New distributor'}
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
              <label className={LABEL}>Distributor name *</label>
              <input required type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={INPUT} placeholder="South India Fuels Pvt Ltd" />
            </div>
            <div>
              <label className={LABEL}>Code *</label>
              <input required type="text" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className={INPUT} placeholder="CBE-01" maxLength={30} />
            </div>
            <div>
              <label className={LABEL}>Territory *</label>
              <input required type="text" value={form.territory} onChange={(e) => set('territory', e.target.value)} className={INPUT} placeholder="Coimbatore Region" />
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
              <label className={LABEL}>Assigned districts</label>
              <DistrictMultiPicker selected={form.assignedDistricts} onChange={(v) => set('assignedDistricts', v)} />
              <p className="mt-1 text-[11px] text-slate-400">Dealers under this distributor can only service districts assigned here.</p>
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
              {row ? 'Save changes' : 'Create distributor'}
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

export default function DistributorManager() {
  const [rows,      setRows]      = useState<DistributorRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing,   setEditing]   = useState<DistributorRow | null | 'new'>(null)
  const [error,     setError]     = useState<string | null>(null)

  async function reload() {
    setIsLoading(true)
    setError(null)
    const r = await getDistributorsAction()
    if (r.ok) setRows(r.data)
    else setError(r.error)
    setIsLoading(false)
  }

  useEffect(() => { reload() }, [])

  async function handleToggle(id: string, current: boolean) {
    await toggleDistributorActiveAction(id, !current)
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, isActive: !current } : r))
  }

  async function handleDelete(row: DistributorRow) {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return
    const r = await deleteDistributorAction(row._id)
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
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          New distributor
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Distributor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Territory</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Districts</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dealers</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                  No distributors yet. Create your first distributor to get started.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row._id} className={cn('hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors', !row.isActive && 'opacity-60')}>
                <td className="px-4 py-3">
                  <Link href={`/distributors/${row._id}`} className="flex items-center gap-2 group">
                    <Truck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{row.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{row.code}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{row.territory}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{row.assignedDistricts.length} district{row.assignedDistricts.length === 1 ? '' : 's'}</td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{row.dealerCount}</td>
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
                    <Link href={`/distributors/${row._id}`}
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                      title="View dealers">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
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
          row={editing === 'new' ? undefined : editing}
          onSave={() => { setEditing(null); reload() }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
