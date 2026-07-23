import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  ReportFilters,
  ReportType,
  EnquirySummaryData,
  StaffPerformanceData,
  ZonePerformanceData,
  FollowUpReportData,
  ConversionFunnelData,
  MarketingReportData,
  ChannelPerformanceData,
} from '@/features/reports/types/report.types'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

// ── Defaults ──────────────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().slice(0, 10) }

const DEFAULT_FILTERS: ReportFilters = {
  period:   'month',
  dateFrom: todayISO(),
  dateTo:   todayISO(),
}

// ── State ─────────────────────────────────────────────────────────────────────

interface ReportState {
  activeReport: ReportType

  filters: ReportFilters

  // Filter dropdown options (loaded once)
  filterOptions: {
    zones: { _id: string; name: string }[]
    staff: { _id: string; name: string }[]
  }
  optionsLoaded: boolean

  // Report data slices
  enquiry:     EnquirySummaryData     | null
  staff:       StaffPerformanceData   | null
  zone:        ZonePerformanceData    | null
  followup:    FollowUpReportData     | null
  conversion:  ConversionFunnelData   | null
  marketing:   MarketingReportData    | null
  dealer:      ChannelPerformanceData | null
  distributor: ChannelPerformanceData | null

  // Loading / error per report
  loading: Record<ReportType, LoadState>
  error:   Record<ReportType, string | null>
}

interface ReportActions {
  setActiveReport(type: ReportType): void
  setFilters(f: Partial<ReportFilters>): void
  resetFilters(): void

  setFilterOptions(opts: ReportState['filterOptions']): void

  setEnquiry(data: EnquirySummaryData): void
  setStaff(data: StaffPerformanceData): void
  setZone(data: ZonePerformanceData): void
  setFollowUp(data: FollowUpReportData): void
  setConversion(data: ConversionFunnelData): void
  setMarketing(data: MarketingReportData): void
  setDealer(data: ChannelPerformanceData): void
  setDistributor(data: ChannelPerformanceData): void

  setLoading(type: ReportType, state: LoadState, error?: string): void

  // Derived
  isLoading(type: ReportType): boolean
  getError(type: ReportType): string | null
}

export type ReportStore = ReportState & ReportActions

// ── Store ─────────────────────────────────────────────────────────────────────

const INIT_LOADING: Record<ReportType, LoadState> = {
  enquiry: 'idle', staff: 'idle', zone: 'idle', followup: 'idle', conversion: 'idle',
  marketing: 'idle', dealer: 'idle', distributor: 'idle',
}
const INIT_ERROR: Record<ReportType, string | null> = {
  enquiry: null, staff: null, zone: null, followup: null, conversion: null,
  marketing: null, dealer: null, distributor: null,
}

export const useReportStore = create<ReportStore>()(
  immer((set, get) => ({
    activeReport: 'enquiry',
    filters:      DEFAULT_FILTERS,
    filterOptions: { zones: [], staff: [] },
    optionsLoaded: false,

    enquiry:     null,
    staff:       null,
    zone:        null,
    followup:    null,
    conversion:  null,
    marketing:   null,
    dealer:      null,
    distributor: null,

    loading: { ...INIT_LOADING },
    error:   { ...INIT_ERROR },

    setActiveReport(type) {
      set((s) => { s.activeReport = type })
    },

    setFilters(f) {
      set((s) => { Object.assign(s.filters, f) })
    },

    resetFilters() {
      set((s) => { s.filters = DEFAULT_FILTERS })
    },

    setFilterOptions(opts) {
      set((s) => { s.filterOptions = opts; s.optionsLoaded = true })
    },

    setEnquiry(data)     { set((s) => { s.enquiry     = data }) },
    setStaff(data)       { set((s) => { s.staff       = data }) },
    setZone(data)        { set((s) => { s.zone        = data }) },
    setFollowUp(data)    { set((s) => { s.followup    = data }) },
    setConversion(data)  { set((s) => { s.conversion  = data }) },
    setMarketing(data)   { set((s) => { s.marketing   = data }) },
    setDealer(data)      { set((s) => { s.dealer      = data }) },
    setDistributor(data) { set((s) => { s.distributor = data }) },

    setLoading(type, state, error) {
      set((s) => {
        s.loading[type] = state
        s.error[type]   = error ?? null
      })
    },

    isLoading(type)  { return get().loading[type] === 'loading' },
    getError(type)   { return get().error[type] },
  }))
)

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useReportFilters      = () => useReportStore((s) => s.filters)
export const useActiveReport       = () => useReportStore((s) => s.activeReport)
export const useReportFilterOpts   = () => useReportStore((s) => s.filterOptions)
export const useEnquiryReport      = () => useReportStore((s) => s.enquiry)
export const useStaffReport        = () => useReportStore((s) => s.staff)
export const useZoneReport         = () => useReportStore((s) => s.zone)
export const useFollowUpReport     = () => useReportStore((s) => s.followup)
export const useConversionReport   = () => useReportStore((s) => s.conversion)
export const useMarketingReport    = () => useReportStore((s) => s.marketing)
export const useDealerReport       = () => useReportStore((s) => s.dealer)
export const useDistributorReport  = () => useReportStore((s) => s.distributor)
