'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle2, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActionResult } from '@/types/api'

export interface DeletePreviewRow {
  id:        string
  label:     string
  ok:        boolean
  reason?:   string
  warnings?: string[]
}

type Stage = 'loading' | 'confirm' | 'deleting' | 'done'

interface DeleteConfirmModalProps {
  title:          string
  ids:            string[]
  previewAction:  (ids: string[]) => Promise<ActionResult<DeletePreviewRow[]>>
  commitAction:   (ids: string[]) => Promise<ActionResult<DeletePreviewRow[]>>
  onClose:        () => void
  onDeleted:      () => void
}

const CONFIRM_PHRASE = 'DELETE'

export default function DeleteConfirmModal({
  title, ids, previewAction, commitAction, onClose, onDeleted,
}: DeleteConfirmModalProps) {
  const [stage,      setStage]      = useState<Stage>('loading')
  const [rows,        setRows]      = useState<DeletePreviewRow[]>([])
  const [error,       setError]     = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    previewAction(ids).then((result) => {
      if (!result.ok) { setError(result.error); return }
      setRows(result.data)
      setStage('confirm')
    })
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps

  const deletableCount = rows.filter((r) => r.ok).length
  const blockedCount   = rows.length - deletableCount
  const canConfirm      = confirmText.trim() === CONFIRM_PHRASE && deletableCount > 0

  async function handleDelete() {
    setStage('deleting')
    const result = await commitAction(rows.filter((r) => r.ok).map((r) => r.id))
    if (!result.ok) {
      setError(result.error)
      setStage('confirm')
      return
    }
    setRows(result.data)
    setStage('done')
  }

  function handleFinish() {
    onDeleted()
    onClose()
  }

  const deletedCount = stage === 'done' ? rows.filter((r) => r.ok).length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            {title}
          </h2>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {stage === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking what can be deleted…
            </div>
          )}

          {(stage === 'confirm' || stage === 'deleting') && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" /> {deletableCount} will be permanently deleted
                </span>
                {blockedCount > 0 && (
                  <span className="text-slate-400">· {blockedCount} skipped</span>
                )}
              </div>

              <RowList rows={rows} />

              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm — this cannot be undone.
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={stage === 'deleting'}
                  placeholder="DELETE"
                  className="w-full h-9 px-3 rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>
            </>
          )}

          {stage === 'done' && (
            <>
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                Permanently deleted {deletedCount}
                {blockedCount > 0 && <span className="text-slate-500 dark:text-slate-400"> · {blockedCount} skipped</span>}
              </div>
              <RowList rows={rows} />
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
          {stage === 'confirm' && (
            <>
              <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm}
                className="h-9 px-5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 transition-colors"
              >
                Permanently delete {deletableCount}
              </button>
            </>
          )}
          {stage === 'deleting' && (
            <button type="button" disabled className="h-9 px-5 rounded-lg text-sm font-medium bg-red-600 text-white opacity-50 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…
            </button>
          )}
          {stage === 'done' && (
            <button type="button" onClick={handleFinish} className="h-9 px-5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
              Done
            </button>
          )}
          {stage === 'loading' && (
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RowList({ rows }: { rows: DeletePreviewRow[] }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((r) => (
          <div key={r.id} className={cn('px-3 py-2 text-xs', !r.ok && 'bg-red-50/50 dark:bg-red-950/20')}>
            <div className="flex items-start gap-2">
              {r.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-slate-700 dark:text-slate-300 truncate">{r.label}</p>
                {r.reason && <p className="text-red-600 dark:text-red-400 mt-0.5">{r.reason}</p>}
                {r.warnings && r.warnings.length > 0 && (
                  <p className="text-amber-600 dark:text-amber-400 mt-0.5">{r.warnings.join(' · ')}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
