'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { updateEnquiryStatus } from '../actions/enquiry.actions'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { SlaBadge } from './SlaBadge'
import { selectClass } from '@/components/forms/FormField'
import {
  EnquiryStatus, ENQUIRY_STATUS_LABELS,
  ALLOWED_TRANSITIONS,
} from '@/types/enums'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'

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
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Update Status</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {enquiry.enquiryNo} · Currently: <span className="font-medium">{ENQUIRY_STATUS_LABELS[enquiry.status]}</span>
          </p>
          <SlaBadge
            createdAt={enquiry.createdAt}
            dueAt={enquiry.slaDueAt}
            slaMet={enquiry.slaMet}
            isClosed={enquiry.status === EnquiryStatus.Cancelled}
            isPaused={enquiry.status === EnquiryStatus.Paused}
            showCountdown
          />
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

        {/* Status dropdown */}
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Select new status
          </label>

          {allowedNext.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              No valid transitions available from the current status.
            </p>
          ) : (
            <select
              id="status"
              name="status"
              required
              disabled={isPending}
              defaultValue=""
              className={selectClass()}
            >
              <option value="" disabled>Choose a status…</option>
              {allowedNext.map((s) => (
                <option key={s} value={s}>
                  {ENQUIRY_STATUS_LABELS[s]}
                  {s === EnquiryStatus.Paused ? ' (pauses SLA clock)' : ''}
                </option>
              ))}
            </select>
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
