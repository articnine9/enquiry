'use client'

import Link from 'next/link'
import { Edit2, Trash2, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole, UserStatus } from '@/types/enums'
import type { UserRow, UserFilters } from '../actions/user.actions'
import type { PaginatedResult } from '@/types/api'

// ── Badge helpers ─────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  [UserRole.Manager]:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  [UserRole.Staff]:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Admin',
  [UserRole.Manager]:    'Manager',
  [UserRole.Staff]:      'Staff',
}

function StatusIcon({ status }: { status: UserStatus }) {
  if (status === UserStatus.Active)
    return <CheckCircle className="w-4 h-4 text-green-500" />
  if (status === UserStatus.Suspended)
    return <AlertCircle className="w-4 h-4 text-amber-500" />
  return <XCircle className="w-4 h-4 text-slate-400" />
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

// ── Component ─────────────────────────────────────────────────────────────────

interface UserTableProps {
  result:       PaginatedResult<UserRow>
  filters:      UserFilters
  currentUserId: string
  canEdit:       boolean
  canDelete:     boolean
  isLoading:     boolean
  onPageChange:  (p: number) => void
  onDelete:      (id: string, name: string) => void
}

export default function UserTable({
  result, filters, currentUserId, canEdit, canDelete,
  isLoading, onPageChange, onDelete,
}: UserTableProps) {
  const { data: rows, total, page, totalPages } = result

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Zone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last login</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No users found
                  </td>
                </tr>
              ) : rows.map((u) => (
                <tr
                  key={u._id}
                  className={cn(
                    'hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors',
                    u._id === currentUserId && 'bg-indigo-50/40 dark:bg-indigo-900/10'
                  )}
                >
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex-shrink-0">
                        {initials(u.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {u.name}
                          {u._id === currentUserId && (
                            <span className="ml-1.5 text-[10px] text-indigo-500 font-normal">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', ROLE_BADGE[u.role])}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={u.status} />
                      <span className="text-xs capitalize text-slate-600 dark:text-slate-400">{u.status}</span>
                    </div>
                  </td>

                  {/* Zone */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {u.zoneName ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </span>
                  </td>

                  {/* Last login */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-slate-300 dark:text-slate-600">Never</span>
                      }
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {canEdit && (
                        <Link
                          href={`/staff/${u._id}/edit`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      {canDelete && u._id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDelete(u._id, u.name)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <p>
          {total === 0 ? 'No results' : `${total.toLocaleString()} users`}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-xs">{page} / {totalPages || 1}</span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
