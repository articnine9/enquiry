// Pure lead-escalation computation — no DB, no 'use server'. Mirrors sla.ts:
// safe to import from both client and server components.
//
// "No action taken" is measured from Enquiry.lastActionAt (bumped on status/
// lead-stage change, assignment, and follow-up activity — see enquiry.actions.ts
// and followup.actions.ts) rather than Mongoose's `updatedAt`, which also gets
// touched by unrelated system-side saves.

export type EscalationTier = 'none' | 'reminder' | 'escalated' | 'reassignment_available'

export const ESCALATION_TIER_LABELS: Record<EscalationTier, string> = {
  none:                    'On Track',
  reminder:                'Reminder Due',
  escalated:               'Escalated',
  reassignment_available:  'Reassignment Available',
}

export const ESCALATION_THRESHOLDS_HOURS = {
  reminder:               24,
  escalated:               48,
  reassignment_available:  72,
} as const

const OPEN_STATUSES = ['new', 'assigned', 'in_progress', 'paused', 'follow_up']

/**
 * Live escalation tier for an assigned, open lead. Returns 'none' for
 * unassigned leads, closed/resolved/cancelled tickets, or leads marked Lost —
 * none of those represent an actionable "stuck lead".
 */
export function getEscalationTier(params: {
  lastActionAt?: Date | string | null
  assignedTo?:   unknown
  status:        string
  leadStage?:    string
  now?:          Date
}): EscalationTier {
  if (!params.assignedTo) return 'none'
  if (!OPEN_STATUSES.includes(params.status)) return 'none'
  if (params.leadStage === 'lost') return 'none'
  if (!params.lastActionAt) return 'none'

  const now           = (params.now ?? new Date()).getTime()
  const lastActionAt  = new Date(params.lastActionAt).getTime()
  const hoursElapsed  = (now - lastActionAt) / 3_600_000

  if (hoursElapsed >= ESCALATION_THRESHOLDS_HOURS.reassignment_available) return 'reassignment_available'
  if (hoursElapsed >= ESCALATION_THRESHOLDS_HOURS.escalated)              return 'escalated'
  if (hoursElapsed >= ESCALATION_THRESHOLDS_HOURS.reminder)               return 'reminder'
  return 'none'
}

/** Human-friendly "26h since last action" for the escalation badge. */
export function formatElapsedSince(lastActionAt: Date | string, now: Date = new Date()): string {
  const diffMs  = now.getTime() - new Date(lastActionAt).getTime()
  const hours   = Math.floor(diffMs / 3_600_000)
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000)

  if (hours > 0) return `${hours}h since last action`
  return `${minutes}m since last action`
}
