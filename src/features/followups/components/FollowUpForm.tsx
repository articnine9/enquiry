'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Save } from 'lucide-react'
import {
  createFollowUpAction,
  updateFollowUpAction,
} from '../actions/followup.actions'
import { FormField, inputClass, selectClass } from '@/components/forms/FormField'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { cn } from '@/lib/utils'
import {
  FollowUpType,
  FollowUpStatus,
  FOLLOW_UP_TYPE_LABELS,
} from '@/types/enums'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'
import type { ActionResult } from '@/types/api'

// ── Reminder offset options ───────────────────────────────────────────────────

const REMINDER_OPTIONS = [
  { value: '',     label: 'No reminder'  },
  { value: '15',   label: '15 min before' },
  { value: '30',   label: '30 min before' },
  { value: '60',   label: '1 hour before' },
  { value: '120',  label: '2 hours before' },
  { value: '1440', label: '1 day before'  },
  { value: '2880', label: '2 days before' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDatetimeLocal(date?: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  // Format: YYYY-MM-DDTHH:mm  (required by datetime-local input)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

function minDatetimeLocal(): string {
  return toDatetimeLocal(new Date())
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FollowUpFormProps {
  mode:       'create' | 'edit'
  enquiryId?: string
  followUp?:  FollowUpDocument
  onSuccess?: (fu: FollowUpDocument) => void
  onCancel?:  () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FollowUpForm({
  mode,
  enquiryId,
  followUp,
  onSuccess,
  onCancel,
}: FollowUpFormProps) {
  const isEdit = mode === 'edit'

  const action = isEdit
    ? updateFollowUpAction.bind(null, String(followUp!._id))
    : createFollowUpAction

  const [state, formAction, isPending] = useActionState(
    action as (
      prev: ActionResult<FollowUpDocument> | null,
      fd: FormData
    ) => Promise<ActionResult<FollowUpDocument>>,
    null
  )

  const fe = !state?.ok && state?.fieldErrors ? state.fieldErrors : {}

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(isEdit ? 'Follow-up updated' : 'Follow-up scheduled')
      onSuccess?.(state.data as FollowUpDocument)
    } else if (!state.fieldErrors) {
      toast.error(state.error)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={formAction} noValidate className="space-y-5">
      {/* Hidden fields */}
      {!isEdit && <input type="hidden" name="enquiryId" value={enquiryId} />}

      {/* ── Type ──────────────────────────────────────────────────────────── */}
      <FormField id="type" label="Type" required error={fe.type}>
        <select
          id="type" name="type"
          defaultValue={followUp?.type ?? FollowUpType.Call}
          disabled={isPending}
          className={selectClass(!!fe.type)}
        >
          {Object.values(FollowUpType).map((v) => (
            <option key={v} value={v}>{FOLLOW_UP_TYPE_LABELS[v]}</option>
          ))}
        </select>
      </FormField>

      {/* ── Scheduled at ──────────────────────────────────────────────────── */}
      <FormField
        id="scheduledAt"
        label="Scheduled Date & Time"
        required
        error={fe.scheduledAt}
      >
        <input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          defaultValue={toDatetimeLocal(followUp?.scheduledAt)}
          min={isEdit ? undefined : minDatetimeLocal()}
          disabled={isPending}
          className={inputClass(!!fe.scheduledAt)}
        />
      </FormField>

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      <FormField
        id="notes"
        label="Notes"
        required
        hint="What was discussed / what needs to happen"
        error={fe.notes}
      >
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={followUp?.notes}
          placeholder="Customer requested a callback next Tuesday…"
          disabled={isPending}
          className={cn(inputClass(!!fe.notes), 'resize-y min-h-[96px]')}
        />
      </FormField>

      {/* ── Internal notes ────────────────────────────────────────────────── */}
      <FormField
        id="internalNotes"
        label="Internal Notes"
        hint="Staff-only — not visible to the customer"
        error={fe.internalNotes}
      >
        <textarea
          id="internalNotes"
          name="internalNotes"
          rows={2}
          defaultValue={undefined}
          placeholder="Add any team-facing context here…"
          disabled={isPending}
          className={cn(inputClass(!!fe.internalNotes), 'resize-none')}
        />
      </FormField>

      {/* ── Duration ──────────────────────────────────────────────────────── */}
      <FormField
        id="durationMinutes"
        label="Duration (minutes)"
        hint="For calls or meetings"
        error={fe.durationMinutes}
      >
        <input
          id="durationMinutes"
          name="durationMinutes"
          type="number"
          min={1}
          max={480}
          defaultValue={followUp?.durationMinutes ?? undefined}
          placeholder="e.g. 15"
          disabled={isPending}
          className={inputClass(!!fe.durationMinutes)}
        />
      </FormField>

      {/* ── Next follow-up ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <CalendarClock className="w-4 h-4 text-slate-400" />
          Schedule Next Follow-up
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="nextFollowUpDate"
            label="Date & Time"
            error={fe.nextFollowUpDate}
          >
            <input
              id="nextFollowUpDate"
              name="nextFollowUpDate"
              type="datetime-local"
              defaultValue={toDatetimeLocal(followUp?.nextFollowUpDate)}
              min={minDatetimeLocal()}
              disabled={isPending}
              className={inputClass(!!fe.nextFollowUpDate)}
            />
          </FormField>

          <FormField
            id="nextFollowUpType"
            label="Type"
            error={fe.nextFollowUpType}
          >
            <select
              id="nextFollowUpType"
              name="nextFollowUpType"
              defaultValue={followUp?.nextFollowUpType ?? ''}
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

      {/* ── Reminder ──────────────────────────────────────────────────────── */}
      <FormField
        id="reminderOffsetMinutes"
        label="Reminder"
        error={fe.reminderOffsetMinutes}
      >
        <select
          id="reminderOffsetMinutes"
          name="reminderOffsetMinutes"
          defaultValue=""
          disabled={isPending}
          className={selectClass(!!fe.reminderOffsetMinutes)}
        >
          {REMINDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FormField>

      {/* ── Tags ──────────────────────────────────────────────────────────── */}
      <FormField
        id="tags"
        label="Tags"
        hint="Comma-separated"
        error={fe.tags}
      >
        <input
          id="tags"
          name="tags"
          type="text"
          defaultValue={followUp?.tags?.join(', ')}
          placeholder="urgent, pricing, demo"
          disabled={isPending}
          className={inputClass(!!fe.tags)}
        />
      </FormField>

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
          label={isEdit ? 'Save Changes' : 'Schedule Follow-up'}
          loadingLabel={isEdit ? 'Saving…' : 'Scheduling…'}
          icon={<Save className="w-4 h-4" />}
        />
      </div>
    </form>
  )
}
