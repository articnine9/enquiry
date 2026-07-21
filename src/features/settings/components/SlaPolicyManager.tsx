'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2, Loader2, X, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMasterDataAction, type MasterDataRow } from '../actions/masterData.actions'
import {
  getSlaPoliciesAction,
  createSlaPolicyAction,
  updateSlaPolicyAction,
  toggleSlaPolicyActiveAction,
  deleteSlaPolicyAction,
  type SLAPolicyRow,
} from '../actions/slaPolicy.actions'

// ── Minutes ⇄ friendly duration ────────────────────────────────────────────────

type Unit = 'minutes' | 'hours' | 'days'
const UNIT_MINUTES: Record<Unit, number> = { minutes: 1, hours: 60, days: 1440 }

function splitMinutes(total: number): { amount: number; unit: Unit } {
  if (total % 1440 === 0 && total >= 1440) return { amount: total / 1440, unit: 'days' }
  if (total % 60   === 0 && total >= 60)   return { amount: total / 60,   unit: 'hours' }
  return { amount: total, unit: 'minutes' }
}

function formatMinutes(total: number): string {
  const { amount, unit } = splitMinutes(total)
  return `${amount} ${unit}`
}

// ── Row editor dialog ──────────────────────────────────────────────────────────

interface RowFormProps {
  row?:               SLAPolicyRow
  priorityOptions:    MasterDataRow[]
  categoryOptions:    MasterDataRow[]
  onSave:             () => void
  onCancel:           () => void
}

function RowForm({ row, priorityOptions, categoryOptions, onSave, onCancel }: RowFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const initialSplit = splitMinutes(row?.resolutionMinutes ?? 240)
  const [form, setForm] = useState({
    priority: row?.priority ?? priorityOptions[0]?.code ?? '',
    category: row?.category ?? '',
    amount:   initialSplit.amount.toString(),
    unit:     initialSplit.unit as Unit,
    isActive: row?.isActive ?? true,
  })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const resolutionMinutes = Number(form.amount) * UNIT_MINUTES[form.unit]
    const payload = {
      priority:          form.priority,
      category:          form.category || null,
      resolutionMinutes,
      isActive:          form.isActive,
    }

    startTransition(async () => {
      const r = row
        ? await updateSlaPolicyAction(row._id, payload)
        : await createSlaPolicyAction(payload)
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
            {row ? 'Edit SLA policy' : 'New SLA policy'}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>
                Priority * {row?.isSystem && <span className="text-slate-400">(locked)</span>}
              </label>
              <select
                required value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                disabled={row?.isSystem}
                className={INPUT}
              >
                {priorityOptions.map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>
                Category {row?.isSystem && <span className="text-slate-400">(locked)</span>}
              </label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                disabled={row?.isSystem}
                className={INPUT}
              >
                <option value="">All categories (default)</option>
                {categoryOptions.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className={LABEL}>Resolve within *</label>
              <div className="flex gap-2">
                <input
                  required type="number" min={1} value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  className={cn(INPUT, 'flex-1')}
                />
                <select value={form.unit} onChange={(e) => set('unit', e.target.value as Unit)} className={cn(INPUT, 'w-28')}>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Time from creation until the enquiry must be resolved.</p>
            </div>

            <div className="col-span-2 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={isPending} className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 transition-colors">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {row ? 'Save changes' : 'Create policy'}
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

export default function SlaPolicyManager() {
  const [rows,       setRows]       = useState<SLAPolicyRow[]>([])
  const [priorities, setPriorities] = useState<MasterDataRow[]>([])
  const [categories, setCategories] = useState<MasterDataRow[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [editing,    setEditing]    = useState<SLAPolicyRow | null | 'new'>(null)
  const [error,      setError]      = useState<string | null>(null)

  async function reload() {
    setIsLoading(true)
    setError(null)
    const [policiesRes, prioritiesRes, categoriesRes] = await Promise.all([
      getSlaPoliciesAction(),
      getMasterDataAction('enquiry_priority'),
      getMasterDataAction('enquiry_category'),
    ])
    if (policiesRes.ok) setRows(policiesRes.data)
    else setError(policiesRes.error)
    if (prioritiesRes.ok) setPriorities(prioritiesRes.data.filter((p) => p.isActive))
    if (categoriesRes.ok) setCategories(categoriesRes.data.filter((c) => c.isActive))
    setIsLoading(false)
  }

  useEffect(() => { reload() }, [])

  const priorityLabel = useMemo(
    () => new Map(priorities.map((p) => [p.code, p.label])),
    [priorities]
  )
  const categoryLabel = useMemo(
    () => new Map(categories.map((c) => [c.code, c.label])),
    [categories]
  )

  async function handleToggle(id: string, current: boolean) {
    await toggleSlaPolicyActiveAction(id, !current)
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, isActive: !current } : r))
  }

  async function handleDelete(row: SLAPolicyRow) {
    const label = `${priorityLabel.get(row.priority) ?? row.priority}${row.category ? ` / ${categoryLabel.get(row.category) ?? row.category}` : ''}`
    if (!confirm(`Delete the SLA policy for "${label}"? This cannot be undone.`)) return
    const r = await deleteSlaPolicyAction(row._id)
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
          disabled={priorities.length === 0}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New policy
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Resolve within</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
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
                  No SLA policies yet. Add one per priority to start tracking resolution targets.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row._id} className={cn('hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors', !row.isActive && 'opacity-60')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {priorityLabel.get(row.priority) ?? row.priority}
                    </span>
                    {row.isSystem && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">system</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {row.category ? (categoryLabel.get(row.category) ?? row.category) : 'All categories'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                  {formatMinutes(row.resolutionMinutes)}
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
                    {!row.isSystem && (
                      <button type="button" onClick={() => handleDelete(row)} title="Delete"
                        className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
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

      {editing !== null && (
        <RowForm
          row={editing === 'new' ? undefined : editing}
          priorityOptions={priorities}
          categoryOptions={categories}
          onSave={() => { setEditing(null); reload() }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
