import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { NotificationItem } from '@/features/notifications/actions/notification.actions'

interface NotificationState {
  items:       NotificationItem[]
  unreadCount: number
  loaded:      boolean
  page:        number
  hasMore:     boolean
}

interface NotificationActions {
  setItems(items: NotificationItem[], total?: number, page?: number): void
  appendItems(items: NotificationItem[], hasMore: boolean): void
  prependItem(item: NotificationItem): void
  markRead(id: string): void
  markAllRead(): void
  removeItem(id: string): void
  clearRead(): void
  setUnreadCount(count: number): void
  decrementUnread(): void
  setLoaded(loaded: boolean): void
  nextPage(): void
}

export type NotificationStore = NotificationState & NotificationActions

export const useNotificationStore = create<NotificationStore>()(
  immer((set) => ({
    items:       [],
    unreadCount: 0,
    loaded:      false,
    page:        1,
    hasMore:     false,

    setItems(items, total, page = 1) {
      set((s) => {
        s.items       = items
        s.unreadCount = items.filter((n) => !n.isRead).length
        s.loaded      = true
        s.page        = page
        s.hasMore     = total !== undefined ? items.length < total : false
      })
    },

    appendItems(items, hasMore) {
      set((s) => {
        const existingIds = new Set(s.items.map((i) => i._id))
        const newOnes     = items.filter((i) => !existingIds.has(i._id))
        s.items.push(...newOnes)
        s.hasMore = hasMore
        s.page   += 1
      })
    },

    prependItem(item) {
      set((s) => {
        s.items.unshift(item)
        if (!item.isRead) s.unreadCount += 1
      })
    },

    markRead(id) {
      set((s) => {
        const n = s.items.find((i) => i._id === id)
        if (n && !n.isRead) {
          n.isRead    = true
          n.readAt    = new Date().toISOString()
          s.unreadCount = Math.max(0, s.unreadCount - 1)
        }
      })
    },

    markAllRead() {
      set((s) => {
        s.items.forEach((n) => {
          n.isRead = true
          if (!n.readAt) n.readAt = new Date().toISOString()
        })
        s.unreadCount = 0
      })
    },

    removeItem(id) {
      set((s) => {
        const idx = s.items.findIndex((i) => i._id === id)
        if (idx !== -1) {
          const wasUnread = !s.items[idx].isRead
          s.items.splice(idx, 1)
          if (wasUnread) s.unreadCount = Math.max(0, s.unreadCount - 1)
        }
      })
    },

    clearRead() {
      set((s) => {
        s.items = s.items.filter((n) => !n.isRead)
      })
    },

    setUnreadCount(count) {
      set((s) => { s.unreadCount = count })
    },

    decrementUnread() {
      set((s) => { s.unreadCount = Math.max(0, s.unreadCount - 1) })
    },

    setLoaded(loaded) {
      set((s) => { s.loaded = loaded })
    },

    nextPage() {
      set((s) => { s.page += 1 })
    },
  }))
)

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useNotifications   = () => useNotificationStore((s) => s.items)
export const useUnreadCount     = () => useNotificationStore((s) => s.unreadCount)
export const useNotifLoaded     = () => useNotificationStore((s) => s.loaded)
