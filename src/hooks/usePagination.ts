'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { siteConfig } from '@/config/site'

export function usePagination() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const page     = Number(searchParams.get('page')     ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? siteConfig.pagination.defaultPageSize)

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(next))
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const setPageSize = useCallback(
    (size: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', String(size))
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return { page, pageSize, setPage, setPageSize }
}
