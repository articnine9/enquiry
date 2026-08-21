'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Search, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { getEnquiries } from '@/features/enquiries/actions/enquiry.actions'
import { previewDeleteEnquiriesAction, deleteEnquiriesAction } from '../actions/dataManagement.actions'
import DeleteConfirmModal from './DeleteConfirmModal'
import { ENQUIRY_STATUS_LABELS, type EnquiryStatus } from '@/types/enums'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'

const PAGE_SIZE = 20

export default function DeleteEnquiriesTab() {
  const [rows,     setRows]     = useState<EnquiryDocument[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [search,   setSearch]   = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)

  async function load() {
    setIsLoading(true)
    const result = await getEnquiries({ search: search || undefined, page, pageSize: PAGE_SIZE, sortBy: 'createdAt', sortOrder: 'desc' })
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
      if (rows.every((r) => prev.has(String(r._id)))) return new Set()
      return new Set(rows.map((r) => String(r._id)))
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(String(r._id)))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search name, phone, subject…"
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Enquiry</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">No enquiries found</td></tr>
            ) : rows.map((r) => {
              const id = String(r._id)
              const converted = !!r.convertedAt
              return (
                <tr key={id} className={cn('hover:bg-slate-50/80 dark:hover:bg-slate-800/30', selected.has(id) && 'bg-red-50/40 dark:bg-red-950/10')}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{r.customerName}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.enquiryNo} · {r.phone}</p>
                    {converted && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <BadgeCheck className="w-3 h-3" /> Converted to customer
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                    {ENQUIRY_STATUS_LABELS[r.status as EnquiryStatus] ?? r.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(r.createdAt)}</td>
                </tr>
              )
            })}
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
          title="Delete Enquiries"
          ids={Array.from(selected)}
          previewAction={previewDeleteEnquiriesAction}
          commitAction={deleteEnquiriesAction}
          onClose={() => setShowConfirm(false)}
          onDeleted={() => { setSelected(new Set()); load() }}
        />
      )}
    </div>
  )
}
