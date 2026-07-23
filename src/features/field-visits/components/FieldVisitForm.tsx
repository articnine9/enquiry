'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MapPin, Camera, Save, Loader2, X, CheckCircle2 } from 'lucide-react'
import { createFieldVisitAction, getDistributorOptionsAction, getDealerOptionsAction, type FieldVisitRow, type OptionRow } from '../actions/fieldVisit.actions'
import { FormField, inputClass, selectClass } from '@/components/forms/FormField'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { cn } from '@/lib/utils'
import { VisitType, VISIT_TYPE_LABELS } from '@/types/enums'
import type { ActionResult } from '@/types/api'

function todayLocal(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const CHANNEL_VISIT_TYPES: VisitType[] = [VisitType.DealerVisit, VisitType.DistributorVisit]

export default function FieldVisitForm() {
  const router = useRouter()

  const [state, formAction] = useActionState(
    createFieldVisitAction as (
      prev: ActionResult<FieldVisitRow> | null,
      fd: FormData
    ) => Promise<ActionResult<FieldVisitRow>>,
    null
  )
  const fe = !state?.ok && state?.fieldErrors ? state.fieldErrors : {}
  const values = !state?.ok ? state?.values as Record<string, unknown> | undefined : undefined

  const [visitType, setVisitType] = useState<VisitType>(
    (values?.visitType as VisitType) ?? VisitType.PoultryFarmVisit
  )
  const isChannelVisit = CHANNEL_VISIT_TYPES.includes(visitType)

  const [distributors, setDistributors] = useState<OptionRow[]>([])
  const [dealers, setDealers] = useState<OptionRow[]>([])
  const [distributorId, setDistributorId] = useState((values?.distributorId as string) ?? '')

  useEffect(() => {
    if (!isChannelVisit) return
    getDistributorOptionsAction().then((r) => { if (r.ok) setDistributors(r.data) })
  }, [isChannelVisit])

  useEffect(() => {
    if (visitType !== VisitType.DealerVisit) { setDealers([]); return }
    getDealerOptionsAction(distributorId || undefined).then((r) => { if (r.ok) setDealers(r.data) })
  }, [visitType, distributorId])

  // ── GPS capture ────────────────────────────────────────────────────────────
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  function captureLocation() {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser')
      return
    }
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      (err) => {
        setGpsError(err.message || 'Could not get your location')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── Photo preview ─────────────────────────────────────────────────────────
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  useEffect(() => {
    if (state?.ok) {
      toast.success('Visit logged')
      router.push(`/field-visits/${state.data._id}`)
    } else if (state && !state.fieldErrors) {
      toast.error(state.error)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={formAction} noValidate className="space-y-5">
      {/* ── Visit type ────────────────────────────────────────────────────── */}
      <FormField id="visitType" label="Visit Type" required error={fe.visitType}>
        <select
          id="visitType" name="visitType"
          value={visitType}
          onChange={(e) => setVisitType(e.target.value as VisitType)}
          className={selectClass(!!fe.visitType)}
        >
          {Object.values(VisitType).map((v) => (
            <option key={v} value={v}>{VISIT_TYPE_LABELS[v]}</option>
          ))}
        </select>
      </FormField>

      {/* ── Visit date ────────────────────────────────────────────────────── */}
      <FormField id="visitDate" label="Visit Date" required error={fe.visitDate}>
        <input
          id="visitDate" name="visitDate" type="date"
          defaultValue={(values?.visitDate as string) ?? todayLocal()}
          className={inputClass(!!fe.visitDate)}
        />
      </FormField>

      {/* ── Customer name ─────────────────────────────────────────────────── */}
      <FormField id="customerName" label="Customer Name" required error={fe.customerName}>
        <input
          id="customerName" name="customerName" type="text"
          defaultValue={values?.customerName as string}
          placeholder="e.g. Sundaram Poultry Farm"
          className={inputClass(!!fe.customerName)}
        />
      </FormField>

      {/* ── Channel linking (Dealer/Distributor visits) ──────────────────── */}
      {isChannelVisit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField id="distributorId" label="Distributor" error={fe.distributorId}>
            <select
              id="distributorId" name="distributorId"
              value={distributorId}
              onChange={(e) => setDistributorId(e.target.value)}
              className={selectClass(!!fe.distributorId)}
            >
              <option value="">Select distributor…</option>
              {distributors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </FormField>

          {visitType === VisitType.DealerVisit && (
            <FormField id="dealerId" label="Dealer" error={fe.dealerId}>
              <select
                id="dealerId" name="dealerId"
                defaultValue={values?.dealerId as string}
                className={selectClass(!!fe.dealerId)}
              >
                <option value="">Select dealer…</option>
                {dealers.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </FormField>
          )}
        </div>
      )}

      {/* ── Notes ─────────────────────────────────────────────────────────── */}
      <FormField id="notes" label="Visit Notes" error={fe.notes}>
        <textarea
          id="notes" name="notes" rows={4}
          defaultValue={values?.notes as string}
          placeholder="What was discussed, condition of the site, next steps…"
          className={cn(inputClass(!!fe.notes), 'resize-y min-h-[96px]')}
        />
      </FormField>

      {/* ── GPS location ──────────────────────────────────────────────────── */}
      <FormField id="gps" label="GPS Location" error={fe.gpsLat ?? fe.gpsLng}>
        <input type="hidden" name="gpsLat" value={gps?.lat ?? ''} />
        <input type="hidden" name="gpsLng" value={gps?.lng ?? ''} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={captureLocation}
            disabled={gpsLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {gpsLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <MapPin className="w-4 h-4 text-slate-400" />}
            {gpsLoading ? 'Getting location…' : gps ? 'Recapture location' : 'Capture current location'}
          </button>
          {gps && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </span>
          )}
        </div>
        {gpsError && <p className="text-xs text-red-500 mt-1">{gpsError}</p>}
      </FormField>

      {/* ── Photo upload ──────────────────────────────────────────────────── */}
      <FormField id="photo" label="Photo" hint="Up to 8 MB" error={fe.photo}>
        {photoPreview ? (
          <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Visit photo preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setPhotoPreview(null)
                const input = document.getElementById('photo') as HTMLInputElement | null
                if (input) input.value = ''
              }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="photo"
            className="flex items-center gap-2 w-40 h-40 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 cursor-pointer flex-col justify-center transition-colors"
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs">Add photo</span>
          </label>
        )}
        <input
          id="photo" name="photo" type="file" accept="image/*" capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </FormField>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <SubmitButton
          label="Log Visit"
          loadingLabel="Saving…"
          icon={<Save className="w-4 h-4" />}
        />
      </div>
    </form>
  )
}
