'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { createComplaintAction, type ComplaintRow } from '../actions/complaint.actions'
import { FormField, inputClass, selectClass } from '@/components/forms/FormField'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { cn } from '@/lib/utils'
import { ComplaintType, COMPLAINT_TYPE_LABELS } from '@/types/enums'
import type { ActionResult } from '@/types/api'

function todayLocal(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function ComplaintForm() {
  const router = useRouter()

  const [state, formAction] = useActionState(
    createComplaintAction as (
      prev: ActionResult<ComplaintRow> | null,
      fd: FormData
    ) => Promise<ActionResult<ComplaintRow>>,
    null
  )
  const fe = !state?.ok && state?.fieldErrors ? state.fieldErrors : {}
  const values = !state?.ok ? state?.values as Record<string, unknown> | undefined : undefined
  const str = (key: string) => typeof values?.[key] === 'string' ? (values[key] as string) : undefined

  useEffect(() => {
    if (state?.ok) {
      toast.success('Complaint logged')
      router.push(`/complaints/${state.data._id}`)
    } else if (state && !state.fieldErrors) {
      toast.error(state.error)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={formAction} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="customerName" label="Customer Name" required error={fe.customerName}>
          <input
            id="customerName" name="customerName" type="text"
            defaultValue={str('customerName')}
            placeholder="e.g. Ravi Kumar"
            className={inputClass(!!fe.customerName)}
          />
        </FormField>

        <FormField id="phone" label="Phone Number" required error={fe.phone}>
          <input
            id="phone" name="phone" type="tel"
            defaultValue={str('phone')}
            placeholder="+91 98765 43210"
            className={inputClass(!!fe.phone)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="complaintType" label="Complaint Type" required error={fe.complaintType}>
          <select
            id="complaintType" name="complaintType"
            defaultValue={str('complaintType') ?? ComplaintType.Product}
            className={selectClass(!!fe.complaintType)}
          >
            {Object.values(ComplaintType).map((v) => (
              <option key={v} value={v}>{COMPLAINT_TYPE_LABELS[v]}</option>
            ))}
          </select>
        </FormField>

        <FormField id="complaintDate" label="Complaint Date" required error={fe.complaintDate}>
          <input
            id="complaintDate" name="complaintDate" type="date"
            defaultValue={str('complaintDate') ?? todayLocal()}
            className={inputClass(!!fe.complaintDate)}
          />
        </FormField>
      </div>

      <FormField id="description" label="Complaint Details" required error={fe.description}>
        <textarea
          id="description" name="description" rows={5}
          defaultValue={str('description')}
          placeholder="What went wrong, in the customer's words…"
          className={cn(inputClass(!!fe.description), 'resize-y min-h-[120px]')}
        />
      </FormField>

      <div className="flex items-center justify-end gap-2 pt-2">
        <SubmitButton
          label="Log Complaint"
          loadingLabel="Saving…"
          icon={<Save className="w-4 h-4" />}
        />
      </div>
    </form>
  )
}
