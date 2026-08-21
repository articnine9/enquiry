'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOGGLEABLE_MODULES, type ToggleableModuleKey } from '../moduleVisibility.constants'
import { getModuleVisibilityAction, updateModuleVisibilityAction } from '../actions/moduleVisibility.actions'

export default function ModuleAccessManager() {
  const [visibility, setVisibility] = useState<Record<ToggleableModuleKey, boolean> | null>(null)
  const [pendingKey, setPendingKey] = useState<ToggleableModuleKey | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getModuleVisibilityAction().then((r) => {
      if (r.ok) setVisibility(r.data)
      else toast.error(r.error)
    })
  }, [])

  function toggle(key: ToggleableModuleKey, next: boolean) {
    if (!visibility) return
    const prev = visibility[key]
    setVisibility({ ...visibility, [key]: next })
    setPendingKey(key)

    startTransition(async () => {
      const r = await updateModuleVisibilityAction(key, next)
      setPendingKey(null)
      if (!r.ok) {
        setVisibility((v) => v ? { ...v, [key]: prev } : v)
        toast.error(r.error)
        return
      }
      toast.success(`${TOGGLEABLE_MODULES.find((m) => m.key === key)?.label} ${next ? 'shown to' : 'hidden from'} Staff`)
    })
  }

  if (!visibility) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
      {TOGGLEABLE_MODULES.map((m) => {
        const enabled = visibility[m.key]
        const busy    = isPending && pendingKey === m.key
        return (
          <div key={m.key} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{m.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{m.href}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={busy}
              onClick={() => toggle(m.key, !enabled)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50',
                enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        )
      })}
      <p className="px-5 py-3 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50">
        Hidden modules are removed from Staff&apos;s sidebar and blocked if they visit the page directly. Managers and Super Admins are unaffected.
      </p>
    </div>
  )
}
