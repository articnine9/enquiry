'use client'

import { useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronR, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditLogEntry, AuditFilters } from '../actions/audit.actions'
import type { PaginatedResult } from '@/types/api'
import { getAuditLogsAction } from '../actions/audit.actions'

// ── Action label helpers ──────────────────────────────────────────────────────

const ACTION_COLOR: Record<string, string> = {
  create:          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  login:           'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  logout:          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  assign:          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  resolve:         'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  status_changed:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  follow_up_added: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

function actionBadgeClass(action: string): string {
  const key = action.toLowerCase()
  for (const [prefix, cls] of Object.entries(ACTION_COLOR)) {
    if (key.startsWith(prefix)) return cls
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Metadata expander row ─────────────────────────────────────────────────────

function MetaRow({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false)
  const hasData = Object.keys(entry.metadata ?? {}).length > 0

  if (!hasData && !entry.ipAddress && !entry.userAgent) return null

  return (
    <tr className="bg-slate-50/50 dark:bg-slate-800/40">
      <td colSpan={6} className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronR className="w-3.5 h-3.5" />}
          {open ? 'Hide details' : 'Show details'}
        </button>
        {open && (
          <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs font-mono space-y-1">
            {entry.ipAddress && (
              <div><span className="text-slate-400">ip: </span><span className="text-slate-700 dark:text-slate-300">{entry.ipAddress}</span></div>
            )}
            {entry.userAgent && (
              <div><span className="text-slate-400">ua: </span><span className="text-slate-700 dark:text-slate-300 break-all">{entry.userAgent}</span></div>
            )}
            {hasData && (
              <pre className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AuditLogTableProps {
  result:    PaginatedResult<AuditLogEntry>
  filters:   AuditFilters
  onPageChange: (page: number) => void
  isLoading: boolean
}

export default function AuditLogTable({
  result,
  filters,
  onPageChange,
  isLoading,
}: AuditLogTableProps) {
  const { data: rows, total, page, totalPages } = result

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">When</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entity ID</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <>
                    <tr
                      key={row._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* When */}
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-400 flex-shrink-0">
                            {row.actorName ? initials(row.actorName) : '?'}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {row.actorName ?? 'Unknown'}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize">{row.actorRole}</p>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
                          actionBadgeClass(row.action)
                        )}>
                          {row.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Entity type */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">
                          {row.entityType}
                        </span>
                      </td>

                      {/* Entity ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px] block">
                          {row.entityId}
                        </span>
                      </td>

                      {/* Expand toggle placeholder — MetaRow handles it */}
                      <td className="px-2" />
                    </tr>
                    <MetaRow key={`meta-${row._id}`} entry={row} />
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <p>
          {total === 0
            ? 'No results'
            : `Showing ${((page - 1) * (filters.pageSize ?? 20)) + 1}–${Math.min(page * (filters.pageSize ?? 20), total)} of ${total.toLocaleString()}`
          }
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

          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (page <= 3) {
              pageNum = i + 1
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = page - 2 + i
            }
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={cn(
                  'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                  pageNum === page
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                {pageNum}
              </button>
            )
          })}

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
