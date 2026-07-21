'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, UserCheck } from 'lucide-react'
import dynamic from 'next/dynamic'
import { getStaffForAssignmentAction, type StaffAssignOption } from '../actions/enquiry.actions'
import { UserRole, EnquiryStatus } from '@/types/enums'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'

const StatusUpdateModal = dynamic(() => import('./StatusUpdateModal'), { ssr: false })
const AssignStaffModal  = dynamic(() => import('./AssignStaffModal'),  { ssr: false })

interface Props {
  enquiry:  EnquiryDocument
  userRole: UserRole
}

export default function EnquiryDetailActions({ enquiry, userRole }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<'status' | 'assign' | null>(null)
  const [staffList,    setStaffList]    = useState<StaffAssignOption[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)

  const canChangeStatus = enquiry.status !== EnquiryStatus.Closed &&
                          enquiry.status !== EnquiryStatus.Cancelled

  const canAssign = (userRole === UserRole.SuperAdmin || userRole === UserRole.Manager) &&
                    enquiry.status !== EnquiryStatus.Closed &&
                    enquiry.status !== EnquiryStatus.Cancelled

  if (!canChangeStatus && !canAssign) return null

  async function openAssignModal() {
    setModal('assign')
    setLoadingStaff(true)
    const r = await getStaffForAssignmentAction(String(enquiry._id))
    if (r.ok) setStaffList(r.data)
    setLoadingStaff(false)
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Actions</h2>

        {canChangeStatus && (
          <button
            type="button"
            onClick={() => setModal('status')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            Update Status
          </button>
        )}

        {canAssign && (
          <button
            type="button"
            onClick={openAssignModal}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-slate-400" />
            Assign Staff
          </button>
        )}
      </div>

      {modal === 'status' && (
        <StatusUpdateModal
          enquiry={enquiry}
          onClose={() => setModal(null)}
          onUpdated={() => { setModal(null); router.refresh() }}
        />
      )}

      {modal === 'assign' && (
        <AssignStaffModal
          enquiry={enquiry}
          staffList={staffList}
          isLoading={loadingStaff}
          onClose={() => setModal(null)}
          onAssigned={() => { setModal(null); router.refresh() }}
        />
      )}
    </>
  )
}
