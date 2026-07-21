'use client'

import { useActionState, useRef, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { createEnquiry, updateEnquiry } from '../actions/enquiry.actions'
import { FormField, inputClass, selectClass } from '@/components/forms/FormField'
import { Combobox } from '@/components/forms/Combobox'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { getDistrictOptions, getCityOptions } from '@/lib/data/southIndiaDistricts'
import { cn } from '@/lib/utils'
import type { MasterOption } from '@/features/settings/services/masterData.service'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'

export interface EnquiryFormOptions {
  sources:    MasterOption[]
  categories: MasterOption[]
  products:   MasterOption[]
  priorities: MasterOption[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAction(mode: 'create' | 'edit', id?: string) {
  if (mode === 'create') return createEnquiry
  return updateEnquiry.bind(null, id!)
}

// ── Prop types ────────────────────────────────────────────────────────────────

interface EnquiryFormProps {
  mode:       'create' | 'edit'
  options:    EnquiryFormOptions     // dropdown options from MasterData
  enquiry?:   EnquiryDocument        // only for edit mode
  onCancel?:  () => void
  onSuccess?: (enquiry: EnquiryDocument) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnquiryForm({
  mode,
  options,
  enquiry,
  onCancel,
  onSuccess,
}: EnquiryFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const action = buildAction(mode, enquiry ? String(enquiry._id) : undefined)
  const [state, formAction, isPending] = useActionState(action, null)

  const isEdit = mode === 'edit'
  const fe     = (!state?.ok && state?.fieldErrors) ? state.fieldErrors : {}

  // React resets uncontrolled form fields after ANY action completes — success
  // or failure. On failure we re-key the form so it remounts with the
  // submitted values as its new defaults, restoring what the user typed.
  // (State-sync-during-render pattern — avoids an extra render's worth of flash.)
  const [prevState, setPrevState] = useState(state)
  const [formKey,   setFormKey]   = useState(0)
  if (state !== prevState) {
    setPrevState(state)
    if (state && !state.ok) setFormKey((k) => k + 1)
  }
  const submitted = (state && !state.ok ? state.values : undefined) as Record<string, unknown> | undefined
  const submittedStr = (key: string): string | undefined =>
    typeof submitted?.[key] === 'string' ? (submitted[key] as string) : undefined

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(isEdit ? 'Enquiry updated' : 'Enquiry created')
      onSuccess?.(state.data as EnquiryDocument)
      if (!onSuccess) router.push(`/enquiries/${String((state.data as EnquiryDocument)._id)}`)
    } else if (!state.fieldErrors) {
      toast.error(state.error)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Select options (from MasterData) ─────────────────────────────────────────

  const { sources: sourceOptions, priorities: priorityOptions,
          products: productOptions, categories: categoryOptions } = options

  // Default selection: prefer a just-submitted (failed) value, then the existing
  // value on edit, else the first available option.
  const defaultOf = (opts: MasterOption[], key: string, current?: string) =>
    submittedStr(key) ?? current ?? opts[0]?.value ?? ''

  // ── District → City dependent dropdowns (South India dataset) ────────────────

  const districtOptions = useMemo(() => getDistrictOptions(), [])
  const [district, setDistrict] = useState(enquiry?.district ?? '')
  const [city,     setCity]     = useState(enquiry?.city ?? '')
  const cityOptions = useMemo(() => getCityOptions(district), [district])

  function handleDistrictChange(next: string) {
    setDistrict(next)
    // Clear the city whenever it no longer belongs to the selected district
    const stillValid = getCityOptions(next).some((c) => c.value === city)
    if (!stillValid) setCity('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form key={formKey} ref={formRef} action={formAction} noValidate className="space-y-8">

      {/* ── Section: Customer Details ──────────────────────────────────────── */}
      <Section title="Customer Details" subtitle="Contact information for the enquiry">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <FormField id="customerName" label="Full Name" required error={fe.customerName}>
            <input
              id="customerName" name="customerName" type="text"
              defaultValue={submittedStr('customerName') ?? enquiry?.customerName}
              placeholder="e.g. Ahmad bin Razali"
              disabled={isPending}
              aria-describedby={fe.customerName ? 'customerName-error' : undefined}
              className={inputClass(!!fe.customerName)}
            />
          </FormField>

          <FormField id="phone" label="Phone Number" required error={fe.phone}>
            <input
              id="phone" name="phone" type="tel"
              defaultValue={submittedStr('phone') ?? enquiry?.phone}
              placeholder="+60 12-345 6789"
              disabled={isPending}
              className={inputClass(!!fe.phone)}
            />
          </FormField>

          <FormField id="email" label="Email Address" error={fe.email}>
            <input
              id="email" name="email" type="email"
              defaultValue={submittedStr('email') ?? enquiry?.email}
              placeholder="customer@email.com"
              disabled={isPending}
              className={inputClass(!!fe.email)}
            />
          </FormField>

        </div>
      </Section>

      {/* ── Section: Address ──────────────────────────────────────────────── */}
      <Section title="Location" subtitle="Customer's address and area details">
        <div className="grid grid-cols-1 gap-4">

          <FormField id="address" label="Street Address" required error={fe.address}>
            <textarea
              id="address" name="address"
              defaultValue={submittedStr('address') ?? enquiry?.address}
              rows={2}
              placeholder="No. 12, Jalan ABC, Taman XYZ"
              disabled={isPending}
              className={cn(inputClass(!!fe.address), 'resize-none')}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField id="district" label="District" required error={fe.district}>
              <Combobox
                id="district" name="district"
                options={districtOptions}
                value={district}
                onChange={handleDistrictChange}
                placeholder="Select district"
                searchPlaceholder="Search district…"
                emptyText="No district found"
                disabled={isPending}
                hasError={!!fe.district}
              />
            </FormField>

            <FormField id="city" label="City" required error={fe.city}
              hint={!district ? 'Select a district first' : undefined}>
              <Combobox
                id="city" name="city"
                options={cityOptions}
                value={city}
                onChange={setCity}
                placeholder="Select city"
                searchPlaceholder="Search city…"
                emptyText="No city found"
                disabled={isPending || !district}
                disabledHint={!district ? 'Select a district first' : undefined}
                hasError={!!fe.city}
              />
            </FormField>

            <FormField id="pincode" label="Postcode" required error={fe.pincode}
              hint="5-digit postcode">
              <input
                id="pincode" name="pincode" type="text"
                defaultValue={submittedStr('pincode') ?? enquiry?.pincode}
                placeholder="600001"
                maxLength={10}
                disabled={isPending}
                className={inputClass(!!fe.pincode)}
              />
            </FormField>
          </div>

          <FormField id="location" label="Area / Locality" required error={fe.location}
            hint="Neighbourhood or landmark for auto-assignment">
            <input
              id="location" name="location" type="text"
              defaultValue={submittedStr('location') ?? enquiry?.location}
              placeholder="Near Pavilion KL, Bukit Bintang"
              disabled={isPending}
              className={inputClass(!!fe.location)}
            />
          </FormField>

        </div>
      </Section>

      {/* ── Section: Enquiry Details ──────────────────────────────────────── */}
      <Section title="Enquiry Details" subtitle="Product, source, and priority">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <FormField id="enquirySource" label="Enquiry Source" required error={fe.enquirySource}>
            <select
              id="enquirySource" name="enquirySource"
              defaultValue={defaultOf(sourceOptions, 'enquirySource', enquiry?.enquirySource)}
              disabled={isPending}
              className={selectClass(!!fe.enquirySource)}
            >
              {sourceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField id="product" label="Product / Service" required error={fe.product}>
            <select
              id="product" name="product"
              defaultValue={defaultOf(productOptions, 'product', enquiry?.product)}
              disabled={isPending}
              className={selectClass(!!fe.product)}
            >
              {productOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField id="category" label="Category" required error={fe.category}>
            <select
              id="category" name="category"
              defaultValue={defaultOf(categoryOptions, 'category', enquiry?.category)}
              disabled={isPending}
              className={selectClass(!!fe.category)}
            >
              {categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField id="priority" label="Priority" required error={fe.priority}>
            <select
              id="priority" name="priority"
              defaultValue={defaultOf(priorityOptions, 'priority', enquiry?.priority)}
              disabled={isPending}
              className={selectClass(!!fe.priority)}
            >
              {priorityOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

        </div>

        <div className="mt-4 space-y-4">
          <FormField id="subject" label="Subject" required error={fe.subject}>
            <input
              id="subject" name="subject" type="text"
              defaultValue={submittedStr('subject') ?? enquiry?.subject}
              placeholder="Brief description of the enquiry"
              disabled={isPending}
              className={inputClass(!!fe.subject)}
            />
          </FormField>

          <FormField id="description" label="Description" error={fe.description}>
            <textarea
              id="description" name="description"
              defaultValue={submittedStr('description') ?? enquiry?.description}
              rows={4}
              placeholder="Detailed information about the customer's enquiry…"
              disabled={isPending}
              className={cn(inputClass(!!fe.description), 'resize-y min-h-[96px]')}
            />
          </FormField>

          {isEdit && (
            <FormField id="internalNotes" label="Internal Notes"
              error={fe.internalNotes}
              hint="Visible to staff and managers only — not shown to the customer">
              <textarea
                id="internalNotes" name="internalNotes"
                defaultValue={submittedStr('internalNotes') ?? (enquiry as EnquiryDocument & { internalNotes?: string })?.internalNotes}
                rows={3}
                placeholder="Internal notes for the team…"
                disabled={isPending}
                className={cn(inputClass(!!fe.internalNotes), 'resize-y')}
              />
            </FormField>
          )}

          <FormField id="tags" label="Tags"
            error={fe.tags}
            hint="Comma-separated, up to 10 tags">
            <input
              id="tags" name="tags" type="text"
              defaultValue={Array.isArray(submitted?.tags) ? (submitted.tags as string[]).join(', ') : enquiry?.tags?.join(', ')}
              placeholder="urgent, rooftop, commercial"
              disabled={isPending}
              className={inputClass(!!fe.tags)}
            />
          </FormField>
        </div>
      </Section>

      {/* ── Footer actions ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
        <SubmitButton
          label={isEdit ? 'Save Changes' : 'Create Enquiry'}
          loadingLabel={isEdit ? 'Saving…' : 'Creating…'}
          icon={<Save className="w-4 h-4" />}
        />
      </div>

    </form>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, subtitle, children,
}: {
  title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        {children}
      </div>
    </div>
  )
}
