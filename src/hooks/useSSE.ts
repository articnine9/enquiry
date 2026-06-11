'use client'

import { useEffect, useRef } from 'react'
import type { SSEEvent } from '@/types/api'

interface UseSSEOptions {
  onMessage: (event: SSEEvent) => void
  onError?:  (err: Event) => void
  enabled?:  boolean
}

// Connects to /api/notifications/sse and dispatches typed events.
// Automatically reconnects on connection loss.
export function useSSE(url: string, { onMessage, onError, enabled = true }: UseSSEOptions) {
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled) return

    function connect() {
      const es = new EventSource(url)
      esRef.current = es

      es.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as SSEEvent
          onMessage(data)
        } catch {
          // ignore malformed frames
        }
      }

      es.onerror = (err) => {
        onError?.(err)
        es.close()
        // Reconnect after 5 s
        setTimeout(connect, 5_000)
      }
    }

    connect()
    return () => esRef.current?.close()
  }, [url, enabled]) // eslint-disable-line react-hooks/exhaustive-deps
}
