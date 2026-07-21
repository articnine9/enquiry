import { cache } from 'react'
import dbConnect from '@/lib/db/connection'
import SLAPolicy from '@/lib/db/models/SLAPolicy'

export interface ResolvedSlaPolicy {
  policyId:          string | null
  resolutionMinutes: number
}

// Fallback used only if nothing is seeded/active for a priority at all —
// keeps every enquiry trackable even if an admin hasn't configured every case.
const FALLBACK_RESOLUTION_MINUTES = 1440 // 24h

// Per-request cache (React `cache()`), same rationale as masterData.service.ts:
// stays fresh across requests/admin edits, still deduped within one render.
const loadActivePolicies = cache(async () => {
  await dbConnect()
  return SLAPolicy.find({ isActive: true }).lean()
})

/**
 * Resolve the SLA policy for a priority (+ optional category).
 * Lookup order: exact {priority, category} → {priority, category: null} default
 * → hardcoded fallback (never resolves to nothing).
 */
export async function resolveSlaPolicy(
  priority: string,
  category?: string | null
): Promise<ResolvedSlaPolicy> {
  const policies = await loadActivePolicies()
  const p = priority.trim().toLowerCase()
  const c = category?.trim().toLowerCase()

  const exact = c ? policies.find((row) => row.priority === p && row.category === c) : undefined
  if (exact) return { policyId: String(exact._id), resolutionMinutes: exact.resolutionMinutes }

  const fallbackRow = policies.find((row) => row.priority === p && row.category === null)
  if (fallbackRow) return { policyId: String(fallbackRow._id), resolutionMinutes: fallbackRow.resolutionMinutes }

  return { policyId: null, resolutionMinutes: FALLBACK_RESOLUTION_MINUTES }
}
