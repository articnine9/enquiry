'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
  Loader2, AlertTriangle, CalendarClock, Phone, Mail, MapPin,
  MessageCircle, Users, Clock, AlarmClock, CheckCircle2, XCircle,
  Pencil, Bell, BellOff, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { listFollowUpsAction, dismissReminderAction } from '@/features/followups/actions/followup.actions'
import { FollowUpStatusBadge } from '@/features/followups/components/FollowUpStatusBadge'
import { toast } from 'sonner'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { FollowUpType, FollowUpStatus, FOLLOW_UP_TYPE_LABELS, UserRole } from '@/types/enums'
import type { FollowUpDocument } from '@/lib/db/models/FollowUp'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'today' | 'overdue' | 'upcoming' | 'all'

interface PopulatedFollowUp extends Omit<FollowUpDocument, '_id' | 'enquiryId' | 'createdBy'> {
  _id: string
  enquiryId: { _id: string; enquiryNo: string; customerName: string } | string
  createdBy: { _id: string; name: string } | string
}

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; emptyText: string }[] = [
  { id: 'today',    label: 'Today',    emptyText: 'No follow-ups scheduled for today' },
  { id: 'overdue',  label: 'Overdue',  emptyText: 'No overdue follow-ups — all caught up!' },
  { id: 'upcoming', label: 'Upcoming', emptyText: 'No upcoming follow-ups scheduled'   },
  { id: 'all',      label: 'All',      emptyText: 'No follow-ups found'                },
]

// ── Type icon ─────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<FollowUpType, { icon: React.ElementType; cls: string }> = {
  [FollowUpType.Call]:    { icon: Phone,         cls: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' },
  [FollowUpType.Email]:   { icon: Mail,          cls: 'text-blue-600    bg-blue-50    dark:text-blue-400    dark:bg-blue-900/30'    },
  [FollowUpType.Visit]:   { icon: MapPin,        cls: 'text-purple-600  bg-purple-50  dark:text-purple-400  dark:bg-purple-900/30'  },
  [FollowUpType.Chat]:    { icon: MessageCircle, cls: 'text-amber-600   bg-amber-50   dark:text-amber-400   dark:bg-amber-900/30'   },
  [FollowUpType.Meeting]: { icon: Users,         cls: 'text-indigo-600  bg-indigo-50  dark:text-indigo-400  dark:bg-indigo-900/30'  },
}

// ── Filter builder ────────────────────────────────────────────────────────────

function buildParams(tab: Tab, userId: string, role: UserRole, page: number) {
  const now        = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd   = new Date(todayStart.getTime() + 86_400_000 - 1)

  // Staff only see their own follow-ups; managers/admins see all
  const base: Record<string, unknown> = { page, pageSize: 20 }
  if (role === UserRole.Staff) base.createdBy = userId

  if (tab === 'today')    return { ...base, from: todayStart, to: todayEnd, status: 'scheduled' }
  if (tab === 'overdue')  return { ...base, overdue: true }
  if (tab === 'upcoming') return { ...base, from: new Date(todayEnd.getTime() + 1), status: 'scheduled' }
  return base
}

// ── Main component ────────────────────────────────────────────────────────────

interface FollowUpsClientProps {
  userId: string
  role:   UserRole
}

export default function FollowUpsClient({ userId, role }: FollowUpsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [page,      setPage]      = useState(1)

  const [items,      setItems]      = useState<PopulatedFollowUp[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total,      setTotal]      = useState(0)
  const [counts,     setCounts]     = useState<Partial<Record<Tab, number>>>({})

  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  // Load data for current tab + page
  const loadTab = useCallback(async (tab: Tab, pg: number) => {
    setIsLoading(true)
    setError(null)
    const r = await listFollowUpsAction(buildParams(tab, userId, role, pg))
    if (r.ok) {
      setItems(r.data.data as unknown as PopulatedFollowUp[])
      setTotalPages(r.data.totalPages)
      setTotal(r.data.total)
      setCounts((prev) => ({ ...prev, [tab]: r.data.total }))
    } else {
      setError(r.error)
    }
    setIsLoading(false)
  }, [userId, role])

  // Load counts for all tabs on mount (background, no loading state)
  useEffect(() => {
    const tabs: Tab[] = ['today', 'overdue', 'upcoming', 'all']
    tabs.forEach(async (tab) => {
      const r = await listFollowUpsAction({ ...buildParams(tab, userId, role, 1), pageSize: 1 })
      if (r.ok) setCounts((prev) => ({ ...prev, [tab]: r.data.total }))
    })
  }, [userId, role])

  useEffect(() => { loadTab(activeTab, page) }, [activeTab, page, loadTab])

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setPage(1)
  }

  return (
    <div className="space-y-5">
      {/* ── Summary chips ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryChip label="Today"    count={counts.today}    color="blue"   icon={<CalendarClock className="w-4 h-4" />} onClick={() => switchTab('today')}    active={activeTab === 'today'}    />
        <SummaryChip label="Overdue"  count={counts.overdue}  color="red"    icon={<AlarmClock    className="w-4 h-4" />} onClick={() => switchTab('overdue')}  active={activeTab === 'overdue'}  urgent={!!counts.overdue} />
        <SummaryChip label="Upcoming" count={counts.upcoming} color="purple" icon={<Clock         className="w-4 h-4" />} onClick={() => switchTab('upcoming')} active={activeTab === 'upcoming'} />
        <SummaryChip label="All"      count={counts.all}      color="slate"  icon={<CheckCircle2  className="w-4 h-4" />} onClick={() => switchTab('all')}      active={activeTab === 'all'}      />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={cn(
                'relative px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2',
                activeTab === t.id
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              )}
            >
              {t.label}
              {counts[t.id] !== undefined && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                  t.id === 'overdue' && (counts.overdue ?? 0) > 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : activeTab === t.id
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                )}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {error ? (
          <div className="p-6 flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState text={TABS.find((t) => t.id === activeTab)?.emptyText ?? 'No items'} tab={activeTab} />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Enquiry</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Scheduled</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">By</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {items.map((item) => (
                    <FollowUpRow key={item._id} item={item} onDismiss={() => loadTab(activeTab, page)} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                <span>
                  Page <span className="font-medium text-slate-700 dark:text-slate-300">{page}</span> of{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{totalPages}</span>
                  {' '}· {total} total
                </span>
                <div className="flex gap-1">
                  <PagBtn onClick={() => setPage(page - 1)} disabled={page === 1} label="Previous"><ChevronLeft className="w-4 h-4" /></PagBtn>
                  <PagBtn onClick={() => setPage(page + 1)} disabled={page === totalPages} label="Next"><ChevronRight className="w-4 h-4" /></PagBtn>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── FollowUpRow ───────────────────────────────────────────────────────────────

function FollowUpRow({
  item,
  onDismiss,
}: {
  item: PopulatedFollowUp
  onDismiss: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const enquiry     = typeof item.enquiryId === 'object' ? item.enquiryId : null
  const creator     = typeof item.createdBy  === 'object' ? item.createdBy  : null
  const enquiryHref = `/enquiries/${enquiry?._id ?? String(item.enquiryId)}`

  const isOpen    = item.status === FollowUpStatus.Scheduled
  const isOverdue = isOpen && item.scheduledAt && new Date(item.scheduledAt) < new Date()
  const hasReminder = isOpen && item.reminderAt && !item.reminderDismissed

  const { icon: TypeIcon, cls: typeCls } = TYPE_ICON[item.type as FollowUpType] ?? TYPE_ICON[FollowUpType.Call]

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      const r = await dismissReminderAction(item._id)
      if (r.ok) { toast.success('Reminder dismissed'); onDismiss() }
      else toast.error(r.error)
    })
  }

  return (
    <tr className={cn(
      'group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
      isPending && 'opacity-50',
      item.status === FollowUpStatus.Cancelled && 'opacity-50'
    )}>
      {/* Type */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium', typeCls)}>
          <TypeIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{FOLLOW_UP_TYPE_LABELS[item.type as FollowUpType]}</span>
        </span>
      </td>

      {/* Enquiry ref */}
      <td className="px-4 py-3 whitespace-nowrap">
        {enquiry ? (
          <Link href={enquiryHref} className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            {enquiry.enquiryNo}
          </Link>
        ) : (
          <span className="text-xs text-slate-400 italic">—</span>
        )}
      </td>

      {/* Customer */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <Link href={enquiryHref} className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[140px] block">
          {enquiry?.customerName ?? '—'}
        </Link>
      </td>

      {/* Scheduled */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className={cn('text-sm', isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-700 dark:text-slate-300')}>
          {formatDate(item.scheduledAt)}
        </div>
        {isOverdue && (
          <div className="flex items-center gap-1 text-[10px] text-red-500 mt-0.5 font-medium">
            <AlarmClock className="w-3 h-3" />
            Overdue
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
        <FollowUpStatusBadge status={item.status as FollowUpStatus} size="sm" />
      </td>

      {/* Notes */}
      <td className="px-4 py-3 hidden lg:table-cell max-w-[200px]">
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.notes}</p>
      </td>

      {/* Created by */}
      <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap">
        <span className="text-xs text-slate-500 dark:text-slate-400">{creator?.name ?? '—'}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasReminder && (
            <button
              type="button"
              title="Dismiss reminder"
              onClick={handleDismiss}
              disabled={isPending}
              className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}
          {item.reminderAt && item.reminderDismissed && (
            <span title="Reminder dismissed" className="p-1.5 text-slate-300 dark:text-slate-600">
              <BellOff className="w-3.5 h-3.5" />
            </span>
          )}
          <Link
            href={enquiryHref}
            title="View enquiry"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  )
}

// ── SummaryChip ───────────────────────────────────────────────────────────────

const CHIP_COLORS = {
  blue:   { base: 'border-blue-200 dark:border-blue-800',     active: 'bg-blue-50 dark:bg-blue-900/20',     icon: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',   text: 'text-blue-700 dark:text-blue-300'   },
  red:    { base: 'border-red-200 dark:border-red-800',       active: 'bg-red-50 dark:bg-red-900/20',       icon: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',       text: 'text-red-700 dark:text-red-300'     },
  purple: { base: 'border-purple-200 dark:border-purple-800', active: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400', text: 'text-purple-700 dark:text-purple-300' },
  slate:  { base: 'border-slate-200 dark:border-slate-700',   active: 'bg-slate-50 dark:bg-slate-800',      icon: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',   text: 'text-slate-700 dark:text-slate-300' },
}

function SummaryChip({ label, count, color, icon, onClick, active, urgent }: {
  label:   string
  count?:  number
  color:   keyof typeof CHIP_COLORS
  icon:    React.ReactNode
  onClick: () => void
  active:  boolean
  urgent?: boolean
}) {
  const c = CHIP_COLORS[color]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 w-full text-left transition-all hover:shadow-sm',
        c.base,
        active ? cn(c.active, 'ring-2 ring-offset-1', color === 'blue' ? 'ring-blue-400/40' : color === 'red' ? 'ring-red-400/40' : color === 'purple' ? 'ring-purple-400/40' : 'ring-slate-300/40') : 'bg-white dark:bg-slate-900'
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', c.icon)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className={cn('text-xl font-bold leading-tight', c.text)}>
          {count === undefined ? <span className="text-slate-300 dark:text-slate-600">—</span> : count}
          {urgent && (count ?? 0) > 0 && (
            <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse align-middle mb-0.5" />
          )}
        </p>
      </div>
    </button>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ text, tab }: { text: string; tab: Tab }) {
  const isGood = tab === 'overdue'
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center mb-3',
        isGood ? 'bg-green-100 dark:bg-green-900/20' : 'bg-slate-100 dark:bg-slate-800'
      )}>
        {isGood
          ? <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          : <CalendarClock className="w-6 h-6 text-slate-400" />
        }
      </div>
      <p className={cn('text-sm font-medium', isGood ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-400')}>{text}</p>
    </div>
  )
}

// ── PagBtn ────────────────────────────────────────────────────────────────────

function PagBtn({ children, onClick, disabled, label }: {
  children: React.ReactNode; onClick: () => void; disabled: boolean; label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}
