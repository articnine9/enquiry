'use client'

import { useEffect, useRef, useCallback } from 'react'
import { CheckCheck, Trash2, Loader2, BellOff } from 'lucide-react'
import {
  useNotificationStore,
  useNotifications,
  useUnreadCount,
} from '@/store/notification.store'
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
  clearReadNotificationsAction,
} from '../actions/notification.actions'
import NotificationItem from './NotificationItem'
import { cn } from '@/lib/utils'

interface NotificationPanelProps {
  onClose: () => void
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const {
    setItems, appendItems, markRead, markAllRead,
    removeItem, clearRead, loaded, hasMore, page,
  } = useNotificationStore()
  const items       = useNotifications()
  const unreadCount = useUnreadCount()
  const loadingRef  = useRef(false)
  const panelRef    = useRef<HTMLDivElement>(null)

  // ── Load first page ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (loaded) return
    loadingRef.current = true
    getNotificationsAction({ page: 1, pageSize: 20 }).then((r) => {
      if (r.ok) {
        setItems(r.data.data, r.data.total, 1)
      }
      loadingRef.current = false
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close on outside click ──────────────────────────────────────────────────

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // ── Load more ───────────────────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return
    loadingRef.current = true
    const r = await getNotificationsAction({ page: page + 1, pageSize: 20 })
    if (r.ok) appendItems(r.data.data, r.data.hasNext)
    loadingRef.current = false
  }, [hasMore, page, appendItems])

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleRead(id: string) {
    markRead(id) // optimistic
    await markNotificationReadAction(id)
  }

  async function handleDelete(id: string) {
    removeItem(id) // optimistic
    await deleteNotificationAction(id)
  }

  async function handleMarkAllRead() {
    markAllRead() // optimistic
    await markAllNotificationsReadAction()
  }

  async function handleClearRead() {
    clearRead() // optimistic
    await clearReadNotificationsAction()
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute right-0 top-full mt-2 w-80 sm:w-96 z-50',
        'rounded-xl border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-900 shadow-xl overflow-hidden',
        'flex flex-col max-h-[520px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white tabular-nums">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              All read
            </button>
          )}
          {items.some((n) => n.isRead) && (
            <button
              type="button"
              onClick={handleClearRead}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
        {!loaded ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <BellOff className="w-8 h-8 mb-2" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <>
            {items.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                className="w-full py-3 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors font-medium"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
