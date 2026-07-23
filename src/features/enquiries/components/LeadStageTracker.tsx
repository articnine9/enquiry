'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateLeadStageAction } from '../actions/enquiry.actions'
import { LeadStage, LEAD_STAGE_LABELS, LEAD_STAGE_ORDER, LEAD_STAGE_CONVERTED } from '@/types/enums'

interface LeadStageTrackerProps {
  enquiryId:   string
  stage:       string
  canEdit:     boolean
  isConverted: boolean
}

export function LeadStageTracker({ enquiryId, stage, canEdit, isConverted }: LeadStageTrackerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingStage, setPendingStage] = useState<string | null>(null)
  const [dealValuePrompt, setDealValuePrompt] = useState<string | null>(null)
  const [dealValueInput, setDealValueInput] = useState('')

  const isLost = stage === LeadStage.Lost
  const currentIndex = LEAD_STAGE_ORDER.indexOf(stage as LeadStage)

  function commitStage(next: string, dealValue?: number | null) {
    setPendingStage(next)
    setDealValuePrompt(null)
    startTransition(async () => {
      const r = await updateLeadStageAction(enquiryId, next, dealValue)
      if (!r.ok) { toast.error(r.error); setPendingStage(null); return }
      toast.success(`Lead stage set to ${LEAD_STAGE_LABELS[r.data.leadStage]}`)
      router.refresh()
    })
  }

  function setStage(next: string) {
    if (next === stage || isPending) return

    // First time crossing into a converted stage — ask for the deal value so
    // it feeds Revenue Generated on the Staff performance dashboard.
    if (LEAD_STAGE_CONVERTED.includes(next as LeadStage) && !isConverted) {
      setDealValueInput('')
      setDealValuePrompt(next)
      return
    }

    commitStage(next)
  }

  return (
    <div className="space-y-3">
      <div className={cn('flex items-center gap-1 overflow-x-auto pb-1', isLost && 'opacity-50')}>
        {LEAD_STAGE_ORDER.map((s, i) => {
          const isCurrent = !isLost && s === stage
          const isPast    = !isLost && currentIndex >= 0 && i < currentIndex
          const isBusy    = isPending && pendingStage === s

          return (
            <button
              key={s}
              type="button"
              disabled={!canEdit || isPending}
              onClick={() => setStage(s)}
              title={LEAD_STAGE_LABELS[s]}
              className={cn(
                'flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border',
                canEdit && !isPending && 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600',
                !canEdit && 'cursor-default',
                isCurrent
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : isPast
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              )}
            >
              {isBusy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isPast ? (
                <Check className="w-3 h-3" />
              ) : null}
              {LEAD_STAGE_LABELS[s]}
            </button>
          )
        })}
      </div>

      {dealValuePrompt && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2">
          <label htmlFor="dealValue" className="text-xs font-medium text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
            Deal value (₹)
          </label>
          <input
            id="dealValue"
            type="number"
            min={0}
            step="any"
            autoFocus
            value={dealValueInput}
            onChange={(e) => setDealValueInput(e.target.value)}
            placeholder="Optional"
            className="w-28 h-7 px-2 rounded-md border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
          <button
            type="button"
            onClick={() => commitStage(dealValuePrompt, dealValueInput ? Number(dealValueInput) : null)}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => commitStage(dealValuePrompt, null)}
            className="px-2 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => setStage(isLost ? (LEAD_STAGE_ORDER[Math.max(currentIndex, 0)] ?? LeadStage.NewLead) : LeadStage.Lost)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
            isLost
              ? 'bg-red-600 border-red-600 text-white'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:border-red-300 dark:hover:border-red-700'
          )}
        >
          <X className="w-3 h-3" />
          {isLost ? 'Marked as Lost — click to reopen' : 'Mark as Lost'}
        </button>
      )}
    </div>
  )
}
