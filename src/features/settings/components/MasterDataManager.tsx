'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2, Loader2, X, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Combobox } from '@/components/forms/Combobox'
import {
  MASTER_DATA_TYPES,
  MASTER_DATA_TYPE_LABELS,
  MASTER_DATA_PARENT_TYPE,
  type MasterDataType,
} from '../masterData.constants'
import {
  getMasterDataAction,
  createMasterDataAction,
  updateMasterDataAction,
  toggleMasterDataActiveAction,
  deleteMasterDataAction,
  type MasterDataRow,
} from '../actions/masterData.actions'

const COLOR_TOKENS = ['slate', 'blue', 'amber', 'red', 'green', 'orange'] as const

// ── Row editor dialog ──────────────────────────────────────────────────────────

interface RowFormProps {
  type:     MasterDataType
  row?:     MasterDataRow
  onSave:   () => void
  onCancel: () => void
}

function RowForm({ type, row, onSave, onCancel }: RowFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isPriority = type === 'enquiry_priority'
  const isTaxRate  = type === 'inventory_tax_rate'
  const parentType = MASTER_DATA_PARENT_TYPE[type]
  const [form, setForm] = useState({
    code:       row?.code       ?? '',
    label:      row?.label      ?? '',
    color:      row?.color      ?? 'slate',
    weight:     row?.weight?.toString() ?? '',
    parentCode: row?.parentCode ?? '',
    sortOrder:  row?.sortOrder?.toString() ?? '0',
    isActive:   row?.isActive   ?? true,
  })

  const [parentOptions, setParentOptions] = useState<MasterDataRow[]>([])
  useEffect(() => {
    if (!parentType) return
    getMasterDataAction(parentType).then((r) => { if (r.ok) setParentOptions(r.data.filter((p) => p.isActive)) })
  }, [parentType])

  function set(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      type,
      code:      form.code.trim().toLowerCase(),
      label:     form.label.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive:  form.isActive,
      ...(isPriority ? { color: form.color, weight: Number(form.weight) || 0 } : {}),
      ...(isTaxRate ? { weight: Number(form.weight) || 0 } : {}),
      ...(parentType ? { parentCode: form.parentCode } : {}),
    }

    startTransition(async () => {
      const r = row
        ? await updateMasterDataAction(row._id, payload)
        : await createMasterDataAction(payload)
      if (!r.ok) { setError(r.error); return }
      onSave()
    })
  }

  const INPUT = cn(
    'w-full h-9 px-3 rounded-lg border text-sm',
    'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
    'text-slate-800 dark:text-slate-200 placeholder:text-slate-400',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60'
  )
  const LABEL = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
            {row ? 'Edit option' : 'New option'} · {MASTER_DATA_TYPE_LABELS[type]}
          </h2>
          <button type="button" onClick={onCancel} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className={LABEL}>Internal code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                disabled={Boolean(row?.isSystem)}
                className={cn(INPUT, 'font-mono text-xs')}
                placeholder="e.g. cold_storage, poultry_feed"
                required
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Unique key used in database records (lowercase letters, digits, underscores).</p>
            </div>

            <div>
              <label className={LABEL}>Display label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                className={INPUT}
                placeholder="e.g. Cold Storage Facility"
                required
              />
            </div>

            {parentType && (
              <div>
                <label className={LABEL}>Parent category ({MASTER_DATA_TYPE_LABELS[parentType]})</label>
                <Combobox
                  id="parentCode"
                  name="parentCode"
                  options={parentOptions.map((p) => ({ value: p.code, label: p.label }))}
                  value={form.parentCode}
                  onChange={(v) => set('parentCode', v)}
                  placeholder={`Select ${MASTER_DATA_TYPE_LABELS[parentType].toLowerCase()}…`}
                  searchPlaceholder="Search…"
                  emptyText="No options found"
                />
              </div>
            )}

            {isPriority && (
              <>
                <div>
                  <label className={LABEL}>Colour</label>
                  <select value={form.color} onChange={(e) => set('color', e.target.value)} className={INPUT}>
                    {COLOR_TOKENS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Weight (sort rank)</label>
                  <input type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} className={INPUT} placeholder="1–4" />
                </div>
              </>
            )}

            {isTaxRate && (
              <div>
                <label className={LABEL}>Tax Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.weight}
                  onChange={(e) => set('weight', e.target.value)}
                  className={INPUT}
                  placeholder="e.g. 18"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Numeric tax rate applied on invoice calculations.</p>
              </div>
            )}

            <div>
              <label className={LABEL}>Display order</label>
              <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className={INPUT} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={isPending} className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 transition-colors">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {row ? 'Save changes' : 'Create option'}
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

export default function MasterDataManager() {
  const [activeType, setActiveType] = useState<MasterDataType>(MASTER_DATA_TYPES[0])
  const [rows,      setRows]        = useState<MasterDataRow[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [editing,   setEditing]     = useState<MasterDataRow | null | 'new'>(null)
  const [error,     setError]       = useState<string | null>(null)

  const [parentLabels, setParentLabels] = useState<Record<string, string>>({})
  const [parentRows,   setParentRows]   = useState<MasterDataRow[]>([])
  const [filterParentCode, setFilterParentCode] = useState('')

  const parentType = MASTER_DATA_PARENT_TYPE[activeType]

  async function reload() {
    setIsLoading(true)
    setError(null)
    const r = await getMasterDataAction(activeType)
    if (r.ok) setRows(r.data)
    else setError(r.error)
    setIsLoading(false)
  }

  useEffect(() => { setFilterParentCode(''); reload() }, [activeType]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!parentType) { setParentLabels({}); setParentRows([]); return }
    getMasterDataAction(parentType).then((r) => {
      if (r.ok) {
        setParentLabels(Object.fromEntries(r.data.map((p) => [p.code, p.label])))
        setParentRows(r.data)
      }
    })
  }, [parentType])

  const visibleRows = filterParentCode ? rows.filter((r) => r.parentCode === filterParentCode) : rows

  async function handleToggle(id: string, current: boolean) {
    await toggleMasterDataActiveAction(id, !current)
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, isActive: !current } : r))
  }

  async function handleDelete(row: MasterDataRow) {
    if (!confirm(`Delete “${row.label}”? This cannot be undone.`)) return
    const r = await deleteMasterDataAction(row._id)
    if (!r.ok) { setError(r.error); return }
    setRows((prev) => prev.filter((x) => x._id !== row._id))
  }

  const isPriority = activeType === 'enquiry_priority'
  const isTaxRate  = activeType === 'inventory_tax_rate'
  const colCount   = 5 + (isPriority || isTaxRate || parentType ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {MASTER_DATA_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveType(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeType === t
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            {MASTER_DATA_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {parentType && parentRows.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter by {MASTER_DATA_TYPE_LABELS[parentType]}:</span>
              <select
                value={filterParentCode}
                onChange={(e) => setFilterParentCode(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">All ({parentRows.length})</option>
                {parentRows.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
            </div>
          )}
          <span className="text-xs text-slate-400">
            {visibleRows.length} {visibleRows.length === 1 ? 'option' : 'options'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setEditing('new')}
          className="h-8 px-3.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add option
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Code</th>
              {isPriority && <th className="px-4 py-3">Colour / Weight</th>}
              {isTaxRate && <th className="px-4 py-3">Tax Rate (%)</th>}
              {parentType && <th className="px-4 py-3">{MASTER_DATA_TYPE_LABELS[parentType]}</th>}
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: colCount }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-12 text-center text-slate-400 text-sm">
                  {filterParentCode ? 'No options under this filter.' : 'No options yet. Add your first option.'}
                </td>
              </tr>
            ) : visibleRows.map((row) => (
              <tr key={row._id} className={cn('hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors', !row.isActive && 'opacity-60')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.label}</span>
                    {row.isSystem && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">system</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{row.code}</span>
                </td>
                {isPriority && (
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {row.color ?? '—'}{row.weight != null ? ` · ${row.weight}` : ''}
                  </td>
                )}
                {isTaxRate && (
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {row.weight != null ? `${row.weight}%` : '—'}
                  </td>
                )}
                {parentType && (
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {row.parentCode ? (parentLabels[row.parentCode] ?? row.parentCode) : '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{row.sortOrder}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium',
                    row.isActive
                       ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  )}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(row._id, row.isActive)}
                      title={row.isActive ? 'Deactivate' : 'Activate'}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {row.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      title="Edit"
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!row.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        title="Delete"
                        className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <RowForm
          type={activeType}
          row={editing === 'new' ? undefined : editing}
          onSave={() => { setEditing(null); reload() }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
