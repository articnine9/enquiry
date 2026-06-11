'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, X } from 'lucide-react'
import { updateEnquiryStatus } from '../actions/enquiry.actions'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { cn } from '@/lib/utils'
import {
  EnquiryStatus, ENQUIRY_STATUS_LABELS,
  ALLOWED_TRANSITIONS,
} from '@/types/enums'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<EnquiryStatus, string> = {
  [EnquiryStatus.New]:        'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
  [EnquiryStatus.Assigned]:   'border-blue-300   text-blue-700   hover:bg-blue-50   dark:border-blue-600   dark:text-blue-300   dark:hover:bg-blue-900/20',
  [EnquiryStatus.InProgress]: 'border-amber-300  text-amber-700  hover:bg-amber-50  dark:border-amber-600  dark:text-amber-300  dark:hover:bg-amber-900/20',
  [EnquiryStatus.FollowUp]:   'border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/20',
  [EnquiryStatus.Resolved]:   'border-green-300  text-green-700  hover:bg-green-50  dark:border-green-600  dark:text-green-300  dark:hover:bg-green-900/20',
  [EnquiryStatus.Closed]:     'border-slate-300  text-slate-500  hover:bg-slate-50  dark:border-slate-600  dark:text-slate-400  dark:hover:bg-slate-800',
  [EnquiryStatus.Cancelled]:  'border-red-300    text-red-600    hover:bg-red-50    dark:border-red-600    dark:text-red-400    dark:hover:bg-red-900/20',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface StatusUpdateModalProps {
  enquiry:   EnquiryDocument
  onClose:   () => void
  onUpdated: (enquiry: EnquiryDocument) => void
}

export default function StatusUpdateModal({
  enquiry,
  onClose,
  onUpdated,
}: StatusUpdateModalProps) {
  const dialogRef  = useRef<HTMLDialogElement>(null)
  const enquiryId  = String(enquiry._id)

  const boundAction = updateEnquiryStatus.bind(null, { id: enquiryId, status: EnquiryStatus.New, note: '' })
  const [state, formAction, isPending] = useActionState(boundAction as never, null)

  const allowedNext: EnquiryStatus[] =
    (ALLOWED_TRANSITIONS[enquiry.status] ?? []) as EnquiryStatus[]

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    if (!state) return
    if ((state as { ok: boolean }).ok) {
      toast.success('Status updated')
      onUpdated((state as { data: EnquiryDocument }).data)
      onClose()
    } else {
      toast.error((state as { error: string }).error)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    dialogRef.current?.close()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0 max-w-md w-full m-auto backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Update Status</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {enquiry.enquiryNo} · Currently: <span className="font-medium">{ENQUIRY_STATUS_LABELS[enquiry.status]}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <form action={formAction} className="p-5 space-y-5">
        {/* Hidden enquiry id */}
        <input type="hidden" name="id" value={enquiryId} />

        {/* Status buttons */}
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Select new status
          </p>

          {allowedNext.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              No valid transitions available from the current status.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {allowedNext.map((s) => (
                <label
                  key={s}
                  className={cn(
                    'relative flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors text-sm font-medium',
                    STATUS_COLORS[s]
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    required
                    className="sr-only peer"
                  />
                  <CheckCircle2 className="w-4 h-4 peer-checked:opacity-100 opacity-0 absolute right-2 top-1/2 -translate-y-1/2" />
                  {ENQUIRY_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Note */}
        <div>
          <label htmlFor="note" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Note <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            placeholder="Reason for this status change…"
            disabled={isPending}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <SubmitButton
            label="Update Status"
            loadingLabel="Updating…"
            disabled={allowedNext.length === 0}
          />
        </div>
      </form>
    </dialog>
  )
}
