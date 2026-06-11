import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EnquiryStatus, EnquiryPriority, EnquiryCategory } from '@/types/enums'

export interface EnquiryFilters {
  search:     string
  status:     EnquiryStatus | ''
  priority:   EnquiryPriority | ''
  category:   EnquiryCategory | ''
  assignedTo: string
  dateFrom:   string
  dateTo:     string
}

const DEFAULT_FILTERS: EnquiryFilters = {
  search:     '',
  status:     '',
  priority:   '',
  category:   '',
  assignedTo: '',
  dateFrom:   '',
  dateTo:     '',
}

interface FilterState {
  enquiryFilters: EnquiryFilters
  setEnquiryFilter: <K extends keyof EnquiryFilters>(key: K, value: EnquiryFilters[K]) => void
  resetEnquiryFilters: () => void
}

export const useFilterStore = create<FilterState>()(
  // persist saves filters to localStorage so they survive page reloads
  persist(
    (set) => ({
      enquiryFilters: DEFAULT_FILTERS,

      setEnquiryFilter: (key, value) =>
        set((s) => ({ enquiryFilters: { ...s.enquiryFilters, [key]: value } })),

      resetEnquiryFilters: () =>
        set({ enquiryFilters: DEFAULT_FILTERS }),
    }),
    {
      name:    'ems-filters',
      // Only persist filter values — not temporary search strings
      partialize: (s) => ({
        enquiryFilters: {
          ...s.enquiryFilters,
          search: '', // don't persist the search term
        },
      }),
    }
  )
)
