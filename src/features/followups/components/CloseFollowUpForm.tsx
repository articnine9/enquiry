'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { closeFollowUpAction } from '../actions/followup.actions'
import { FormField, inputClass, selectClass } from '@/components/forms/FormField'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { cn } from '@/lib/utils'
import {
  FollowUpType,
  FollowUpOutcome,
  FollowUpStatus,
  FOLLOW_UP_TYPE_LABELS,
  FOLLOW_UP_OUTCOME_LABELS,
} from '@/types/enums'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'
import type { ActionResult } from '@/types/api'

// ── Outcome options by type ───────────────────────────────────────────────────

const CALL_OUTCOMES: FollowUpOutcome[] = [
  FollowUpOutcome.Contacted,
  FollowUpOutcome.NoAnswer,
  FollowUpOutcome.LeftVoicemail,
  FollowUpOutcome.CallbackRequested,
  FollowUpOutcome.Resolved,
  FollowUpOutcome.NotInterested,
  FollowUpOutcome.Escalated,
  FollowUpOutcome.Rescheduled,
]

const DEFAULT_OUTCOMES: FollowUpOutcome[] = Object.values(FollowUpOutcome)

function outcomesFor(type: FollowUpType): FollowUpOutcome[] {
  return type === FollowUpType.Call ? CALL_OUTCOMES : DEFAULT_OUTCOMES
}

function toDatetimeLocal(date?: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CloseFollowUpFormProps {
  followUp:  FollowUpDocument
  onSuccess?: (fu: FollowUpDocument) => void
  onCancel?:  () => void
}

export default function CloseFollowUpForm({
  followUp,
  onSuccess,
  onCancel,
}: CloseFollowUpFormProps) {
  const [state, formAction, isPending] = useActionState(
    closeFollowUpAction as (
      prev: ActionResult<FollowUpDocument> | null,
      fd: FormData
    ) => Promise<ActionResult<FollowUpDocument>>,
    null
  )

  const fe = !state?.ok && state?.fieldErrors ? state.fieldErrors : {}

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success('Follow-up closed')
      onSuccess?.(state.data as FollowUpDocument)
    } else if (!state.fieldErrors) {
      toast.error(state.error)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  const outcomes = outcomesFor(followUp.type)

  return (
    <form action={formAction} noValidate className="space-y-5">
      {/* Hidden id */}
      <input type="hidden" name="id" value={String(followUp._id)} />

      {/* ── Close action ──────────────────────────────────────────────────── */}
      <FormField id="status" label="Action" required error={fe.status}>
        <div className="grid grid-cols-3 gap-2">
          {(
            [FollowUpStatus.Completed, FollowUpStatus.Cancelled, FollowUpStatus.Missed] as const
          ).map((s) => (
            <label
              key={s}
              className={cn(
                'flex flex-col items-center gap-1.5 border rounded-xl px-3 py-3 cursor-pointer transition-colors text-center',
                'has-[:checked]:ring-2 has-[:checked]:ring-offset-1',
                s === FollowUpStatus.Completed
                  ? 'has-[:checked]:border-green-400 has-[:checked]:ring-green-400 has-[:checked]:bg-green-50 dark:has-[:checked]:bg-green-900/20'
                  : s === FollowUpStatus.Missed
                    ? 'has-[:checked]:border-red-400 has-[:checked]:ring-red-400 has-[:checked]:bg-red-50 dark:has-[:checked]:bg-red-900/20'
                    : 'has-[:checked]:border-slate-400 has-[:checked]:ring-slate-400 has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-800',
                'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              <input
                type="radio"
                name="status"
                value={s}
                defaultChecked={s === FollowUpStatus.Completed}
                required
                className="sr-only"
              />
              <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-200">
                {s}
              </span>
            </label>
          ))}
        </div>
      </FormField>

      {/* ── Outcome ───────────────────────────────────────────────────────── */}
      <FormField id="outcome" label="Outcome" required error={fe.outcome}>
        <select
          id="outcome"
          name="outcome"
          defaultValue=""
          disabled={isPending}
          className={selectClass(!!fe.outcome)}
        >
          <option value="">Select outcome…</option>
          {outcomes.map((o) => (
            <option key={o} value={o}>{FOLLOW_UP_OUTCOME_LABELS[o]}</option>
          ))}
        </select>
      </FormField>

      {/* ── Completed at ──────────────────────────────────────────────────── */}
      <FormField id="completedAt" label="Completed At" error={fe.completedAt}>
        <input
          id="completedAt"
          name="completedAt"
          type="datetime-local"
          defaultValue={toDatetimeLocal(new Date())}
          disabled={isPending}
          className={inputClass(!!fe.completedAt)}
        />
      </FormField>

      {/* ── Duration ──────────────────────────────────────────────────────── */}
      <FormField
        id="durationMinutes"
        label="Duration (minutes)"
        error={fe.durationMinutes}
      >
        <input
          id="durationMinutes"
          name="durationMinutes"
          type="number"
          min={1}
          max={480}
          defaultValue={followUp.durationMinutes ?? undefined}
          placeholder="e.g. 10"
          disabled={isPending}
          className={inputClass(!!fe.durationMinutes)}
        />
      </FormField>

      {/* ── Notes update ──────────────────────────────────────────────────── */}
      <FormField
        id="notes"
        label="Closing Notes"
        hint="Add any final notes"
        error={fe.notes}
      >
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={followUp.notes}
          disabled={isPending}
          className={cn(inputClass(!!fe.notes), 'resize-none')}
        />
      </FormField>

      {/* ── Auto-schedule next ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 space-y-4 bg-slate-50 dark:bg-slate-800/40">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Schedule Next Follow-up
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField id="nextFollowUpDate" label="Date & Time" error={fe.nextFollowUpDate}>
            <input
              id="nextFollowUpDate"
              name="nextFollowUpDate"
              type="datetime-local"
              disabled={isPending}
              className={inputClass(!!fe.nextFollowUpDate)}
            />
          </FormField>
          <FormField id="nextFollowUpType" label="Type" error={fe.nextFollowUpType}>
            <select
              id="nextFollowUpType"
              name="nextFollowUpType"
              defaultValue=""
              disabled={isPending}
              className={selectClass(!!fe.nextFollowUpType)}
            >
              <option value="">Select type…</option>
              {Object.values(FollowUpType).map((v) => (
                <option key={v} value={v}>{FOLLOW_UP_TYPE_LABELS[v]}</option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <SubmitButton
          label="Close Follow-up"
          loadingLabel="Closing…"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>
    </form>
  )
}
