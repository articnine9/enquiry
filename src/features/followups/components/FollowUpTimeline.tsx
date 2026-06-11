'use client'

import { useEffect } from 'react'
import { Plus, CalendarDays, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import FollowUpCard  from './FollowUpCard'
import FollowUpModal from './FollowUpModal'
import {
  useFollowUpStore,
  useFollowUpsForEnquiry,
} from '@/store/followup.store'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'
import { FollowUpStatus } from '@/types/enums'
import { formatDate } from '@/lib/utils'

// ── Props ─────────────────────────────────────────────────────────────────────

interface FollowUpTimelineProps {
  enquiryId:     string
  initialItems:  FollowUpDocument[]
  canCreate?:    boolean
  canEdit?:      boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FollowUpTimeline({
  enquiryId,
  initialItems,
  canCreate = true,
  canEdit   = true,
}: FollowUpTimelineProps) {
  const { setForEnquiry, openCreate } = useFollowUpStore()
  const followUps = useFollowUpsForEnquiry(enquiryId)

  // Hydrate store from server-fetched data on mount
  useEffect(() => {
    setForEnquiry(enquiryId, initialItems)
  }, [enquiryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const open      = followUps.filter((f) => f.status === FollowUpStatus.Scheduled)
  const closed    = followUps.filter((f) => f.status !== FollowUpStatus.Scheduled)
  const nextOpen  = open
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]

  return (
    <>
      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatChip
          icon={<Clock className="w-4 h-4 text-blue-500" />}
          label="Scheduled"
          value={open.length}
        />
        <StatChip
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
          label="Completed"
          value={closed.filter((f) => f.status === FollowUpStatus.Completed).length}
        />
        <StatChip
          icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
          label="Overdue"
          value={open.filter(
            (f) => f.scheduledAt && new Date(f.scheduledAt) < new Date()
          ).length}
        />
      </div>

      {/* ── Next follow-up banner ──────────────────────────────────────────── */}
      {nextOpen && (
        <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-sm">
          <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-blue-700 dark:text-blue-300">
            Next follow-up:{' '}
            <span className="font-semibold">{formatDate(nextOpen.scheduledAt)}</span>
          </span>
        </div>
      )}

      {/* ── Header + new button ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          History
          {followUps.length > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              {followUps.length} total
            </span>
          )}
        </h3>
        {canCreate && (
          <button
            type="button"
            onClick={() => openCreate(enquiryId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Follow-up
          </button>
        )}
      </div>

      {/* ── Timeline list ──────────────────────────────────────────────────── */}
      {followUps.length === 0 ? (
        <EmptyState onAdd={canCreate ? () => openCreate(enquiryId) : undefined} />
      ) : (
        <div className="ml-3">
          {followUps.map((fu, idx) => (
            <FollowUpCard
              key={String(fu._id)}
              followUp={fu}
              isLast={idx === followUps.length - 1}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Global modal (portal is handled by the dialog element itself) */}
      <FollowUpModal />
    </>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatChip({
  icon, label, value,
}: {
  icon: React.ReactNode; label: string; value: number
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
      {icon}
      <div>
        <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
      <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No follow-ups yet</p>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Schedule the first one
        </button>
      )}
    </div>
  )
}
