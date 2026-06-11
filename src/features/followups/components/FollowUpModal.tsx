'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useFollowUpStore } from '@/store/followup.store'
import FollowUpForm       from './FollowUpForm'
import CloseFollowUpForm  from './CloseFollowUpForm'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'

export default function FollowUpModal() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router    = useRouter()
  const { modal, closeModal, optimisticAdd, optimisticUpdate, optimisticClose } =
    useFollowUpStore()

  const { mode, enquiryId, followUp } = modal

  // Open/close the native dialog in sync with store
  useEffect(() => {
    if (mode) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [mode])

  // Close on backdrop click
  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect()
    if (!rect) return
    if (
      e.clientX < rect.left  || e.clientX > rect.right ||
      e.clientY < rect.top   || e.clientY > rect.bottom
    ) {
      closeModal()
    }
  }

  function handleSuccess(fu: FollowUpDocument) {
    if (mode === 'create') {
      optimisticAdd(String(fu.enquiryId), fu)
    } else if (mode === 'edit') {
      optimisticUpdate(String(fu._id), String(fu.enquiryId), fu)
    } else if (mode === 'close') {
      optimisticClose(String(fu._id), String(fu.enquiryId), fu.status)
    }
    closeModal()
    router.refresh() // revalidate RSC data
  }

  const title =
    mode === 'create' ? 'Schedule Follow-up' :
    mode === 'edit'   ? 'Edit Follow-up'     :
    mode === 'close'  ? 'Close Follow-up'    : ''

  return (
    <dialog
      ref={dialogRef}
      onClose={closeModal}
      onClick={handleDialogClick}
      className="rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0 max-w-lg w-full max-h-[90vh] overflow-y-auto m-auto backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {mode && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={closeModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            {(mode === 'create' || mode === 'edit') && (
              <FollowUpForm
                mode={mode}
                enquiryId={enquiryId ?? undefined}
                followUp={mode === 'edit' ? (followUp ?? undefined) : undefined}
                onSuccess={handleSuccess}
                onCancel={closeModal}
              />
            )}

            {mode === 'close' && followUp && (
              <CloseFollowUpForm
                followUp={followUp}
                onSuccess={handleSuccess}
                onCancel={closeModal}
              />
            )}
          </div>
        </>
      )}
    </dialog>
  )
}
