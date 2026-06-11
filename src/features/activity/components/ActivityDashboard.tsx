'use client'

import dynamic from 'next/dynamic'
import { UserRole } from '@/types/enums'
import { cn } from '@/lib/utils'

// ── Lazy-load heavy widgets (each fetches its own data) ───────────────────────

const DailyStatsGrid   = dynamic(() => import('./DailyStatsGrid'),   { ssr: false })
const ProductivityChart = dynamic(() => import('./ProductivityChart'), { ssr: false })
const StaffLeaderboard  = dynamic(() => import('./StaffLeaderboard'),  { ssr: false })
const ActivityFeedList  = dynamic(() => import('./ActivityFeedList'),  { ssr: false })
const TeamSummaryPanel  = dynamic(() => import('./TeamSummaryPanel'),  { ssr: false })
const SessionTracker    = dynamic(() => import('./SessionTracker'),    { ssr: false })

// ── Props ─────────────────────────────────────────────────────────────────────

interface ActivityDashboardProps {
  /** The logged-in user's ID — used to scope stats/feed to themselves when Staff */
  userId:     string
  /** Role governs which panels are visible */
  role:       UserRole
  /** ISO string for current session's login time — drives SessionTracker clock */
  sessionLoginAt?: string
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityDashboard({
  userId,
  role,
  sessionLoginAt,
  className,
}: ActivityDashboardProps) {
  const isStaff   = role === UserRole.Staff
  const isManager = role === UserRole.Manager || role === UserRole.SuperAdmin

  // Staff see their own stats; managers/admins can see all staff
  const ownStaffId = isStaff ? userId : undefined

  return (
    <div className={cn('space-y-6', className)}>

      {/* ── Row 1: Session + Daily stats ─────────────────────────────────── */}
      <div className="space-y-4">
        {sessionLoginAt && (
          <SessionTracker loginAt={sessionLoginAt} />
        )}
        <DailyStatsGrid staffId={ownStaffId} />
      </div>

      {/* ── Row 2: Productivity chart (full width) ───────────────────────── */}
      <ProductivityChart staffId={ownStaffId} />

      {/* ── Row 3: Team summary (managers only) ──────────────────────────── */}
      {isManager && (
        <TeamSummaryPanel />
      )}

      {/* ── Row 4: Leaderboard + Feed side-by-side ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard only visible to managers/admins */}
        {isManager ? (
          <StaffLeaderboard />
        ) : (
          // Staff see a narrower feed that spans both columns on small screens
          <div className="lg:col-span-2">
            <ActivityFeedList
              staffId={userId}
              hours={24}
              limit={30}
            />
          </div>
        )}

        {isManager && (
          <ActivityFeedList
            hours={24}
            limit={50}
          />
        )}
      </div>

    </div>
  )
}
