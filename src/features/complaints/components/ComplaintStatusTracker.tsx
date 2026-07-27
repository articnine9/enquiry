'use client'

import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateComplaintStatusAction, type ComplaintRow } from '../actions/complaint.actions'
import { ComplaintStatus, COMPLAINT_STATUS_LABELS, COMPLAINT_ALLOWED_TRANSITIONS } from '@/types/enums'
import type { ActionResult } from '@/types/api'

interface Props {
  complaint: ComplaintRow
  canEdit:   boolean
}

export default function ComplaintStatusTracker({ complaint, canEdit }: Props) {
  const router = useRouter()
  const status = complaint.status as ComplaintStatus
  const allowedNext = COMPLAINT_ALLOWED_TRANSITIONS[status] ?? []

  const [pendingStatus, setPendingStatus] = useState<ComplaintStatus | null>(null)
  const [notesDraft, setNotesDraft] = useState(complaint.resolutionNotes ?? '')

  const [state, formAction, isPending] = useActionState(
    updateComplaintStatusAction as (
      prev: ActionResult<ComplaintRow> | null,
      fd: FormData
    ) => Promise<ActionResult<ComplaintRow>>,
    null
  )
  const fe = !state?.ok && state?.fieldErrors ? state.fieldErrors : {}

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(`Status set to ${COMPLAINT_STATUS_LABELS[state.data.status as ComplaintStatus]}`)
      setPendingStatus(null)
      router.refresh()
    } else if (!state.fieldErrors) {
      toast.error(state.error)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePick(next: ComplaintStatus) {
    if (next === status || isPending) return
    setPendingStatus(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 flex-wrap">
        {Object.values(ComplaintStatus).map((s) => {
          const isCurrent = s === status
          const isClickable = canEdit && (allowedNext.includes(s) || isCurrent)
          return (
            <button
              key={s}
              type="button"
              disabled={!isClickable || isPending}
              onClick={() => handlePick(s)}
              className={cn(
                'flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border',
                isClickable && !isCurrent && 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600',
                !isClickable && 'cursor-default opacity-50',
                isCurrent
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              )}
            >
              {isCurrent && <Check className="w-3 h-3" />}
              {COMPLAINT_STATUS_LABELS[s]}
            </button>
          )
        })}
      </div>

      {pendingStatus && (
        <form action={formAction} className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-3 space-y-2.5">
          <input type="hidden" name="id" value={complaint._id} />
          <input type="hidden" name="status" value={pendingStatus} />
          <label htmlFor="resolutionNotes" className="block text-xs font-medium text-indigo-700 dark:text-indigo-300">
            Resolution Notes {pendingStatus === ComplaintStatus.Resolved && <span className="text-red-500">*</span>}
          </label>
          <textarea
            id="resolutionNotes" name="resolutionNotes" rows={3}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="What was done to resolve this complaint?"
            disabled={isPending}
            className={cn(
              'w-full px-3 py-2 rounded-md border bg-white dark:bg-slate-900 text-xs resize-y focus:outline-none focus:ring-2',
              fe.resolutionNotes
                ? 'border-red-400 focus:ring-red-400/40'
                : 'border-indigo-200 dark:border-indigo-700 focus:ring-indigo-500/50'
            )}
          />
          {fe.resolutionNotes && <p className="text-xs text-red-500">{fe.resolutionNotes[0]}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Saving…' : `Confirm ${COMPLAINT_STATUS_LABELS[pendingStatus]}`}
            </button>
            <button
              type="button"
              onClick={() => setPendingStatus(null)}
              disabled={isPending}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
