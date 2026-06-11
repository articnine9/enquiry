'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useEnquiryStore } from '@/store/enquiry.store'
import { cn } from '@/lib/utils'
import {
  EnquiryStatus, EnquiryPriority, EnquirySource, EnquiryProduct,
  ENQUIRY_STATUS_LABELS, ENQUIRY_PRIORITY_LABELS, ENQUIRY_SOURCE_LABELS, ENQUIRY_PRODUCT_LABELS,
} from '@/types/enums'
import type { EnquiryFilterInput } from '../validations/enquiry.schema'
import { useEffect, useState } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function useFilterSync() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const { filters, setFilter, resetFilters } = useEnquiryStore()

  const pushParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else        params.delete(key)
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  function handleFilter<K extends keyof EnquiryFilterInput>(
    key: K,
    value: EnquiryFilterInput[K] | ''
  ) {
    setFilter(key, (value || undefined) as EnquiryFilterInput[K])
    pushParams(key, String(value ?? ''))
  }

  function handleReset() {
    resetFilters()
    router.push(pathname, { scroll: false })
  }

  return { filters, handleFilter, handleReset, searchParams }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnquiryFilters() {
  const { filters, handleFilter, handleReset, searchParams } = useFilterSync()
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    handleFilter('search', debouncedSearch || undefined as unknown as string)
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters =
    !!(filters.status || filters.priority || filters.enquirySource ||
       filters.product || filters.city || filters.search)

  return (
    <div className="space-y-3">
      {/* ── Row 1: Search + Reset ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search name, phone, subject…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters:</span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* ── Row 2: Filter selects ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          id="status"
          placeholder="All Statuses"
          value={filters.status ?? ''}
          onChange={(v) => handleFilter('status', v as EnquiryStatus)}
          options={Object.values(EnquiryStatus).map((v) => ({
            value: v, label: ENQUIRY_STATUS_LABELS[v],
          }))}
        />

        <FilterSelect
          id="priority"
          placeholder="All Priorities"
          value={filters.priority ?? ''}
          onChange={(v) => handleFilter('priority', v as EnquiryPriority)}
          options={Object.values(EnquiryPriority).map((v) => ({
            value: v, label: ENQUIRY_PRIORITY_LABELS[v],
          }))}
        />

        <FilterSelect
          id="enquirySource"
          placeholder="All Sources"
          value={filters.enquirySource ?? ''}
          onChange={(v) => handleFilter('enquirySource', v as EnquirySource)}
          options={Object.values(EnquirySource).map((v) => ({
            value: v, label: ENQUIRY_SOURCE_LABELS[v],
          }))}
        />

        <FilterSelect
          id="product"
          placeholder="All Products"
          value={filters.product ?? ''}
          onChange={(v) => handleFilter('product', v as EnquiryProduct)}
          options={Object.values(EnquiryProduct).map((v) => ({
            value: v, label: ENQUIRY_PRODUCT_LABELS[v],
          }))}
        />

        {/* City free-text filter */}
        <input
          type="text"
          placeholder="City…"
          value={filters.city ?? ''}
          onChange={(e) => handleFilter('city', e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-32"
        />
      </div>
    </div>
  )
}

// ── FilterSelect ──────────────────────────────────────────────────────────────

function FilterSelect({
  id, placeholder, value, onChange, options,
}: {
  id:          string
  placeholder: string
  value:       string
  onChange:    (v: string) => void
  options:     { value: string; label: string }[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'px-3 py-1.5 rounded-lg border text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200',
        value
          ? 'border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300'
          : 'border-slate-300 dark:border-slate-600'
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
