import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  SuperAdminDashboardData,
  ManagerDashboardData,
  StaffDashboardData,
} from '@/features/dashboard/actions/dashboard.actions'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

// ── State ─────────────────────────────────────────────────────────────────────

interface DashboardState {
  superAdmin:        SuperAdminDashboardData | null
  manager:           ManagerDashboardData   | null
  staff:             StaffDashboardData     | null

  superAdminLoading: LoadState
  managerLoading:    LoadState
  staffLoading:      LoadState

  superAdminError:   string | null
  managerError:      string | null
  staffError:        string | null

  // Manager period filter
  managerDateFrom:   string    // ISO date string
  managerDateTo:     string

  // Trend days for superadmin chart
  trendDays: number
}

interface DashboardActions {
  setSuperAdmin(data: SuperAdminDashboardData): void
  setManager(data: ManagerDashboardData): void
  setStaff(data: StaffDashboardData): void

  setSuperAdminLoading(state: LoadState, error?: string): void
  setManagerLoading(state: LoadState, error?: string): void
  setStaffLoading(state: LoadState, error?: string): void

  setManagerDateRange(from: string, to: string): void
  setTrendDays(days: number): void
}

export type DashboardStore = DashboardState & DashboardActions

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().slice(0, 10) }

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDashboardStore = create<DashboardStore>()(
  immer((set) => ({
    superAdmin:        null,
    manager:           null,
    staff:             null,

    superAdminLoading: 'idle',
    managerLoading:    'idle',
    staffLoading:      'idle',

    superAdminError:   null,
    managerError:      null,
    staffError:        null,

    managerDateFrom:   todayISO(),
    managerDateTo:     todayISO(),

    trendDays: 30,

    setSuperAdmin(data) {
      set((s) => { s.superAdmin = data })
    },
    setManager(data) {
      set((s) => { s.manager = data })
    },
    setStaff(data) {
      set((s) => { s.staff = data })
    },

    setSuperAdminLoading(state, error) {
      set((s) => { s.superAdminLoading = state; s.superAdminError = error ?? null })
    },
    setManagerLoading(state, error) {
      set((s) => { s.managerLoading = state; s.managerError = error ?? null })
    },
    setStaffLoading(state, error) {
      set((s) => { s.staffLoading = state; s.staffError = error ?? null })
    },

    setManagerDateRange(from, to) {
      set((s) => { s.managerDateFrom = from; s.managerDateTo = to })
    },

    setTrendDays(days) {
      set((s) => { s.trendDays = days })
    },
  }))
)

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useSuperAdminDash  = () => useDashboardStore((s) => s.superAdmin)
export const useManagerDash     = () => useDashboardStore((s) => s.manager)
export const useStaffDash       = () => useDashboardStore((s) => s.staff)
