'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  UserCheck, RefreshCw, Phone, CalendarCheck,
  FileText, LogIn, LogOut, AlertCircle, Zap,
} from 'lucide-react'
import { useActivityStore, useActivityFeed } from '@/store/activity.store'
import { getActivityFeedAction } from '../actions/activity.actions'
import { cn } from '@/lib/utils'
import { ActivityAction } from '@/types/enums'

// ── Action display config ─────────────────────────────────────────────────────

interface ActionMeta {
  icon:  React.ElementType
  color: string
  label: string
}

const ACTION_META: Partial<Record<ActivityAction, ActionMeta>> = {
  [ActivityAction.EnquiryAssigned]:   { icon: UserCheck,    color: 'text-blue-500',   label: 'Assigned enquiry'    },
  [ActivityAction.EnquiryReassigned]: { icon: RefreshCw,    color: 'text-amber-500',  label: 'Reassigned enquiry'  },
  [ActivityAction.EnquiryResolved]:   { icon: Zap,          color: 'text-green-500',  label: 'Resolved enquiry'    },
  [ActivityAction.StatusChanged]:     { icon: RefreshCw,    color: 'text-purple-500', label: 'Status changed'      },
  [ActivityAction.CallMade]:          { icon: Phone,        color: 'text-emerald-500',label: 'Call made'           },
  [ActivityAction.CallReceived]:      { icon: Phone,        color: 'text-teal-500',   label: 'Call received'       },
  [ActivityAction.FollowUpCompleted]: { icon: CalendarCheck,color: 'text-violet-500', label: 'Follow-up completed' },
  [ActivityAction.FollowUpCreated]:   { icon: CalendarCheck,color: 'text-indigo-400', label: 'Follow-up scheduled' },
  [ActivityAction.NoteAdded]:         { icon: FileText,     color: 'text-slate-500',  label: 'Note added'          },
  [ActivityAction.LoginSuccess]:      { icon: LogIn,        color: 'text-sky-500',    label: 'Logged in'           },
  [ActivityAction.Logout]:            { icon: LogOut,       color: 'text-slate-400',  label: 'Logged out'          },
}

const DEFAULT_META: ActionMeta = {
  icon:  AlertCircle,
  color: 'text-slate-400',
  label: 'Activity',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60)   return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function entityLink(type: string, id: string): string | null {
  if (type === 'enquiry')  return `/enquiries/${id}`
  if (type === 'followup') return null
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ActivityFeedListProps {
  staffId?:   string
  limit?:     number
  hours?:     number
  className?: string
}

export default function ActivityFeedList({
  staffId,
  limit   = 50,
  hours   = 24,
  className,
}: ActivityFeedListProps) {
  const { feedLoading, feedError, setFeed, setFeedLoading } = useActivityStore()
  const entries = useActivityFeed()

  useEffect(() => {
    setFeedLoading('loading')
    getActivityFeedAction({ staffId, limit, hours }).then((r) => {
      if (r.ok) { setFeed(r.data); setFeedLoading('ready') }
      else       setFeedLoading('error', r.error)
    })
  }, [staffId, limit, hours]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn(
      'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Activity Feed
        </h3>
        <span className="text-xs text-slate-400">Last {hours}h</span>
      </div>

      {/* Loading */}
      {(feedLoading === 'loading' || feedLoading === 'idle') && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-2.5 w-32 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {feedLoading === 'error' && (
        <div className="px-5 py-4 text-sm text-red-600 dark:text-red-400">{feedError}</div>
      )}

      {/* Feed */}
      {feedLoading === 'ready' && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No activity in the last {hours}h
            </div>
          ) : (
            entries.map((entry) => {
              const meta  = ACTION_META[entry.action as ActivityAction] ?? DEFAULT_META
              const Icon  = meta.icon
              const href  = entityLink(entry.entityType, entry.entityId)
              const initials = (entry.actorName ?? '?')
                .split(' ')
                .map((w: string) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              return (
                <div
                  key={entry._id}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  {/* Actor avatar */}
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {initials}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                      <span className="font-medium">{entry.actorName}</span>
                      {' '}
                      <span className="text-slate-500 dark:text-slate-400">{meta.label.toLowerCase()}</span>
                      {href && (
                        <>
                          {' '}
                          <Link
                            href={href}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            {(entry.metadata?.enquiryNo as string) ?? entry.entityId.slice(-6)}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {timeAgo(entry.createdAt)}
                    </p>
                  </div>

                  {/* Action icon */}
                  <div className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                    'bg-slate-100 dark:bg-slate-800'
                  )}>
                    <Icon className={cn('w-3 h-3', meta.color)} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
