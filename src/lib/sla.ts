// Pure SLA computation helpers — no DB, no 'use server'. Safe to import from
// both client and server components (unlike the SLA policy service, which
// touches Mongoose and must stay server-only).

export type SlaStatus = 'on_track' | 'at_risk' | 'breached' | 'paused' | 'met' | 'missed' | 'not_tracked'

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  on_track:    'On Track',
  at_risk:     'At Risk',
  breached:    'Breached',
  paused:      'Paused',
  met:         'Met',
  missed:      'Missed',
  not_tracked: 'Not Tracked',
}

// An open enquiry is flagged "at risk" once less than this fraction of its
// total SLA window remains. Percentage-based (not a fixed offset) so a 4-hour
// Urgent window and a 7-day Low window both flag risk at a sensible point.
export const SLA_AT_RISK_RATIO = 0.2

export function computeSlaDueAt(createdAt: Date, resolutionMinutes: number): Date {
  return new Date(createdAt.getTime() + resolutionMinutes * 60_000)
}

/**
 * Live status for an enquiry's SLA. `slaMet` (frozen at resolution time) wins
 * once set; otherwise status is derived from `now` vs `dueAt`.
 */
export function getSlaStatus(params: {
  createdAt:  Date | string
  dueAt?:     Date | string | null
  slaMet?:    boolean | null
  isClosed:   boolean   // resolved / closed / cancelled — no longer ticking
  isPaused?:  boolean   // status = Paused — clock frozen, due date not yet shifted
  now?:       Date
}): SlaStatus {
  const { slaMet, isClosed } = params
  if (slaMet === true)  return 'met'
  if (slaMet === false) return 'missed'
  if (!params.dueAt) return 'not_tracked'
  if (isClosed) return 'not_tracked' // cancelled (or resolved without a frozen verdict)
  // While paused, `dueAt` hasn't been shifted forward yet (that happens on resume),
  // so comparing it to `now` here would misreport at_risk/breached.
  if (params.isPaused) return 'paused'

  const now       = (params.now ?? new Date()).getTime()
  const createdAt = new Date(params.createdAt).getTime()
  const dueAt     = new Date(params.dueAt).getTime()

  if (now >= dueAt) return 'breached'

  const total     = dueAt - createdAt
  const remaining = dueAt - now
  if (total > 0 && remaining <= total * SLA_AT_RISK_RATIO) return 'at_risk'

  return 'on_track'
}

/** Human-friendly "2h 15m left" / "3h 20m overdue" for the given due date. */
export function formatSlaCountdown(dueAt: Date | string, now: Date = new Date()): string {
  const diffMs   = new Date(dueAt).getTime() - now.getTime()
  const overdue  = diffMs < 0
  const absMs    = Math.abs(diffMs)
  const hours    = Math.floor(absMs / 3_600_000)
  const minutes  = Math.floor((absMs % 3_600_000) / 60_000)

  const parts: string[] = []
  if (hours   > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours === 0) parts.push(`${minutes}m`)

  return overdue ? `${parts.join(' ')} overdue` : `${parts.join(' ')} left`
}
