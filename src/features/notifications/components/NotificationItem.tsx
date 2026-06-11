'use client'

import Link from 'next/link'
import { X, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationItem as NotifData } from '../actions/notification.actions'
import { NotificationType } from '@/types/enums'

// ── Entity link resolver ──────────────────────────────────────────────────────

function entityHref(entityType?: string, entityId?: string): string | null {
  if (!entityId) return null
  if (entityType === 'enquiry')  return `/enquiries/${entityId}`
  if (entityType === 'followup') return `/enquiries/${entityId}`
  return null
}

// ── Type icon + color ─────────────────────────────────────────────────────────

const TYPE_STYLE: Record<string, { dot: string; bg: string }> = {
  [NotificationType.Assigned]:        { dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20'   },
  [NotificationType.Reassigned]:      { dot: 'bg-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
  [NotificationType.FollowUpDue]:     { dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20'},
  [NotificationType.StatusChanged]:   { dot: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20'},
  [NotificationType.EnquiryResolved]: { dot: 'bg-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
  [NotificationType.MentionedInNote]: { dot: 'bg-teal-500',   bg: 'bg-teal-50 dark:bg-teal-900/20'   },
  [NotificationType.SystemAlert]:     { dot: 'bg-red-500',    bg: 'bg-red-50 dark:bg-red-900/20'     },
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: NotifData
  onRead:       (id: string) => void
  onDelete:     (id: string) => void
}

export default function NotificationItem({
  notification: n,
  onRead,
  onDelete,
}: NotificationItemProps) {
  const style = TYPE_STYLE[n.type] ?? { dot: 'bg-slate-400', bg: '' }
  const href  = entityHref(n.entityType, n.entityId)

  const content = (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 group relative transition-colors',
      !n.isRead && style.bg,
      'hover:bg-slate-50 dark:hover:bg-slate-800/60'
    )}>
      {/* Unread dot */}
      <div className="flex-shrink-0 mt-1">
        <div className={cn(
          'w-2 h-2 rounded-full transition-opacity',
          n.isRead ? 'opacity-0' : style.dot
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs leading-snug',
          n.isRead
            ? 'text-slate-600 dark:text-slate-400'
            : 'font-semibold text-slate-800 dark:text-slate-200'
        )}>
          {n.title}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
          {n.body}
        </p>
        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!n.isRead && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRead(n._id) }}
            title="Mark as read"
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(n._id) }}
          title="Delete"
          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block" onClick={() => !n.isRead && onRead(n._id)}>{content}</Link>
  }

  return (
    <button
      type="button"
      className="w-full text-left"
      onClick={() => !n.isRead && onRead(n._id)}
    >
      {content}
    </button>
  )
}
