'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Eye, Pencil, Trash2, ChevronUp, ChevronDown,
  ChevronsUpDown, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useEnquiryStore } from '@/store/enquiry.store'
import { deleteEnquiry } from '../actions/enquiry.actions'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { LeadStageBadge } from './LeadStageBadge'
import { SlaBadge } from './SlaBadge'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { UserRole, EnquiryStatus, ENQUIRY_SOURCE_LABELS } from '@/types/enums'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'
import type { PaginatedResult } from '@/types/api'

// ── Column definitions ────────────────────────────────────────────────────────

interface Column {
  key:        string
  label:      string
  sortable?:  boolean
  className?: string
}

const COLUMNS: Column[] = [
  { key: 'enquiryNo',    label: 'Ref #',        className: 'w-32' },
  { key: 'customerName', label: 'Customer',      sortable: true },
  { key: 'status',       label: 'Status',        className: 'w-32' },
  { key: 'leadStage',    label: 'Lead Stage',    className: 'w-36 hidden lg:table-cell' },
  { key: 'priority',     label: 'Priority',      className: 'w-28' },
  { key: 'sla',          label: 'SLA',           className: 'w-32' },
  { key: 'enquirySource',label: 'Source',        className: 'w-28 hidden lg:table-cell' },
  { key: 'product',      label: 'Product',       className: 'w-32 hidden xl:table-cell' },
  { key: 'city',         label: 'City',          className: 'w-28 hidden md:table-cell' },
  { key: 'channel',      label: 'Channel',       className: 'w-32 hidden xl:table-cell' },
  { key: 'assignedTo',   label: 'Assigned To',   className: 'w-36 hidden lg:table-cell' },
  { key: 'createdAt',    label: 'Created',       sortable: true, className: 'w-28 hidden sm:table-cell' },
  { key: 'actions',      label: '',              className: 'w-24' },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface EnquiryTableProps {
  data:        PaginatedResult<EnquiryDocument>
  userRole?:   UserRole
  sortBy?:     string
  sortOrder?:  'asc' | 'desc'
  onSort?:     (key: string) => void
  onPageChange?: (page: number) => void
}

export default function EnquiryTable({
  data,
  userRole,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
}: EnquiryTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { optimisticRemove, setPending, pending } = useEnquiryStore()

  const canEdit   = userRole !== UserRole.Staff
  const canDelete = userRole === UserRole.SuperAdmin || userRole === UserRole.Manager

  function handleDelete(id: string, name: string) {
    if (!confirm(`Cancel enquiry for "${name}"? This cannot be undone.`)) return

    optimisticRemove(id)
    setPending(id, true)

    startTransition(async () => {
      const result = await deleteEnquiry(id)
      setPending(id, false)
      if (result.ok) {
        toast.success('Enquiry cancelled')
      } else {
        toast.error(result.error)
        router.refresh() // revert optimistic remove
      }
    })
  }

  if (!data.data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
        <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No enquiries found</p>
        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new enquiry.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap',
                    col.className,
                    col.sortable && 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sortBy === col.key
                        ? sortOrder === 'asc'
                          ? <ChevronUp className="w-3 h-3" />
                          : <ChevronDown className="w-3 h-3" />
                        : <ChevronsUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {data.data.map((enquiry) => {
              const id        = String(enquiry._id)
              const isRowBusy = pending.has(id) || isPending
              const isCancelled = enquiry.status === EnquiryStatus.Cancelled

              return (
                <tr
                  key={id}
                  className={cn(
                    'group transition-colors',
                    isCancelled
                      ? 'opacity-50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    isRowBusy && 'animate-pulse'
                  )}
                >
                  {/* Enquiry No */}
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <Link
                      href={`/enquiries/${id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {enquiry.enquiryNo}
                    </Link>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-semibold">
                        {getInitials(enquiry.customerName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                          {enquiry.customerName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{enquiry.phone}</p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={enquiry.status} size="sm" />
                  </td>

                  {/* Lead Stage */}
                  <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                    <LeadStageBadge stage={enquiry.leadStage} size="sm" />
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PriorityBadge priority={enquiry.priority} />
                  </td>

                  {/* SLA */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <SlaBadge
                      createdAt={enquiry.createdAt}
                      dueAt={enquiry.slaDueAt}
                      slaMet={enquiry.slaMet}
                      isClosed={enquiry.status === EnquiryStatus.Cancelled}
                      isPaused={enquiry.status === EnquiryStatus.Paused}
                    />
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell text-xs text-slate-500 dark:text-slate-400">
                    {ENQUIRY_SOURCE_LABELS[enquiry.enquirySource as keyof typeof ENQUIRY_SOURCE_LABELS]
                      ?? enquiry.enquirySource?.replace(/_/g, ' ') ?? '—'}
                  </td>

                  {/* Product */}
                  <td className="px-4 py-3 whitespace-nowrap hidden xl:table-cell text-xs text-slate-600 dark:text-slate-300">
                    {enquiry.product?.replace(/_/g, ' ') ?? '—'}
                  </td>

                  {/* City */}
                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell text-xs text-slate-500 dark:text-slate-400">
                    {enquiry.city}
                  </td>

                  {/* Channel (dealer, falling back to distributor) */}
                  <td className="px-4 py-3 whitespace-nowrap hidden xl:table-cell text-xs text-slate-500 dark:text-slate-400">
                    {(enquiry.dealerId as unknown as { name: string })?.name
                      ?? (enquiry.distributorId as unknown as { name: string })?.name
                      ?? '—'}
                  </td>

                  {/* Assigned To */}
                  <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                    {enquiry.assignedTo ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-medium">
                          {getInitials((enquiry.assignedTo as unknown as { name: string })?.name ?? '??')}
                        </div>
                        {(enquiry.assignedTo as unknown as { name: string })?.name ?? 'Unknown'}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(enquiry.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionButton
                        href={`/enquiries/${id}`}
                        label="View"
                        icon={<Eye className="w-3.5 h-3.5" />}
                      />
                      {canEdit && !isCancelled && (
                        <ActionButton
                          href={`/enquiries/${id}/edit`}
                          label="Edit"
                          icon={<Pencil className="w-3.5 h-3.5" />}
                        />
                      )}
                      {canDelete && !isCancelled && (
                        <ActionButton
                          label="Delete"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => handleDelete(id, enquiry.customerName)}
                          danger
                        />
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        hasNext={data.hasNext}
        hasPrev={data.hasPrev}
        onPageChange={onPageChange}
      />
    </div>
  )
}

// ── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({
  href, label, icon, onClick, danger = false,
}: {
  href?:    string
  label:    string
  icon:     React.ReactNode
  onClick?: () => void
  danger?:  boolean
}) {
  const cls = cn(
    'inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors',
    danger
      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700'
      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
  )

  if (href) return (
    <Link href={href} title={label} className={cls}>{icon}</Link>
  )

  return (
    <button type="button" title={label} onClick={onClick} className={cls}>{icon}</button>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page, pageSize, total, totalPages, hasNext, hasPrev, onPageChange,
}: {
  page: number; pageSize: number; total: number; totalPages: number
  hasNext: boolean; hasPrev: boolean; onPageChange?: (p: number) => void
}) {
  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 px-1">
      <p>
        Showing <span className="font-medium">{from}–{to}</span> of{' '}
        <span className="font-medium">{total}</span> enquiries
      </p>

      <div className="flex items-center gap-1">
        <PagBtn
          onClick={() => onPageChange?.(page - 1)}
          disabled={!hasPrev}
          label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </PagBtn>

        <span className="px-3 py-1 text-xs font-medium">
          {page} / {totalPages}
        </span>

        <PagBtn
          onClick={() => onPageChange?.(page + 1)}
          disabled={!hasNext}
          label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </PagBtn>
      </div>
    </div>
  )
}

function PagBtn({
  children, onClick, disabled, label,
}: {
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
