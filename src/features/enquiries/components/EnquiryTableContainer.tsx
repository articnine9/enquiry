'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import EnquiryTable from './EnquiryTable'
import { UserRole } from '@/types/enums'
import type { EnquiryDocument } from '@/lib/db/models/Enquiry'
import type { PaginatedResult } from '@/types/api'

interface Props {
  data:       PaginatedResult<EnquiryDocument>
  userRole?:  UserRole
  sortBy:     string
  sortOrder:  'asc' | 'desc'
}

export default function EnquiryTableContainer({ data, userRole, sortBy, sortOrder }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined) params.delete(k)
        else params.set(k, v)
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  function handleSort(key: string) {
    const nextOrder =
      sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc'
    updateParam({ sortBy: key, sortOrder: nextOrder, page: '1' })
  }

  function handlePageChange(page: number) {
    updateParam({ page: String(page) })
  }

  return (
    <EnquiryTable
      data={data}
      userRole={userRole}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={handleSort}
      onPageChange={handlePageChange}
    />
  )
}
