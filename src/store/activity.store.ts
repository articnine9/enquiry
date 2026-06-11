/**
 * Activity store — powers all dashboard widgets.
 *
 * Three logical slices:
 *   myStats   — logged-in user's own daily stats + trend
 *   team      — leaderboard + team summary (managers/admins only)
 *   feed      — real-time activity feed
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  DailyStatsResult,
  LeaderboardEntry,
  ActivityFeedEntry,
  TrendPoint,
  TeamSummary,
  HeatmapPoint,
} from '../features/activity/actions/activity.actions'

// ── Loading state helper ──────────────────────────────────────────────────────

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

// ── Types ─────────────────────────────────────────────────────────────────────

export type PeriodFilter = 'today' | 'week' | 'month'

interface ActivityState {
  // My stats (self-service)
  myStats:       DailyStatsResult | null
  myTrend:       TrendPoint[]
  myHeatmap:     HeatmapPoint[]
  myLoading:     LoadState
  myError:       string | null

  // Team stats (manager/admin)
  leaderboard:      LeaderboardEntry[]
  teamSummary:      TeamSummary | null
  teamPeriod:       PeriodFilter
  teamLoading:      LoadState
  teamError:        string | null

  // Activity feed
  feed:         ActivityFeedEntry[]
  feedLoading:  LoadState
  feedError:    string | null

  // UI filters
  selectedStaffId:  string | null
  trendDays:        number
}

interface ActivityActions {
  // My stats
  setMyStats(stats: DailyStatsResult): void
  setMyTrend(trend: TrendPoint[]): void
  setMyHeatmap(heatmap: HeatmapPoint[]): void
  setMyLoading(state: LoadState, error?: string): void

  // Team stats
  setLeaderboard(entries: LeaderboardEntry[]): void
  setTeamSummary(summary: TeamSummary): void
  setTeamPeriod(period: PeriodFilter): void
  setTeamLoading(state: LoadState, error?: string): void

  // Feed
  setFeed(entries: ActivityFeedEntry[]): void
  prependFeedEntry(entry: ActivityFeedEntry): void
  setFeedLoading(state: LoadState, error?: string): void

  // UI
  setSelectedStaffId(id: string | null): void
  setTrendDays(days: number): void

  // Derived
  getTopPerformer(): LeaderboardEntry | undefined
  getOnlineHours(): number
  getTrendMax(): number
}

export type ActivityStore = ActivityState & ActivityActions

// ── Store ─────────────────────────────────────────────────────────────────────

export const useActivityStore = create<ActivityStore>()(
  immer((set, get) => ({

    // ── State ────────────────────────────────────────────────────────────────
    myStats:    null,
    myTrend:    [],
    myHeatmap:  [],
    myLoading:  'idle',
    myError:    null,

    leaderboard:  [],
    teamSummary:  null,
    teamPeriod:   'today',
    teamLoading:  'idle',
    teamError:    null,

    feed:        [],
    feedLoading: 'idle',
    feedError:   null,

    selectedStaffId: null,
    trendDays:       30,

    // ── My stats ─────────────────────────────────────────────────────────────

    setMyStats(stats) {
      set((s) => { s.myStats = stats })
    },

    setMyTrend(trend) {
      set((s) => { s.myTrend = trend })
    },

    setMyHeatmap(heatmap) {
      set((s) => { s.myHeatmap = heatmap })
    },

    setMyLoading(state, error) {
      set((s) => {
        s.myLoading = state
        s.myError   = error ?? null
      })
    },

    // ── Team stats ────────────────────────────────────────────────────────────

    setLeaderboard(entries) {
      set((s) => { s.leaderboard = entries })
    },

    setTeamSummary(summary) {
      set((s) => { s.teamSummary = summary })
    },

    setTeamPeriod(period) {
      set((s) => { s.teamPeriod = period })
    },

    setTeamLoading(state, error) {
      set((s) => {
        s.teamLoading = state
        s.teamError   = error ?? null
      })
    },

    // ── Feed ─────────────────────────────────────────────────────────────────

    setFeed(entries) {
      set((s) => { s.feed = entries })
    },

    prependFeedEntry(entry) {
      set((s) => {
        s.feed.unshift(entry)
        // Keep feed bounded at 100 entries
        if (s.feed.length > 100) s.feed.pop()
      })
    },

    setFeedLoading(state, error) {
      set((s) => {
        s.feedLoading = state
        s.feedError   = error ?? null
      })
    },

    // ── UI ────────────────────────────────────────────────────────────────────

    setSelectedStaffId(id) {
      set((s) => { s.selectedStaffId = id })
    },

    setTrendDays(days) {
      set((s) => { s.trendDays = days })
    },

    // ── Derived ───────────────────────────────────────────────────────────────

    getTopPerformer() {
      return get().leaderboard[0]
    },

    getOnlineHours() {
      const mins = get().myStats?.totalOnlineMinutes ?? 0
      return Math.round((mins / 60) * 10) / 10
    },

    getTrendMax() {
      const trend = get().myTrend
      if (!trend.length) return 100
      return Math.max(...trend.map((p) => p.productivityScore), 1)
    },

  }))
)

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useMyStats        = () => useActivityStore((s) => s.myStats)
export const useMyTrend        = () => useActivityStore((s) => s.myTrend)
export const useMyHeatmap      = () => useActivityStore((s) => s.myHeatmap)
export const useLeaderboard    = () => useActivityStore((s) => s.leaderboard)
export const useTeamSummary    = () => useActivityStore((s) => s.teamSummary)
export const useActivityFeed   = () => useActivityStore((s) => s.feed)
export const useTeamPeriod     = () => useActivityStore((s) => s.teamPeriod)
export const useOnlineHours    = () => useActivityStore((s) => s.getOnlineHours())
export const useTopPerformer   = () => useActivityStore((s) => s.getTopPerformer())
