'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UserFilters from './UserFilters'
import UserTable from './UserTable'
import {
  getUsersAction, deleteUserAction, getZonesForSelectAction,
  type UserFilters as Filters, type UserRow,
} from '../actions/user.actions'
import { UserRole } from '@/types/enums'
import type { PaginatedResult } from '@/types/api'

const EMPTY: PaginatedResult<UserRow> = {
  data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false,
}

interface StaffListClientProps {
  currentUserId: string
  currentRole:   UserRole
}

export default function StaffListClient({ currentUserId, currentRole }: StaffListClientProps) {
  const router = useRouter()
  const [filters,   setFilters]   = useState<Filters>({ page: 1, pageSize: 20 })
  const [result,    setResult]    = useState<PaginatedResult<UserRow>>(EMPTY)
  const [isLoading, setIsLoading] = useState(false)
  const [zones,     setZones]     = useState<{ _id: string; name: string }[]>([])
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    getZonesForSelectAction().then((r) => { if (r.ok) setZones(r.data) })
    load({ page: 1, pageSize: 20 })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (f: Filters) => {
    setIsLoading(true)
    const r = await getUsersAction(f)
    if (r.ok) setResult(r.data)
    setIsLoading(false)
  }, [])

  function handleSearch() { load(filters) }

  function handlePageChange(page: number) {
    const next = { ...filters, page }
    setFilters(next)
    load(next)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return
    const r = await deleteUserAction(id)
    if (r.ok) load(filters)
    else alert(r.error)
  }

  const canEdit   = [UserRole.SuperAdmin, UserRole.Manager].includes(currentRole)
  const canDelete = currentRole === UserRole.SuperAdmin

  return (
    <div className="space-y-4">
      <UserFilters
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        zones={zones}
        isLoading={isLoading}
      />
      <UserTable
        result={result}
        filters={filters}
        currentUserId={currentUserId}
        canEdit={canEdit}
        canDelete={canDelete}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onDelete={handleDelete}
      />
    </div>
  )
}
