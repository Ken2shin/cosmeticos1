import type { NextRequest } from "next/server"
import { addSSEConnection, removeSSEConnection } from "@/lib/sse-notifications"

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the global connections set
      addSSEConnection(controller)

      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: "connected", message: "SSE connection established" })}\n\n`
      controller.enqueue(encoder.encode(data))

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({ type: "heartbeat", timestamp: Date.now() })}\n\n`
          controller.enqueue(encoder.encode(heartbeatData))
        } catch (error) {
          clearInterval(heartbeat)
          removeSSEConnection(controller)
          controller.close()
        }
      }, 30000) // Every 30 seconds

      // Clean up on close
      const cleanup = () => {
        clearInterval(heartbeat)
        removeSSEConnection(controller)
        controller.close()
      }

      request.signal.addEventListener("abort", cleanup)

      // Store cleanup function for later use
      ;(controller as any)._cleanup = cleanup
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
    },
  })
}

export async function POST() {
  return new Response("Method not allowed for SSE endpoint", { status: 405 })
}

export async function PUT() {
  return new Response("Method not allowed for SSE endpoint", { status: 405 })
}

export async function DELETE() {
  return new Response("Method not allowed for SSE endpoint", { status: 405 })
}
