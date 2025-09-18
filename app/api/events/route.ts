import type { NextRequest } from "next/server"
import { addSSEConnection, removeSSEConnection } from "@/lib/sse-notifications"

export async function GET(request: NextRequest) {
  try {
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        try {
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
              console.error("[SSE] Heartbeat error:", error)
              clearInterval(heartbeat)
              removeSSEConnection(controller)
              try {
                controller.close()
              } catch (closeError) {
                console.error("[SSE] Error closing controller:", closeError)
              }
            }
          }, 30000) // Every 30 seconds

          // Clean up on close
          const cleanup = () => {
            clearInterval(heartbeat)
            removeSSEConnection(controller)
            try {
              controller.close()
            } catch (error) {
              console.error("[SSE] Cleanup error:", error)
            }
          }

          // Handle client disconnect
          request.signal.addEventListener("abort", cleanup)

          // Store cleanup function for later use
          ;(controller as any)._cleanup = cleanup
        } catch (error) {
          console.error("[SSE] Error in stream start:", error)
          removeSSEConnection(controller)
          controller.error(error)
        }
      },
      cancel() {
        console.log("[SSE] Stream cancelled by client")
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("[SSE] Route error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
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
