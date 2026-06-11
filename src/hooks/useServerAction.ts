'use client'

import { useCallback, useState, useTransition } from 'react'
import type { ActionResult } from '@/types/api'

// Generic hook that wraps any Server Action with loading + error state
export function useServerAction<TArgs extends unknown[], TData>(
  action: (...args: TArgs) => Promise<ActionResult<TData>>
) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]             = useState<string | null>(null)
  const [data, setData]               = useState<TData | null>(null)

  const execute = useCallback(
    (...args: TArgs) => {
      setError(null)
      startTransition(async () => {
        const result = await action(...args)
        if (result.ok) {
          setData(result.data)
        } else {
          setError(result.error)
        }
      })
    },
    [action]
  )

  return { execute, isPending, error, data }
}
