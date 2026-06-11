/**
 * Assignment store — manages:
 *   - assignment history keyed by enquiryId
 *   - active assignment per enquiry (derived from history)
 *   - zone workload summary for the assign modal
 *   - in-flight pending set for optimistic feedback
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { AssignmentStatus } from '@/types/assignment.types'
import type { AssignmentHistoryItem } from '@/types/assignment.types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZoneWorkloadEntry {
  zoneId:      string
  zoneName:    string
  staffCount:  number
  totalLoad:   number
  maxCapacity: number
  utilizationPct: number  // computed
}

interface AssignmentState {
  // history[enquiryId] → all assignments for that enquiry, newest first
  history:  Record<string, AssignmentHistoryItem[]>
  // Zone workload for the assign-staff modal
  zoneWorkload: ZoneWorkloadEntry[]
  // IDs of enquiries whose assignment is currently being mutated
  pending:  Set<string>
  // UI: which enquiry's history panel is open
  openHistoryId: string | null
}

interface AssignmentActions {
  // History management
  setHistory(enquiryId: string, items: AssignmentHistoryItem[]): void
  prependHistory(enquiryId: string, item: AssignmentHistoryItem): void
  clearHistory(enquiryId: string): void

  // Optimistic updates
  optimisticAssign(enquiryId: string, draft: AssignmentHistoryItem): void
  optimisticRelease(enquiryId: string): void

  // Zone workload
  setZoneWorkload(entries: Omit<ZoneWorkloadEntry, 'utilizationPct'>[]): void

  // Pending state
  setPending(enquiryId: string, value: boolean): void

  // UI
  setOpenHistory(enquiryId: string | null): void

  // Derived helpers (called on the slice, not stored in state)
  getActive(enquiryId: string): AssignmentHistoryItem | undefined
  getHistory(enquiryId: string): AssignmentHistoryItem[]
}

export type AssignmentStore = AssignmentState & AssignmentActions

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAssignmentStore = create<AssignmentStore>()(
  immer((set, get) => ({
    // ── Initial state ────────────────────────────────────────────────────────
    history:       {},
    zoneWorkload:  [],
    pending:       new Set<string>(),
    openHistoryId: null,

    // ── History management ───────────────────────────────────────────────────

    setHistory(enquiryId, items) {
      set((s) => {
        s.history[enquiryId] = items
      })
    },

    prependHistory(enquiryId, item) {
      set((s) => {
        if (!s.history[enquiryId]) s.history[enquiryId] = []
        s.history[enquiryId].unshift(item)
      })
    },

    clearHistory(enquiryId) {
      set((s) => {
        delete s.history[enquiryId]
      })
    },

    // ── Optimistic mutations ─────────────────────────────────────────────────

    /**
     * Immediately reflect a new assignment in the store before the server
     * responds.  Marks any existing Active assignment as Superseded.
     */
    optimisticAssign(enquiryId, draft) {
      set((s) => {
        const existing = s.history[enquiryId] ?? []

        // Supersede the current active entry
        const updated = existing.map((a) =>
          a.status === AssignmentStatus.Active
            ? { ...a, status: AssignmentStatus.Superseded, releasedAt: new Date().toISOString() }
            : a
        )

        s.history[enquiryId] = [{ ...draft, status: AssignmentStatus.Active }, ...updated]
      })
    },

    /**
     * Optimistically mark active assignment as Released.
     */
    optimisticRelease(enquiryId) {
      set((s) => {
        const existing = s.history[enquiryId] ?? []
        s.history[enquiryId] = existing.map((a) =>
          a.status === AssignmentStatus.Active
            ? { ...a, status: AssignmentStatus.Released, releasedAt: new Date().toISOString() }
            : a
        )
      })
    },

    // ── Zone workload ────────────────────────────────────────────────────────

    setZoneWorkload(entries) {
      set((s) => {
        s.zoneWorkload = entries.map((e) => ({
          ...e,
          utilizationPct:
            e.maxCapacity > 0
              ? Math.round((e.totalLoad / e.maxCapacity) * 100)
              : 0,
        }))
      })
    },

    // ── Pending ──────────────────────────────────────────────────────────────

    setPending(enquiryId, value) {
      set((s) => {
        if (value) s.pending.add(enquiryId)
        else        s.pending.delete(enquiryId)
      })
    },

    // ── UI ───────────────────────────────────────────────────────────────────

    setOpenHistory(enquiryId) {
      set((s) => {
        s.openHistoryId = enquiryId
      })
    },

    // ── Derived ──────────────────────────────────────────────────────────────

    getActive(enquiryId) {
      return get()
        .history[enquiryId]
        ?.find((a) => a.status === AssignmentStatus.Active)
    },

    getHistory(enquiryId) {
      return get().history[enquiryId] ?? []
    },
  }))
)

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useActiveAssignment = (enquiryId: string) =>
  useAssignmentStore((s) => s.getActive(enquiryId))

export const useAssignmentHistory = (enquiryId: string) =>
  useAssignmentStore((s) => s.getHistory(enquiryId))

export const useIsAssignPending = (enquiryId: string) =>
  useAssignmentStore((s) => s.pending.has(enquiryId))

export const useZoneWorkload = () =>
  useAssignmentStore((s) => s.zoneWorkload)
