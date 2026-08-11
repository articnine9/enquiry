'use client'

import { useActionState, useRef, useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, X } from 'lucide-react'
import { createEnquiry, updateEnquiry } from '../actions/enquiry.actions'
import { FormField, inputClass, selectClass } from '@/components/forms/FormField'
import { Combobox } from '@/components/forms/Combobox'
import { MultiCombobox } from '@/components/forms/MultiCombobox'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { cn } from '@/lib/utils'
import type { MasterOption, MasterSubOption } from '@/features/settings/services/masterData.service'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'

export interface EnquiryFormOptions {
  sources:    MasterOption[]
  categories: MasterSubOption[]
  products:   MasterSubOption[]
  priorities: MasterOption[]
  businessCategories:    MasterOption[]
  businessSubCategories: MasterSubOption[]
  states:    MasterOption[]
  districts: MasterSubOption[]
  taluks:    MasterSubOption[]
  pincodes:  MasterSubOption[]
}

/** Keeps a legacy/orphaned current value visible in a filtered dropdown even if
 * it doesn't (yet) belong to the selected parent — avoids a confusing blank
 * select for enquiries created before Product/Category were scoped. */
function withCurrent(filtered: MasterSubOption[], all: MasterSubOption[], current: string): MasterSubOption[] {
  if (!current || filtered.some((o) => o.value === current)) return filtered
  const existing = all.find((o) => o.value === current)
  return existing ? [existing, ...filtered] : filtered
}

/** Code of the option whose label matches `label`, preferring one scoped to `parentCode`. */
function findCodeByLabel(opts: MasterSubOption[] | MasterOption[], label: string | undefined, parentCode?: string): string {
  if (!label) return ''
  if (parentCode !== undefined) {
    const scoped = (opts as MasterSubOption[]).find((o) => o.label === label && o.parentCode === parentCode)
    if (scoped) return scoped.value
  }
  return opts.find((o) => o.label === label)?.value ?? ''
}

/** Codes of the options whose labels match `labels`, preferring ones scoped to `parentCode`. */
function findCodesByLabels(opts: MasterSubOption[], labels: string[] | undefined, parentCode?: string): string[] {
  if (!labels?.length) return []
  return labels
    .map((label) => findCodeByLabel(opts, label, parentCode))
    .filter(Boolean)
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
  const submittedArr = (key: string): string[] | undefined =>
    Array.isArray(submitted?.[key]) ? (submitted[key] as string[]) : undefined

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
          products: allProductOptions, categories: allCategoryOptions,
          businessCategories: businessCategoryOptions, businessSubCategories: allBusinessSubCategoryOptions } = options

  // Default selection: prefer a just-submitted (failed) value, then the existing
  // value on edit, else the first available option.
  const defaultOf = (opts: MasterOption[], key: string, current?: string) =>
    submittedStr(key) ?? current ?? opts[0]?.value ?? ''

  // ── State → District → Taluk → Pincode dependent dropdowns (MasterData) ─────
  // Comboboxes are keyed by MasterData *code* internally (so parentCode
  // filtering works); the actual district/taluk/pincode text stored on the
  // enquiry is the *label*, unchanged from before — staff auto-assignment
  // zone-matching keys off that exact label text.

  const [stateCode,    setStateCodeRaw]    = useState(
    submittedStr('stateCode') ?? findCodeByLabel(options.states, enquiry?.state)
  )
  const [districtCode, setDistrictCodeRaw] = useState(
    submittedStr('districtCode') ?? findCodeByLabel(options.districts, enquiry?.district, stateCode)
  )
  const [talukCodes,   setTalukCodesRaw]   = useState<string[]>(
    submittedArr('taluks')
      ? findCodesByLabels(options.taluks, submittedArr('taluks'), districtCode)
      : findCodesByLabels(options.taluks, enquiry?.taluks, districtCode)
  )
  const [pincodeCode,  setPincodeCode]     = useState(
    submittedStr('pincodeCode') ?? findCodeByLabel(options.pincodes, enquiry?.pincode, talukCodes[0])
  )

  const stateOptions    = useMemo(() => options.states.map((s) => ({ value: s.value, label: s.label })), [options.states])
  const districtOptions = useMemo(
    () => options.districts.filter((d) => d.parentCode === stateCode).map((d) => ({ value: d.value, label: d.label })),
    [options.districts, stateCode]
  )
  const talukOptions = useMemo(
    () => options.taluks.filter((t) => t.parentCode === districtCode).map((t) => ({ value: t.value, label: t.label })),
    [options.taluks, districtCode]
  )
  // Pincode options pool from every selected taluk's coverage, not just one.
  const pincodeOptions = useMemo(
    () => options.pincodes.filter((p) => talukCodes.includes(p.parentCode)).map((p) => ({ value: p.value, label: p.label })),
    [options.pincodes, talukCodes]
  )

  const stateLabel    = options.states.find((s) => s.value === stateCode)?.label ?? ''
  const districtLabel = options.districts.find((d) => d.value === districtCode)?.label ?? ''
  const talukLabels    = options.taluks.filter((t) => talukCodes.includes(t.value)).map((t) => t.label)
  const pincodeLabel   = options.pincodes.find((p) => p.value === pincodeCode)?.label ?? ''

  function setStateCode(next: string) {
    setStateCodeRaw(next)
    const stillValid = options.districts.some((d) => d.parentCode === next && d.value === districtCode)
    if (!stillValid) { setDistrictCodeRaw(''); setTalukCodesRaw([]); setPincodeCode('') }
  }

  function setDistrictCode(next: string) {
    setDistrictCodeRaw(next)
    const stillValidTaluks = talukCodes.filter((tc) => options.taluks.some((t) => t.parentCode === next && t.value === tc))
    setTalukCodesRaw(stillValidTaluks)
    if (!stillValidTaluks.some((tc) => options.pincodes.some((p) => p.parentCode === tc && p.value === pincodeCode))) {
      setPincodeCode('')
    }
  }

  function setTalukCodes(next: string[]) {
    setTalukCodesRaw(next)
    const stillValid = options.pincodes.some((p) => next.includes(p.parentCode) && p.value === pincodeCode)
    if (!stillValid) setPincodeCode('')
  }

  // ── Business Category → Product / Category / Sub-category dependents ────────

  const [businessCategory, setBusinessCategory] = useState(
    submittedStr('businessCategory') ?? enquiry?.businessCategory ?? ''
  )
  const [businessSubCategory, setBusinessSubCategory] = useState(
    submittedStr('businessSubCategory') ?? enquiry?.businessSubCategory ?? ''
  )
  const [product, setProduct] = useState(submittedStr('product') ?? enquiry?.product ?? '')
  const [category, setCategory] = useState(submittedStr('category') ?? enquiry?.category ?? '')

  const businessSubCategoryOptions = useMemo(
    () => allBusinessSubCategoryOptions.filter((o) => o.parentCode === businessCategory),
    [allBusinessSubCategoryOptions, businessCategory]
  )
  const productOptions = useMemo(
    () => withCurrent(allProductOptions.filter((o) => o.parentCode === businessCategory), allProductOptions, product),
    [allProductOptions, businessCategory, product]
  )
  const categoryOptions = useMemo(
    () => withCurrent(allCategoryOptions.filter((o) => o.parentCode === businessCategory), allCategoryOptions, category),
    [allCategoryOptions, businessCategory, category]
  )

  function handleBusinessCategoryChange(next: string) {
    setBusinessCategory(next)
    if (!allBusinessSubCategoryOptions.some((o) => o.parentCode === next && o.value === businessSubCategory)) {
      setBusinessSubCategory('')
    }
    if (!allProductOptions.some((o) => o.parentCode === next && o.value === product)) {
      setProduct('')
    }
    if (!allCategoryOptions.some((o) => o.parentCode === next && o.value === category)) {
      setCategory('')
    }
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

          {/* Submitted district/pincode/state are the resolved *labels* —
              staff auto-assignment zone-matching keys off that exact text.
              Taluks submit as one hidden input per selected label, read via
              formData.getAll('taluks') on the server. */}
          <input type="hidden" name="state"    value={stateLabel} />
          <input type="hidden" name="district" value={districtLabel} />
          {talukLabels.map((label) => <input key={label} type="hidden" name="taluks" value={label} />)}
          <input type="hidden" name="pincode"  value={pincodeLabel} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField id="stateCode" label="State" required error={fe.state}>
              <Combobox
                id="stateCode" name="stateCode"
                options={stateOptions}
                value={stateCode}
                onChange={setStateCode}
                placeholder="Select state"
                searchPlaceholder="Search state…"
                emptyText="No state found — add one in Settings › Master Data"
                disabled={isPending}
                hasError={!!fe.state}
              />
            </FormField>

            <FormField id="districtCode" label="District" required error={fe.district}
              hint={!stateCode ? 'Select a state first' : undefined}>
              <Combobox
                id="districtCode" name="districtCode"
                options={districtOptions}
                value={districtCode}
                onChange={setDistrictCode}
                placeholder="Select district"
                searchPlaceholder="Search district…"
                emptyText="No district found"
                disabled={isPending || !stateCode}
                disabledHint={!stateCode ? 'Select a state first' : undefined}
                hasError={!!fe.district}
              />
            </FormField>

            <FormField id="talukCodes" label="Taluks" error={fe.taluks}
              hint={!districtCode ? 'Select a district first' : 'Optional — pick the coverage area, add missing taluks in Settings › Master Data'}>
              <MultiCombobox
                id="talukCodes" name="talukCodes"
                options={talukOptions}
                value={talukCodes}
                onChange={setTalukCodes}
                placeholder="Select taluks"
                searchPlaceholder="Search taluk…"
                emptyText="No taluk found"
                disabled={isPending || !districtCode}
                disabledHint={!districtCode ? 'Select a district first' : undefined}
                hasError={!!fe.taluks}
              />
            </FormField>

            <FormField id="pincodeCode" label="Pincode" error={fe.pincode}
              hint={!talukCodes.length ? 'Select a taluk first' : 'Optional — add missing pincodes in Settings › Master Data'}>
              <Combobox
                id="pincodeCode" name="pincodeCode"
                options={pincodeOptions}
                value={pincodeCode}
                onChange={setPincodeCode}
                placeholder="Select pincode"
                searchPlaceholder="Search pincode…"
                emptyText="No pincode found"
                disabled={isPending || !talukCodes.length}
                disabledHint={!talukCodes.length ? 'Select a taluk first' : undefined}
                hasError={!!fe.pincode}
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

          <FormField id="businessCategory" label="Business Category" required error={fe.businessCategory}>
            <select
              id="businessCategory" name="businessCategory"
              value={businessCategory}
              onChange={(e) => handleBusinessCategoryChange(e.target.value)}
              disabled={isPending}
              className={selectClass(!!fe.businessCategory)}
            >
              <option value="">Select category…</option>
              {businessCategoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField id="businessSubCategoryTop" label="Sub-Category" required error={fe.businessSubCategory}
            hint={!businessCategory ? 'Select a business category first' : undefined}>
            <select
              id="businessSubCategoryTop" name="businessSubCategory"
              value={businessSubCategory}
              onChange={(e) => setBusinessSubCategory(e.target.value)}
              disabled={isPending || !businessCategory}
              className={selectClass(!!fe.businessSubCategory)}
            >
              <option value="">Select sub-category…</option>
              {businessSubCategoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField id="product" label="Product / Service" required error={fe.product}
            hint={!businessCategory ? 'Select a business category first' : undefined}>
            <select
              id="product" name="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              disabled={isPending || !businessCategory}
              className={selectClass(!!fe.product)}
            >
              <option value="">Select product…</option>
              {productOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField id="category" label="Category" required error={fe.category}
            hint={!businessCategory ? 'Select a business category first' : undefined}>
            <select
              id="category" name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isPending || !businessCategory}
              className={selectClass(!!fe.category)}
            >
              <option value="">Select category…</option>
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
