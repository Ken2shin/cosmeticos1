"use client"

import { useSSE } from "@/hooks/use-sse"
import { useEffect } from "react"

export function ClientSSE() {
  const { isConnected, lastMessage } = useSSE("/api/events")

  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage

      switch (type) {
        case "connected":
          console.log("[SSE Client] Connected to server")
          break
        case "new-product":
          console.log("[SSE Client] New product:", data)
          // Trigger product list refresh
          window.dispatchEvent(new CustomEvent("product-added", { detail: data }))
          break
        case "product-updated":
          console.log("[SSE Client] Product updated:", data)
          window.dispatchEvent(new CustomEvent("product-updated", { detail: data }))
          break
        case "product-deleted":
          console.log("[SSE Client] Product deleted:", data)
          window.dispatchEvent(new CustomEvent("product-deleted", { detail: data }))
          break
        case "stock-updated":
          console.log("[SSE Client] Stock updated:", data)
          window.dispatchEvent(new CustomEvent("stock-updated", { detail: data }))
          break
        case "inventory-changed":
          console.log("[SSE Client] Inventory changed:", data)
          window.dispatchEvent(new CustomEvent("inventory-changed", { detail: data }))
          break
        case "new-order":
          console.log("[SSE Client] New order:", data)
          window.dispatchEvent(new CustomEvent("order-added", { detail: data }))
          break
        case "order-confirmed":
          console.log("[SSE Client] Order confirmed:", data)
          window.dispatchEvent(new CustomEvent("order-confirmed", { detail: data }))
          break
        case "heartbeat":
          // Keep connection alive
          break
        default:
          console.log("[SSE Client] Unknown message type:", type, data)
      }
    }
  }, [lastMessage])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`px-2 py-1 rounded text-xs ${isConnected ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
        {isConnected ? "Conectado" : "Desconectado"}
      </div>
    </div>
  )
}
