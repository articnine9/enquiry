import { auth } from '@/lib/auth/auth'
import { NextResponse } from 'next/server'

// Server-Sent Events endpoint — one persistent connection per logged-in user.
// Sends a heartbeat every 30 s to keep proxies from closing the connection.
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const encoder = new TextEncoder()
  let heartbeatTimer: ReturnType<typeof setInterval>

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      // Initial connection acknowledgement
      send('connected', { userId: session.user.id, ts: new Date().toISOString() })

      // Heartbeat to prevent idle disconnection
      heartbeatTimer = setInterval(() => {
        send('heartbeat', { ts: new Date().toISOString() })
      }, 30_000)
    },
    cancel() {
      clearInterval(heartbeatTimer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering
    },
  })
}
