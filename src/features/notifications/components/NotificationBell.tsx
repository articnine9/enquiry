'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useUnreadCount, useNotificationStore } from '@/store/notification.store'
import { getUnreadCountAction } from '../actions/notification.actions'
import NotificationPanel from './NotificationPanel'
import { cn } from '@/lib/utils'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { setUnreadCount } = useNotificationStore()
  const unreadCount = useUnreadCount()

  // ── Poll unread count every 30 s ────────────────────────────────────────────

  useEffect(() => {
    function fetch() {
      getUnreadCountAction().then((r) => {
        if (r.ok) setUnreadCount(r.data.count)
      })
    }
    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={cn(
          'relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
          'text-slate-500 dark:text-slate-400',
          open
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
            'rounded-full text-[10px] font-bold tabular-nums',
            'bg-indigo-600 text-white flex items-center justify-center',
            'ring-2 ring-white dark:ring-slate-900'
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  )
}
