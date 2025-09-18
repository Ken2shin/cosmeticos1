"use client"

import { useSSE } from "@/hooks/use-sse"
import { useEffect } from "react"

export function AdminSSE() {
  const { isConnected, lastMessage } = useSSE("/api/events")

  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage

      switch (type) {
        case "connected":
          console.log("[SSE Admin] Connected to server")
          break
        case "new-order":
          console.log("[SSE Admin] New order received:", data)
          // Show notification or update order list
          window.dispatchEvent(new CustomEvent("admin-new-order", { detail: data }))
          break
        case "inventory-changed":
          console.log("[SSE Admin] Inventory changed:", data)
          window.dispatchEvent(new CustomEvent("admin-inventory-changed", { detail: data }))
          break
        case "product-updated":
          console.log("[SSE Admin] Product updated:", data)
          window.dispatchEvent(new CustomEvent("admin-product-updated", { detail: data }))
          break
        case "heartbeat":
          // Keep connection alive
          break
        default:
          console.log("[SSE Admin] Unknown message type:", type, data)
      }
    }
  }, [lastMessage])

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`px-3 py-2 rounded-lg shadow-lg ${
          isConnected
            ? "bg-green-100 text-green-800 border border-green-200"
            : "bg-red-100 text-red-800 border border-red-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm font-medium">{isConnected ? "Sistema conectado" : "Sistema desconectado"}</span>
        </div>
      </div>
    </div>
  )
}
