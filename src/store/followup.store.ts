/**
 * Follow-up store
 *
 * Manages:
 *  - followUps[enquiryId]   — loaded history per enquiry
 *  - upcoming               — across-enquiry list for the reminder panel
 *  - modal state            — create / edit drawer
 *  - pending set            — in-flight mutations
 */

import { create } from 'zustand'
import { castDraft } from 'immer'
import { immer } from 'zustand/middleware/immer'
import { FollowUpStatus } from '@/types/enums'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'

// ── Types ─────────────────────────────────────────────────────────────────────

type FU = FollowUpDocument

export type ModalMode = 'create' | 'edit' | 'close' | null

interface ModalState {
  mode:      ModalMode
  enquiryId: string | null  // pre-filled on create
  followUp:  FU | null      // pre-filled on edit/close
}

interface FollowUpState {
  // Per-enquiry loaded history, newest first
  byEnquiry:  Record<string, FU[]>
  // Upcoming / reminder panel items
  upcoming:   FU[]
  overdue:    FU[]
  // Modal
  modal:      ModalState
  // Mutations in flight
  pending:    Set<string>
}

interface FollowUpActions {
  // Load
  setForEnquiry(enquiryId: string, items: FU[]): void
  setUpcoming(items: FU[]): void
  setOverdue(items: FU[]): void

  // Optimistic CRUD
  optimisticAdd(enquiryId: string, item: FU): void
  optimisticUpdate(id: string, enquiryId: string, patch: Partial<FU>): void
  optimisticClose(id: string, enquiryId: string, status: FollowUpStatus): void
  optimisticDismissReminder(id: string): void
  revertEnquiry(enquiryId: string, prev: FU[]): void

  // Modal
  openCreate(enquiryId: string): void
  openEdit(followUp: FU): void
  openClose(followUp: FU): void
  closeModal(): void

  // Pending
  setPending(id: string, value: boolean): void

  // Selectors
  getForEnquiry(enquiryId: string): FU[]
  getOpen(enquiryId: string): FU[]
  getNext(enquiryId: string): FU | undefined
}

export type FollowUpStore = FollowUpState & FollowUpActions

// ── Store ─────────────────────────────────────────────────────────────────────

export const useFollowUpStore = create<FollowUpStore>()(
  immer((set, get) => ({

    // ── State ────────────────────────────────────────────────────────────────
    byEnquiry: {},
    upcoming:  [],
    overdue:   [],
    modal:     { mode: null, enquiryId: null, followUp: null },
    pending:   new Set<string>(),

    // ── Load ─────────────────────────────────────────────────────────────────

    setForEnquiry(enquiryId, items) {
      set((s) => { s.byEnquiry[enquiryId] = castDraft(items) })
    },

    setUpcoming(items) {
      set((s) => { s.upcoming = castDraft(items) })
    },

    setOverdue(items) {
      set((s) => { s.overdue = castDraft(items) })
    },

    // ── Optimistic mutations ─────────────────────────────────────────────────

    /** Prepend a new follow-up to the top of the enquiry list. */
    optimisticAdd(enquiryId, item) {
      set((s) => {
        if (!s.byEnquiry[enquiryId]) s.byEnquiry[enquiryId] = []
        s.byEnquiry[enquiryId].unshift(castDraft(item))
      })
    },

    /** Patch fields on an existing follow-up in place. */
    optimisticUpdate(id, enquiryId, patch) {
      set((s) => {
        const list = s.byEnquiry[enquiryId]
        if (!list) return
        const idx = list.findIndex((f) => String(f._id) === id)
        if (idx !== -1) Object.assign(s.byEnquiry[enquiryId][idx], patch)

        // Also patch upcoming list
        const ui = s.upcoming.findIndex((f) => String(f._id) === id)
        if (ui !== -1) Object.assign(s.upcoming[ui], patch)
      })
    },

    /** Mark a follow-up as closed/completed/cancelled/missed. */
    optimisticClose(id, enquiryId, status) {
      set((s) => {
        const list = s.byEnquiry[enquiryId]
        if (!list) return
        const idx = list.findIndex((f) => String(f._id) === id)
        if (idx !== -1) {
          s.byEnquiry[enquiryId][idx].status     = status
          s.byEnquiry[enquiryId][idx].completedAt = new Date()
        }
        // Remove from upcoming / overdue
        s.upcoming = s.upcoming.filter((f) => String(f._id) !== id)
        s.overdue  = s.overdue.filter((f)  => String(f._id) !== id)
      })
    },

    /** Hide reminder badge immediately on dismiss. */
    optimisticDismissReminder(id) {
      set((s) => {
        for (const list of Object.values(s.byEnquiry)) {
          const item = list.find((f) => String(f._id) === id)
          if (item) { item.reminderDismissed = true; break }
        }
        const u = s.upcoming.find((f) => String(f._id) === id)
        if (u) u.reminderDismissed = true
      })
    },

    /** Restore a previous snapshot if a mutation fails. */
    revertEnquiry(enquiryId, prev) {
      set((s) => { s.byEnquiry[enquiryId] = castDraft(prev) })
    },

    // ── Modal ────────────────────────────────────────────────────────────────

    openCreate(enquiryId) {
      set((s) => {
        s.modal = { mode: 'create', enquiryId, followUp: null }
      })
    },

    openEdit(followUp) {
      set((s) => {
        s.modal = {
          mode:      'edit',
          enquiryId: String(followUp.enquiryId),
          followUp:  castDraft(followUp),
        }
      })
    },

    openClose(followUp) {
      set((s) => {
        s.modal = {
          mode:      'close',
          enquiryId: String(followUp.enquiryId),
          followUp:  castDraft(followUp),
        }
      })
    },

    closeModal() {
      set((s) => {
        s.modal = { mode: null, enquiryId: null, followUp: null }
      })
    },

    // ── Pending ──────────────────────────────────────────────────────────────

    setPending(id, value) {
      set((s) => {
        if (value) s.pending.add(id)
        else        s.pending.delete(id)
      })
    },

    // ── Selectors ────────────────────────────────────────────────────────────

    getForEnquiry(enquiryId) {
      return get().byEnquiry[enquiryId] ?? []
    },

    getOpen(enquiryId) {
      return (get().byEnquiry[enquiryId] ?? []).filter(
        (f) => f.status === FollowUpStatus.Scheduled
      )
    },

    getNext(enquiryId) {
      return (get().byEnquiry[enquiryId] ?? [])
        .filter((f) => f.status === FollowUpStatus.Scheduled)
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        )[0]
    },

  }))
)

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useFollowUpsForEnquiry = (enquiryId: string) =>
  useFollowUpStore((s) => s.getForEnquiry(enquiryId))

export const useOpenFollowUps = (enquiryId: string) =>
  useFollowUpStore((s) => s.getOpen(enquiryId))

export const useNextFollowUp = (enquiryId: string) =>
  useFollowUpStore((s) => s.getNext(enquiryId))

export const useFollowUpModal = () =>
  useFollowUpStore((s) => ({ modal: s.modal, closeModal: s.closeModal }))

export const useFollowUpPending = (id: string) =>
  useFollowUpStore((s) => s.pending.has(id))
