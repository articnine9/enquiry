'use client'

import { Search, RotateCcw } from 'lucide-react'
import { UserRole, UserStatus } from '@/types/enums'
import { cn } from '@/lib/utils'
import type { UserFilters } from '../actions/user.actions'

interface UserFiltersProps {
  filters:   UserFilters
  onChange:  (f: UserFilters) => void
  onSearch:  () => void
  zones:     { _id: string; name: string }[]
  isLoading: boolean
}

const ROLE_OPTIONS = [
  { value: '',                     label: 'All roles'    },
  { value: UserRole.SuperAdmin,    label: 'Super Admin'  },
  { value: UserRole.Manager,       label: 'Manager'      },
  { value: UserRole.Staff,         label: 'Staff'        },
]

const STATUS_OPTIONS = [
  { value: '',                   label: 'All statuses' },
  { value: UserStatus.Active,    label: 'Active'       },
  { value: UserStatus.Inactive,  label: 'Inactive'     },
  { value: UserStatus.Suspended, label: 'Suspended'    },
]

const SELECT_CLS = cn(
  'h-9 pl-3 pr-7 rounded-lg border text-sm',
  'border-slate-200 dark:border-slate-700',
  'bg-slate-50 dark:bg-slate-800',
  'text-slate-800 dark:text-slate-200',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
)

export default function UserFilters({
  filters, onChange, onSearch, zones, isLoading,
}: UserFiltersProps) {
  function set(patch: Partial<UserFilters>) {
    onChange({ ...filters, ...patch, page: 1 })
  }

  const hasActive = !!(filters.search || filters.role || filters.status || filters.locationZoneId)

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search name or email…"
          value={filters.search ?? ''}
          onChange={(e) => set({ search: e.target.value || undefined })}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className={cn(
            'w-full pl-9 pr-3 h-9 rounded-lg border text-sm',
            'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
            'text-slate-800 dark:text-slate-200 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
          )}
        />
      </div>

      <select value={filters.role ?? ''} onChange={(e) => set({ role: (e.target.value as UserRole) || undefined })} className={SELECT_CLS}>
        {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <select value={filters.status ?? ''} onChange={(e) => set({ status: (e.target.value as UserStatus) || undefined })} className={SELECT_CLS}>
        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {zones.length > 0 && (
        <select value={filters.locationZoneId ?? ''} onChange={(e) => set({ locationZoneId: e.target.value || undefined })} className={SELECT_CLS}>
          <option value="">All zones</option>
          {zones.map((z) => <option key={z._id} value={z._id}>{z.name}</option>)}
        </select>
      )}

      {hasActive && (
        <button
          type="button"
          onClick={() => onChange({ page: 1, pageSize: filters.pageSize })}
          className="h-9 px-3 rounded-lg text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      )}

      <button
        type="button"
        onClick={onSearch}
        disabled={isLoading}
        className="h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Loading…' : 'Search'}
      </button>
    </div>
  )
}
