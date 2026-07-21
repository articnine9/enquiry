'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { UserCheck, X, AlertCircle, Loader2 } from 'lucide-react'
import { assignEnquiry } from '../actions/enquiry.actions'
import { SubmitButton } from '@/components/forms/SubmitButton'
import { cn } from '@/lib/utils'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StaffOption {
  id:            string
  name:          string
  email:         string
  loadPercent:   number
  isOverloaded:  boolean
  zoneMatch:     boolean
}

interface AssignStaffModalProps {
  enquiry:     EnquiryDocument
  staffList:   StaffOption[]
  isLoading?:  boolean
  onClose:     () => void
  onAssigned:  (enquiry: EnquiryDocument) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AssignStaffModal({
  enquiry,
  staffList,
  isLoading = false,
  onClose,
  onAssigned,
}: AssignStaffModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const enquiryId = String(enquiry._id)

  const [state, formAction, isPending] = useActionState(assignEnquiry, null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    if (!state) return
    if ((state as { ok: boolean }).ok) {
      toast.success('Enquiry assigned')
      onAssigned((state as unknown as { data: EnquiryDocument }).data)
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
      className="rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0 max-w-lg w-full m-auto backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Assign Staff</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {enquiry.enquiryNo} · {enquiry.customerName}
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
        <input type="hidden" name="enquiryId" value={enquiryId} />

        {/* Staff list */}
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Select staff member
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              Loading staff…
            </div>
          ) : staffList.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              No active staff members available.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {staffList.map((staff) => (
                <label
                  key={staff.id}
                  className={cn(
                    'flex items-center gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                    'has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50 dark:has-[:checked]:border-blue-600 dark:has-[:checked]:bg-blue-900/20',
                    staff.isOverloaded
                      ? 'border-red-200 dark:border-red-800 opacity-70'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  )}
                >
                  <input
                    type="radio"
                    name="staffId"
                    value={staff.id}
                    required
                    disabled={staff.isOverloaded}
                    className="text-blue-600 focus:ring-blue-500"
                  />

                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {staff.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {staff.name}
                      </span>
                      {staff.zoneMatch && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Zone match
                        </span>
                      )}
                      {staff.isOverloaded && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Overloaded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{staff.email}</p>
                  </div>

                  {/* Load bar */}
                  <div className="flex-shrink-0 w-14 text-right">
                    <div className="text-xs font-medium mb-0.5 text-slate-500 dark:text-slate-400">
                      {staff.loadPercent}%
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          staff.loadPercent >= 100
                            ? 'bg-red-500'
                            : staff.loadPercent >= 70
                              ? 'bg-amber-400'
                              : 'bg-green-500'
                        )}
                        style={{ width: `${Math.min(staff.loadPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Reason <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={2}
            placeholder="Why is this staff member being assigned?"
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
            label="Assign"
            loadingLabel="Assigning…"
            icon={<UserCheck className="w-4 h-4" />}
            disabled={staffList.length === 0}
          />
        </div>
      </form>
    </dialog>
  )
}
