"use client"

import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { useToast } from "@/hooks/use-toast"

export function ClientWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      console.log("[v0] WebSocket disabled in Vercel production environment")
      return
    }

    const initializeSocket = () => {
      const socketUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"

      console.log("[v0] Initializing WebSocket connection to:", socketUrl)

      socketRef.current = io(socketUrl, {
        transports: ["polling", "websocket"],
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
        upgrade: true,
        rememberUpgrade: false,
      })

      const socket = socketRef.current

      socket.on("connect", () => {
        console.log("[v0] Client WebSocket connected:", socket.id)
        socket.emit("join-client")
      })

      socket.on("disconnect", (reason) => {
        console.log("[v0] Client WebSocket disconnected:", reason)
        if (reason === "io server disconnect" || reason === "transport close") {
          toast({
            title: "Conexión perdida",
            description: "Intentando reconectar...",
            variant: "default",
          })
        }
      })

      socket.on("new-product", (productData) => {
        console.log("[v0] New product received:", productData)
        window.dispatchEvent(new CustomEvent("productCreated", { detail: productData }))

        toast({
          title: "Nuevo producto disponible",
          description: `${productData.name} ha sido agregado al catálogo`,
          variant: "default",
        })
      })

      socket.on("product-updated", (productData) => {
        console.log("[v0] Product updated:", productData)
        window.dispatchEvent(new CustomEvent("productUpdated", { detail: productData }))
      })

      socket.on("product-deleted", ({ productId }) => {
        console.log("[v0] Product deleted:", productId)
        window.dispatchEvent(new CustomEvent("productDeleted", { detail: { productId } }))
      })

      socket.on("stock-updated", ({ productId, newStock }) => {
        console.log("[v0] Stock updated:", { productId, newStock })
        window.dispatchEvent(
          new CustomEvent("stockUpdated", {
            detail: { productId, newStock },
          }),
        )
      })

      socket.on("inventory-changed", (inventoryData) => {
        console.log("[v0] Inventory changed:", inventoryData)
        window.dispatchEvent(new CustomEvent("inventoryChanged", { detail: inventoryData }))
      })

      socket.on("order-confirmed", (orderData) => {
        console.log("[v0] Order confirmed:", orderData)
        toast({
          title: "Pedido confirmado",
          description: `Tu pedido #${orderData.id} ha sido confirmado`,
          variant: "default",
        })
      })

      socket.on("connect_error", (error) => {
        console.error("[v0] WebSocket connection error:", error)
        if (process.env.NODE_ENV === "development") {
          if (error.message.includes("timeout")) {
            console.log("[v0] Connection timeout, will retry with polling")
          }
        }
      })

      socket.on("error", (error) => {
        console.error("[v0] WebSocket error:", error)
      })

      socket.on("reconnect", (attemptNumber) => {
        console.log("[v0] WebSocket reconnected after", attemptNumber, "attempts")
      })

      socket.on("reconnect_error", (error) => {
        console.log("[v0] WebSocket reconnection failed:", error.message)
      })
    }

    let retryCount = 0
    const maxRetries = process.env.NODE_ENV === "development" ? 3 : 1

    const connectWithRetry = () => {
      try {
        initializeSocket()
      } catch (error) {
        console.error("[v0] Socket initialization failed:", error)
        if (retryCount < maxRetries) {
          retryCount++
          console.log(`[v0] Retrying connection (${retryCount}/${maxRetries})`)
          setTimeout(connectWithRetry, 2000 * retryCount)
        }
      }
    }

    connectWithRetry()

    return () => {
      if (socketRef.current) {
        console.log("[v0] Cleaning up client WebSocket connection")
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [toast])

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && socketRef.current?.disconnected) {
        console.log("[v0] Page became visible, reconnecting WebSocket")
        socketRef.current.connect()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return null
}
