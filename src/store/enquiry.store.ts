import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'
import type { EnquiryFilterInput } from '@/features/enquiries/validations/enquiry.schema'
import type { PaginatedResult } from '@/types/api'

// ── Filter defaults ───────────────────────────────────────────────────────────

export const DEFAULT_FILTERS: Partial<EnquiryFilterInput> = {
  page:      1,
  pageSize:  20,
  sortBy:    'createdAt',
  sortOrder: 'desc',
}

// ── State shape ───────────────────────────────────────────────────────────────

interface EnquiryState {
  // Server data mirror (populated after RSC fetch / action return)
  result:     PaginatedResult<EnquiryDocument> | null

  // Currently selected enquiry (detail panel / edit sheet)
  selectedId: string | null
  selected:   EnquiryDocument | null

  // Active filters (persisted to localStorage — search is excluded from persist)
  filters: Partial<EnquiryFilterInput>

  // Ids with in-flight server mutations (used to show row-level spinners)
  pending: Set<string>

  // ── Actions ───────────────────────────────────────────────────────────────

  // Seed the store from an RSC-fetched result
  setResult:  (result: PaginatedResult<EnquiryDocument>) => void

  // Selection
  setSelected: (id: string | null, doc?: EnquiryDocument | null) => void

  // Optimistic update — patches a row in result.data before the server confirms
  optimisticUpdate: (id: string, patch: Partial<EnquiryDocument>) => void

  // Optimistic remove (marks status = cancelled locally)
  optimisticRemove: (id: string) => void

  // Filter management
  setFilter:    <K extends keyof EnquiryFilterInput>(key: K, value: EnquiryFilterInput[K]) => void
  setFilters:   (filters: Partial<EnquiryFilterInput>) => void
  resetFilters: () => void

  // Pending state (row-level loading indicator)
  setPending: (id: string, value: boolean) => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useEnquiryStore = create<EnquiryState>()(
  persist(
    immer((set) => ({
      result:     null,
      selectedId: null,
      selected:   null,
      filters:    { ...DEFAULT_FILTERS },
      pending:    new Set<string>(),

      // ── Setters ─────────────────────────────────────────────────────────────

      setResult: (result) =>
        set((s) => { s.result = result }),

      setSelected: (id, doc = null) =>
        set((s) => {
          s.selectedId = id
          s.selected   = doc ?? (
            id
              ? (s.result?.data.find((e) => String(e._id) === id) ?? null)
              : null
          )
        }),

      // ── Optimistic mutations ─────────────────────────────────────────────────

      optimisticUpdate: (id, patch) =>
        set((s) => {
          if (!s.result) return
          const idx = s.result.data.findIndex((e) => String(e._id) === id)
          if (idx !== -1) Object.assign(s.result.data[idx], patch)
          // Also update selected if it's the same enquiry
          if (s.selectedId === id && s.selected) {
            Object.assign(s.selected, patch)
          }
        }),

      optimisticRemove: (id) =>
        set((s) => {
          if (!s.result) return
          s.result.data  = s.result.data.filter((e) => String(e._id) !== id)
          s.result.total = Math.max(0, s.result.total - 1)
          if (s.selectedId === id) {
            s.selectedId = null
            s.selected   = null
          }
        }),

      // ── Filters ─────────────────────────────────────────────────────────────

      setFilter: (key, value) =>
        set((s) => {
          s.filters = { ...s.filters, [key]: value, page: 1 }
        }),

      setFilters: (filters) =>
        set((s) => {
          s.filters = { ...s.filters, ...filters, page: 1 }
        }),

      resetFilters: () =>
        set((s) => { s.filters = { ...DEFAULT_FILTERS } }),

      // ── Pending ─────────────────────────────────────────────────────────────

      setPending: (id, value) =>
        set((s) => {
          if (value) s.pending.add(id)
          else       s.pending.delete(id)
        }),
    })),
    {
      name: 'ems-enquiry-store',
      // Only persist the filters (not the data or selection state)
      partialize: (s) => ({
        filters: {
          ...s.filters,
          search: undefined, // never persist the search term
          page:   1,         // always reset page on reload
        },
      }),
    }
  )
)
