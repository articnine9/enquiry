'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { getUsersAction } from '@/features/users/actions/user.actions'
import { previewDeleteUsersAction, deleteUsersAction } from '../actions/dataManagement.actions'
import DeleteConfirmModal from './DeleteConfirmModal'
import { UserRole, UserStatus } from '@/types/enums'
import type { UserRow } from '@/features/users/actions/user.actions'

const PAGE_SIZE = 20

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Admin',
  [UserRole.Manager]:    'Manager',
  [UserRole.Staff]:      'Staff',
}

const STATUS_STYLE: Record<UserStatus, string> = {
  [UserStatus.Active]:    'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  [UserStatus.Inactive]:  'text-slate-500 bg-slate-100 dark:bg-slate-800',
  [UserStatus.Suspended]: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
}

export default function DeleteUsersTab() {
  const [rows,     setRows]     = useState<UserRow[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)

  async function load() {
    setIsLoading(true)
    const result = await getUsersAction({ search: search || undefined, page, pageSize: PAGE_SIZE })
    if (result.ok) {
      setRows(result.data.data)
      setTotal(result.data.total)
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  useEffect(() => { load() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load() }, 400)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      if (rows.every((r) => prev.has(r._id))) return new Set()
      return new Set(rows.map((r) => r._id))
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r._id))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={selected.size === 0}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete {selected.size > 0 ? selected.size : ''} selected
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="w-4 h-4 rounded" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No users found</td></tr>
            ) : rows.map((u) => (
              <tr key={u._id} className={cn('hover:bg-slate-50/80 dark:hover:bg-slate-800/30', selected.has(u._id) && 'bg-red-50/40 dark:bg-red-950/10')}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(u._id)} onChange={() => toggle(u._id)} className="w-4 h-4 rounded" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', STATUS_STYLE[u.status])}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showConfirm && (
        <DeleteConfirmModal
          title="Delete Users"
          ids={Array.from(selected)}
          previewAction={previewDeleteUsersAction}
          commitAction={deleteUsersAction}
          onClose={() => setShowConfirm(false)}
          onDeleted={() => { setSelected(new Set()); load() }}
        />
      )}
    </div>
  )
}
