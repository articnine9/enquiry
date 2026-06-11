'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, MapPin, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getZonesAction, createZoneAction, updateZoneAction, toggleZoneActiveAction,
  type ZoneRow,
} from '../actions/zone.actions'

// ── Zone form dialog ──────────────────────────────────────────────────────────

interface ZoneFormProps {
  zone?:    ZoneRow
  onSave:   () => void
  onCancel: () => void
}

function ZoneForm({ zone, onSave, onCancel }: ZoneFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name:        zone?.name        ?? '',
    code:        zone?.code        ?? '',
    description: zone?.description ?? '',
    pincodes:    zone?.pincodes.join(', ') ?? '',
    cities:      zone?.cities.join(', ')   ?? '',
    states:      zone?.states.join(', ')   ?? '',
    isActive:    zone?.isActive    ?? true,
  })

  function set(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      name:        form.name,
      code:        form.code.toUpperCase(),
      description: form.description || undefined,
      isActive:    form.isActive,
      pincodes:    form.pincodes.split(',').map((s) => s.trim()).filter(Boolean),
      cities:      form.cities.split(',').map((s) => s.trim()).filter(Boolean),
      states:      form.states.split(',').map((s) => s.trim()).filter(Boolean),
    }

    startTransition(async () => {
      const r = zone
        ? await updateZoneAction(zone._id, payload)
        : await createZoneAction(payload)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
            {zone ? 'Edit zone' : 'New zone'}
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
            <div className="col-span-2">
              <label className={LABEL}>Zone name *</label>
              <input required type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={INPUT} placeholder="North London" />
            </div>
            <div>
              <label className={LABEL}>Zone code *</label>
              <input required type="text" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className={INPUT} placeholder="N-LON" maxLength={30} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
              </label>
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Description</label>
              <input type="text" value={form.description} onChange={(e) => set('description', e.target.value)} className={INPUT} placeholder="Optional description" />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Cities (comma separated)</label>
              <input type="text" value={form.cities} onChange={(e) => set('cities', e.target.value)} className={INPUT} placeholder="London, Camden, Islington" />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Postcodes / Pincodes (comma separated)</label>
              <input type="text" value={form.pincodes} onChange={(e) => set('pincodes', e.target.value)} className={INPUT} placeholder="N1, N2, EC1" />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>States / Counties (comma separated)</label>
              <input type="text" value={form.states} onChange={(e) => set('states', e.target.value)} className={INPUT} placeholder="Greater London" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {zone ? 'Save changes' : 'Create zone'}
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

export default function ZoneManager() {
  const [zones,     setZones]     = useState<ZoneRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editing,   setEditing]   = useState<ZoneRow | null | 'new'>(null)

  async function reload() {
    setIsLoading(true)
    const r = await getZonesAction()
    if (r.ok) setZones(r.data)
    setIsLoading(false)
  }

  useEffect(() => { reload() }, [])

  async function handleToggle(id: string, current: boolean) {
    await toggleZoneActiveAction(id, !current)
    setZones((prev) => prev.map((z) => z._id === id ? { ...z, isActive: !current } : z))
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          New zone
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Zone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Coverage</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="w-20" />
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
            ) : zones.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                  No zones yet. Create your first zone to get started.
                </td>
              </tr>
            ) : zones.map((z) => (
              <tr key={z._id} className={cn('hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors', !z.isActive && 'opacity-60')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{z.name}</p>
                      {z.description && <p className="text-xs text-slate-400 truncate max-w-[200px]">{z.description}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{z.code}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {[
                    z.cities.length   > 0 && `${z.cities.length} cities`,
                    z.pincodes.length > 0 && `${z.pincodes.length} postcodes`,
                  ].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                  {z.staffCount ?? 0}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium',
                    z.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  )}>
                    {z.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditing(z)}
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(z._id, z.isActive)}
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                      title={z.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {z.isActive
                        ? <ToggleRight className="w-4 h-4 text-green-500" />
                        : <ToggleLeft className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      {editing !== null && (
        <ZoneForm
          zone={editing === 'new' ? undefined : editing}
          onSave={() => { setEditing(null); reload() }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
